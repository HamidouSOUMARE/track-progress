import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le service worker vit dans public/ et n'est pas compilé avec l'app. On charge
 * donc le fichier réel dans une portée simulée : tester une copie de sa logique
 * laisserait les deux diverger sans prévenir.
 */
const SOURCE = readFileSync("public/sw.js", "utf8");
const ORIGIN = "https://track-progress.test";

function absolute(key: string | { url: string }): string {
  return new URL(typeof key === "string" ? key : key.url, ORIGIN).href;
}

function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();

  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);

    return {
      addAll: async (urls: string[]) => {
        for (const url of urls) {
          store.set(absolute(url), new Response("coquille"));
        }
      },
      put: async (request: { url: string }, response: Response) => {
        store.set(absolute(request), response);
      },
    };
  };

  return {
    stores,
    api: {
      open,
      match: async (key: string | { url: string }) => {
        for (const store of stores.values()) {
          const hit = store.get(absolute(key));
          if (hit) {
            return hit;
          }
        }
        return undefined;
      },
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
    },
  };
}

interface Handlers {
  install?: (event: { waitUntil: (task: Promise<unknown>) => void }) => void;
  activate?: (event: { waitUntil: (task: Promise<unknown>) => void }) => void;
  fetch?: (event: { request: unknown; respondWith: (task: Promise<Response>) => void }) => void;
}

function load(fetchImpl: typeof fetch) {
  const handlers: Handlers = {};
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  const caches = fakeCaches();

  const self = {
    addEventListener: (type: keyof Handlers, handler: never) => {
      handlers[type] = handler;
    },
    skipWaiting,
    clients: { claim },
    location: { origin: ORIGIN },
  };

  new Function("self", "caches", "fetch", SOURCE)(self, caches.api, fetchImpl);

  return { handlers, skipWaiting, claim, caches };
}

function request(url: string, options: { method?: string; mode?: string } = {}) {
  return { url, method: options.method ?? "GET", mode: options.mode ?? "no-cors" };
}

async function run(
  handler: ((event: { waitUntil: (task: Promise<unknown>) => void }) => void) | undefined,
) {
  const tasks: Promise<unknown>[] = [];
  handler?.({ waitUntil: (task) => tasks.push(task) });
  await Promise.all(tasks);
}

async function respond(handlers: Handlers, target: ReturnType<typeof request>) {
  let responded: Promise<Response> | null = null;
  handlers.fetch?.({ request: target, respondWith: (task) => (responded = task) });

  return responded as Promise<Response> | null;
}

let online: ReturnType<typeof vi.fn>;

beforeEach(() => {
  online = vi.fn(async () => new Response("depuis le réseau"));
});

describe("installation", () => {
  it("met la coquille en cache et prend la main aussitôt", async () => {
    const { handlers, skipWaiting, caches } = load(online as never);

    await run(handlers.install);

    const cached = await caches.api.match("/");
    expect(await cached?.text()).toBe("coquille");
    expect(skipWaiting).toHaveBeenCalled();
  });
});

describe("activation", () => {
  it("supprime les caches des versions précédentes", async () => {
    const { handlers, claim, caches } = load(online as never);
    await caches.api.open("track-progress-v0");
    await caches.api.open("track-progress-v1");

    await run(handlers.activate);

    expect(await caches.api.keys()).toEqual(["track-progress-v1"]);
    expect(claim).toHaveBeenCalled();
  });
});

describe("navigation", () => {
  it("sert la version du réseau et la garde de côté", async () => {
    const { handlers, caches } = load(online as never);

    const response = await respond(handlers, request(`${ORIGIN}/`, { mode: "navigate" }));

    expect(await response?.text()).toBe("depuis le réseau");
    expect(online).toHaveBeenCalled();
    expect(await (await caches.api.match("/"))?.text()).toBe("depuis le réseau");
  });

  it("bascule sur le cache quand le réseau manque", async () => {
    const offline = vi.fn(async () => {
      throw new Error("hors ligne");
    });
    const { handlers } = load(offline as never);
    await run(handlers.install).catch(() => undefined);

    const response = await respond(handlers, request(`${ORIGIN}/`, { mode: "navigate" }));

    expect(await response?.text()).toBe("coquille");
  });

  it("retombe sur l'accueil pour une page jamais visitée", async () => {
    const offline = vi.fn(async () => {
      throw new Error("hors ligne");
    });
    const { handlers, caches } = load(offline as never);
    const cache = await caches.api.open("track-progress-v1");
    await cache.addAll(["/"]);

    const response = await respond(handlers, request(`${ORIGIN}/inconnu`, { mode: "navigate" }));

    expect(await response?.text()).toBe("coquille");
  });
});

describe("fichiers statiques", () => {
  it("ne redemande pas au réseau ce qu'il a déjà", async () => {
    const { handlers } = load(online as never);
    const asset = request(`${ORIGIN}/_next/static/chunks/abc123.js`);

    await respond(handlers, asset);
    await respond(handlers, asset);

    expect(online).toHaveBeenCalledTimes(1);
  });
});

describe("requêtes laissées de côté", () => {
  it("ne touche pas aux autres domaines", async () => {
    const { handlers } = load(online as never);

    expect(await respond(handlers, request("https://autre.test/script.js"))).toBeNull();
  });

  it("ne touche pas aux requêtes qui modifient l'état", async () => {
    const { handlers } = load(online as never);

    expect(await respond(handlers, request(`${ORIGIN}/`, { method: "POST" }))).toBeNull();
  });
});
