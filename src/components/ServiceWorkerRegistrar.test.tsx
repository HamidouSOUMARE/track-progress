import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

function stubServiceWorker(register: () => Promise<unknown>, controller: object | null = null) {
  const container = Object.assign(new EventTarget(), { register, controller });
  Object.defineProperty(navigator, "serviceWorker", {
    value: container,
    configurable: true,
  });
  return container;
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

  it("propose de recharger quand une nouvelle version prend la main", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const container = stubServiceWorker(vi.fn(async () => ({})), {});
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });

    try {
      render(<ServiceWorkerRegistrar />);
      act(() => {
        container.dispatchEvent(new Event("controllerchange"));
      });

      fireEvent.click(await screen.findByRole("button", { name: /recharger/i }));
      expect(reload).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("se tait lors de la toute première installation", () => {
    vi.stubEnv("NODE_ENV", "production");
    const container = stubServiceWorker(vi.fn(async () => ({})));

    render(<ServiceWorkerRegistrar />);
    act(() => {
      container.dispatchEvent(new Event("controllerchange"));
    });

    expect(screen.queryByRole("button", { name: /recharger/i })).toBeNull();
  });

  it("cherche une mise à jour au retour au premier plan", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const update = vi.fn(async () => undefined);
    stubServiceWorker(vi.fn(async () => ({ update })));

    render(<ServiceWorkerRegistrar />);
    // L'enregistrement se résout avant que la page ne revienne au premier plan.
    await act(async () => {});
    document.dispatchEvent(new Event("visibilitychange"));

    expect(update).toHaveBeenCalled();
  });
});
