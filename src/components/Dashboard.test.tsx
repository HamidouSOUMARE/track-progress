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
    fireEvent.click(within(updateDialog).getByRole("button", { name: /^\+2,5 kg$/ }));
    fireEvent.click(within(updateDialog).getByRole("button", { name: /enregistrer la performance/i }));

    expect(useTrackerStore.getState().trackings.squat?.entries).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toMatch(/record personnel/i);
  });
});
