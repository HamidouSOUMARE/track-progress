import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { useTrackerStore } from "@/store/tracker-store";

beforeEach(() => {
  localStorage.clear();
  useTrackerStore.setState({ exercises: buildDefaultExercises(), trackings: {} });
});

afterEach(cleanup);

function openExercise(name: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(name, "i") }));
  return screen.getByRole("dialog", { name });
}

describe("parcours de suivi", () => {
  it("enregistre une référence puis célèbre la progression", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    fireEvent.change(within(dialog).getByLabelText(/charge en kg/i), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /définir ma référence/i }));

    expect(useTrackerStore.getState().trackings.squat?.reference).toBe(100);

    const updateDialog = openExercise("Squat");
    const field = within(updateDialog).getByLabelText(/charge en kg/i);

    // Le zéro de départ ne doit pas rester collé devant la saisie.
    fireEvent.change(field, { target: { value: "0105" } });
    expect((field as HTMLInputElement).value).toBe("105");

    fireEvent.click(within(updateDialog).getByRole("button", { name: /^\+2,5 kg$/ }));
    fireEvent.click(within(updateDialog).getByRole("button", { name: /enregistrer la performance/i }));

    expect(useTrackerStore.getState().trackings.squat?.entries).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toMatch(/record personnel/i);
  });

  it("lit une mensuration à la baisse comme une progression", () => {
    render(<Dashboard />);

    const dialog = openExercise("Tour de taille");
    fireEvent.change(within(dialog).getByLabelText(/mesure en cm/i), { target: { value: "85" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /définir ma mesure de départ/i }));

    const updateDialog = openExercise("Tour de taille");
    fireEvent.change(within(updateDialog).getByLabelText(/mesure en cm/i), {
      target: { value: "83" },
    });
    fireEvent.click(within(updateDialog).getByRole("button", { name: /enregistrer la mesure/i }));

    const tracking = useTrackerStore.getState().trackings["tour-de-taille"];
    expect(tracking?.entries[0]?.value).toBe(83);
    expect(screen.getByRole("status").textContent).toMatch(/meilleur|plus bas|record/i);
  });
});
