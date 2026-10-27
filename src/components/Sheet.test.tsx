import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";

/**
 * jsdom n'émet pas popstate comme un navigateur. On imite Chrome : le retour
 * est résolu à l'appel, et l'événement arrive un peu plus tard, quand une
 * autre feuille a déjà eu le temps de s'ouvrir.
 */
function emulateBrowserBack() {
  vi.spyOn(window.history, "back").mockImplementation(() => {
    window.setTimeout(() => {
      window.history.replaceState(null, "");
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    }, 5);
  });
}

function Handover() {
  const [current, setCurrent] = useState<"a" | "b" | null>("a");

  return (
    <>
      <Sheet open={current === "a"} title="Première" onClose={() => setCurrent(null)}>
        <button type="button" onClick={() => setCurrent("b")}>
          Passer à la suivante
        </button>
      </Sheet>
      <Sheet open={current === "b"} title="Suivante" onClose={() => setCurrent(null)}>
        <p>Contenu</p>
      </Sheet>
    </>
  );
}

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Sheet", () => {
  it("reste ouverte quand elle prend le relais d'une feuille qui se ferme", async () => {
    emulateBrowserBack();
    render(<Handover />);

    fireEvent.click(screen.getByRole("button", { name: /passer à la suivante/i }));
    await wait(50);

    expect(screen.queryByRole("dialog", { name: "Suivante" })).not.toBeNull();
    // Son entrée d'historique est rétablie : le geste retour la refermera.
    expect(window.history.state).toMatchObject({ sheet: expect.any(Number) });
  });

  it("se referme au geste retour qui suit le relais", async () => {
    emulateBrowserBack();
    render(<Handover />);

    fireEvent.click(screen.getByRole("button", { name: /passer à la suivante/i }));
    await wait(150);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    await wait(600);

    expect(screen.queryByRole("dialog", { name: "Suivante" })).toBeNull();
  });
});
