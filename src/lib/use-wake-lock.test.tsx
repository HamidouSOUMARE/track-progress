import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWakeLock } from "@/lib/use-wake-lock";

type Listener = () => void;

function stubWakeLock(behaviour: "grant" | "refuse" = "grant") {
  let onRelease: Listener | null = null;

  const release = vi.fn(async () => {
    onRelease?.();
  });

  const sentinel = {
    release,
    addEventListener: (_type: string, listener: Listener) => {
      onRelease = listener;
    },
  };

  const request = vi.fn(async () => {
    if (behaviour === "refuse") {
      throw new Error("refusé");
    }
    return sentinel as unknown as WakeLockSentinel;
  });

  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });

  return { request, release, systemRelease: () => onRelease?.() };
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "wakeLock");
  setVisibility("visible");
  vi.restoreAllMocks();
});

describe("useWakeLock", () => {
  it("garde l'écran allumé pendant le repos", async () => {
    const { request } = stubWakeLock();

    renderHook(() => useWakeLock(true));

    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
  });

  it("ne demande rien tant que le repos n'a pas commencé", () => {
    const { request } = stubWakeLock();

    renderHook(() => useWakeLock(false));

    expect(request).not.toHaveBeenCalled();
  });

  it("relâche l'écran à la fin du repos", async () => {
    const { request, release } = stubWakeLock();
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    });

    await waitFor(() => expect(request).toHaveBeenCalled());
    rerender({ active: false });

    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it("relâche l'écran quand le chrono disparaît", async () => {
    const { request, release } = stubWakeLock();
    const { unmount } = renderHook(() => useWakeLock(true));

    await waitFor(() => expect(request).toHaveBeenCalled());
    unmount();

    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it("reprend le verrou au retour sur l'app", async () => {
    // Le système le relâche dès que la page passe en arrière-plan.
    const { request, systemRelease } = stubWakeLock();
    renderHook(() => useWakeLock(true));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    systemRelease();
    setVisibility("hidden");
    setVisibility("visible");

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it("laisse le repos fonctionner si la demande est refusée", async () => {
    const { request } = stubWakeLock("refuse");

    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();

    await waitFor(() => expect(request).toHaveBeenCalled());
  });

  it("ne fait rien sur un navigateur sans cette API", () => {
    Reflect.deleteProperty(navigator, "wakeLock");

    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});
