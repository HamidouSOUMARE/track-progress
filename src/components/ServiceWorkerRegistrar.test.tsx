import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

function stubServiceWorker(register: () => Promise<unknown>) {
  Object.defineProperty(navigator, "serviceWorker", {
    value: { register },
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.unstubAllEnvs();
});

describe("ServiceWorkerRegistrar", () => {
  it("enregistre le service worker en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const register = vi.fn(async () => ({}));
    stubServiceWorker(register);

    render(<ServiceWorkerRegistrar />);

    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js"));
  });

  it("reste à l'écart en développement", () => {
    vi.stubEnv("NODE_ENV", "development");
    const register = vi.fn(async () => ({}));
    stubServiceWorker(register);

    render(<ServiceWorkerRegistrar />);

    expect(register).not.toHaveBeenCalled();
  });

  it("ne plante pas sur un navigateur sans service worker", () => {
    vi.stubEnv("NODE_ENV", "production");
    Reflect.deleteProperty(navigator, "serviceWorker");

    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
  });

  it("laisse l'app fonctionner si l'enregistrement échoue", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const register = vi.fn(async () => {
      throw new Error("refusé");
    });
    stubServiceWorker(register);

    render(<ServiceWorkerRegistrar />);

    await waitFor(() => expect(register).toHaveBeenCalled());
  });
});
