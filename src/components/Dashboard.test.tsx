import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { WEEKDAYS, emptyWeek, todayStamp, todayWeekday } from "@/data/weekdays";
import { useTrackerStore } from "@/store/tracker-store";

beforeEach(() => {
  localStorage.clear();
  useTrackerStore.setState({
    exercises: buildDefaultExercises(),
    trackings: {},
    programs: [],
    activeProgramId: null,
    lastDeletion: null,
  });
});

afterEach(cleanup);

function openExercise(name: string) {
  // Les cartes vivent dans l'onglet bibliothèque ; la séance s'affiche par défaut.
  fireEvent.click(screen.getByRole("tab", { name: /tous les suivis/i }));
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

  it("laisse choisir entre fusionner et remplacer avant d'importer", async () => {
    const { container } = render(<Dashboard />);
    const initialCount = useTrackerStore.getState().exercises.length;

    const backup = JSON.stringify({
      version: 2,
      exercises: [
        {
          id: "squat",
          name: "Squat",
          group: "jambes",
          unit: "kg",
          kind: "charge",
          goal: "up",
          custom: false,
        },
      ],
      trackings: {},
    });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File([backup], "sauvegarde.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input!);

    const dialog = await screen.findByRole("dialog", { name: /importer une sauvegarde/i });

    // La sauvegarde ne contient qu'un suivi : le mode remplacer annonce la casse.
    expect(within(dialog).getByRole("radio", { name: /remplacer/i }).closest("label")?.textContent)
      .toMatch(new RegExp(`${initialCount - 1} suivis`));

    fireEvent.click(within(dialog).getByRole("radio", { name: /fusionner/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^importer$/i }));

    expect(useTrackerStore.getState().exercises).toHaveLength(initialCount);
  });

  it("remplace intégralement quand on choisit de restaurer", async () => {
    const { container } = render(<Dashboard />);

    const backup = JSON.stringify({
      version: 2,
      exercises: [
        {
          id: "squat",
          name: "Squat",
          group: "jambes",
          unit: "kg",
          kind: "charge",
          goal: "up",
          custom: false,
        },
      ],
      trackings: {},
    });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File([backup], "sauvegarde.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input!);

    const dialog = await screen.findByRole("dialog", { name: /importer une sauvegarde/i });
    fireEvent.click(within(dialog).getByRole("radio", { name: /remplacer/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^importer$/i }));

    expect(useTrackerStore.getState().exercises).toHaveLength(1);
  });

  it("permet d'annuler la suppression d'une performance", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    fireEvent.change(within(dialog).getByLabelText(/charge en kg/i), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /définir ma référence/i }));

    const update = openExercise("Squat");
    fireEvent.change(within(update).getByLabelText(/charge en kg/i), { target: { value: "105" } });
    fireEvent.click(within(update).getByRole("button", { name: /enregistrer la performance/i }));

    const history = openExercise("Squat");
    fireEvent.click(within(history).getByRole("button", { name: /supprimer la performance/i }));
    expect(useTrackerStore.getState().trackings.squat?.entries).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /^annuler$/i }));

    expect(useTrackerStore.getState().trackings.squat?.entries).toHaveLength(1);
  });

  it("enregistre une note de réglage sur l'exercice", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    fireEvent.change(within(dialog).getByLabelText(/notes/i), {
      target: { value: "Barre cran 7, pieds écartés" },
    });

    const squat = useTrackerStore.getState().exercises.find((item) => item.id === "squat");
    expect(squat?.note).toBe("Barre cran 7, pieds écartés");
  });

  it("garde le focus dans le champ de notes pendant la saisie", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    const field = within(dialog).getByLabelText(/notes/i);
    field.focus();

    // Chaque lettre écrit dans le store : la feuille ne doit pas reprendre le focus.
    fireEvent.change(field, { target: { value: "S" } });
    fireEvent.change(field, { target: { value: "Si" } });

    expect(document.activeElement).toBe(field);
  });

  it("crée un programme, y place un exercice et l'affiche dans la séance", () => {
    render(<Dashboard />);

    // Vue Séance par défaut : aucun programme, donc l'appel à en créer un.
    fireEvent.click(screen.getByRole("button", { name: /créer un programme/i }));

    const programs = screen.getByRole("dialog", { name: /mes programmes/i });
    fireEvent.change(within(programs).getByLabelText(/nom du nouveau programme/i), {
      target: { value: "Push Pull Legs" },
    });
    fireEvent.click(within(programs).getByRole("button", { name: /^créer$/i }));
    fireEvent.click(within(programs).getByRole("button", { name: /fermer|^×$/i }));

    expect(useTrackerStore.getState().programs[0]?.name).toBe("Push Pull Legs");

    // Le jour du jour est sélectionné : on lui ajoute un exercice.
    fireEvent.click(screen.getByRole("button", { name: /ajouter des exercices/i }));
    const picker = screen.getByRole("dialog", { name: /ajouter des exercices/i });
    fireEvent.click(within(picker).getByRole("button", { name: /^squat$/i }));
    fireEvent.click(within(picker).getByRole("button", { name: /terminer/i }));

    const today = todayWeekday();
    expect(useTrackerStore.getState().programs[0]?.days[today]).toEqual(["squat"]);
    expect(screen.getByRole("button", { name: /^squat — aucune référence$/i })).toBeDefined();
  });

  it("masque un suivi sans perdre son historique", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    fireEvent.change(within(dialog).getByLabelText(/charge en kg/i), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /définir ma référence/i }));

    const sheet = openExercise("Squat");
    fireEvent.click(within(sheet).getByRole("button", { name: /^masquer$/i }));

    const squat = useTrackerStore.getState().exercises.find((item) => item.id === "squat");
    expect(squat?.archived).toBe(true);
    expect(useTrackerStore.getState().trackings.squat?.reference).toBe(100);

    // La carte disparaît de la bibliothèque mais reste réaffichable.
    expect(screen.queryByRole("button", { name: /^squat —/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /masqués/i }));
    fireEvent.click(screen.getByRole("button", { name: /réafficher/i }));

    expect(
      useTrackerStore.getState().exercises.find((item) => item.id === "squat")?.archived,
    ).toBe(false);
  });

  it("retrouve le jour consulté après un rechargement", () => {
    useTrackerStore.getState().createProgram("PPL");
    const other = WEEKDAYS.find((day) => day.id !== todayWeekday())!;

    const first = render(<Dashboard />);
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(other.label, "i") }));
    expect(useTrackerStore.getState().selectedDay?.day).toBe(other.id);
    first.unmount();

    render(<Dashboard />);

    expect(
      screen.getByRole("tab", { name: new RegExp(other.label, "i") }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("montre le format attendu quand le fichier est refusé", async () => {
    const { container } = render(<Dashboard />);

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(["ceci n'est pas du json"], "notes.txt", {
      type: "application/json",
    });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input!);

    const help = await screen.findByRole("dialog", { name: /format d'import/i });

    expect(within(help).getByRole("alert").textContent).toMatch(/illisible/i);
    expect(within(help).getByRole("button", { name: /télécharger l'exemple/i })).toBeDefined();
  });

  it("donne accès au fichier d'exemple avant tout import", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /format d'import/i }));

    const help = screen.getByRole("dialog", { name: /format d'import/i });
    expect(within(help).queryByRole("alert")).toBeNull();
    expect(within(help).getByText(/exemple-developpe-couche/)).toBeDefined();
  });

  it("affiche une séance dont les exercices viennent d'un fichier importé", () => {
    // Groupes plus fins que ceux de l'app : le rendu ne doit pas tomber.
    const days = emptyWeek();
    days[todayWeekday()] = ["curl-incline", "squat-importe"];

    useTrackerStore.setState({
      exercises: [
        {
          id: "curl-incline",
          name: "Curl incliné",
          group: "bras",
          unit: "kg",
          kind: "charge",
          goal: "up",
          custom: true,
        },
        {
          id: "squat-importe",
          name: "Hack squat",
          group: "autres",
          unit: "kg",
          kind: "charge",
          goal: "up",
          custom: true,
        },
      ],
      trackings: {},
      programs: [{ id: "p", name: "Recomposition", days }],
      activeProgramId: "p",
      selectedDay: { day: todayWeekday(), date: todayStamp() },
      lastDeletion: null,
    });

    render(<Dashboard />);

    expect(screen.getByRole("button", { name: /curl incliné/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /hack squat/i })).toBeDefined();
  });

  it("annonce les groupes rattachés avant de valider l'import", async () => {
    const { container } = render(<Dashboard />);

    const backup = JSON.stringify({
      version: 3,
      exercises: [
        {
          id: "curl-incline",
          name: "Curl incliné",
          group: "biceps",
          unit: "kg",
          kind: "charge",
          goal: "up",
          custom: true,
        },
      ],
      trackings: {},
      programs: [],
      activeProgramId: null,
    });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File([backup], "programme.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input!);

    const dialog = await screen.findByRole("dialog", { name: /importer une sauvegarde/i });
    expect(dialog.textContent).toMatch(/biceps/);

    fireEvent.click(within(dialog).getByRole("radio", { name: /fusionner/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^importer$/i }));

    const imported = useTrackerStore
      .getState()
      .exercises.find((item) => item.id === "curl-incline");
    expect(imported?.group).toBe("bras");
  });

  it("change l'unité d'un exercice depuis sa fiche", () => {
    render(<Dashboard />);

    const sheet = openExercise("Tractions");
    fireEvent.click(within(sheet).getByRole("button", { name: /^modifier$/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /charge \(kg\)/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^enregistrer$/i }));

    expect(useTrackerStore.getState().exercises.find((i) => i.id === "tractions")?.unit).toBe("kg");
    expect(within(sheet).getByLabelText(/charge en kg/i)).toBeDefined();
  });

  it("avertit que les valeurs enregistrées gardent leur nombre", () => {
    useTrackerStore.getState().startTracking("tractions", 8);
    useTrackerStore.getState().logValue("tractions", { value: 12, reps: null, sets: null });

    render(<Dashboard />);

    const sheet = openExercise("Tractions");
    fireEvent.click(within(sheet).getByRole("button", { name: /^modifier$/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /charge \(kg\)/i }));

    expect(sheet.textContent).toMatch(/gardent leur nombre/i);
  });

  it("permet d'inverser le sens du progrès d'une charge", () => {
    render(<Dashboard />);

    const sheet = openExercise("Tractions");
    fireEvent.click(within(sheet).getByRole("button", { name: /^modifier$/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /réduire/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^enregistrer$/i }));

    expect(useTrackerStore.getState().exercises.find((i) => i.id === "tractions")?.goal).toBe(
      "down",
    );
  });

  it("met à jour la valeur affichée quand on change la référence", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    fireEvent.change(within(dialog).getByLabelText(/charge en kg/i), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /définir ma référence/i }));

    const sheet = openExercise("Squat");
    fireEvent.click(within(sheet).getByRole("button", { name: /modifier la référence/i }));
    const field = within(sheet).getByLabelText(/nouvelle référence/i);
    fireEvent.change(field, { target: { value: "120" } });
    fireEvent.click(within(sheet).getByRole("button", { name: /valider/i }));

    // Sans performance enregistrée, la valeur actuelle suit la référence.
    expect((within(sheet).getByLabelText(/charge en kg/i) as HTMLInputElement).value).toBe("120");
    expect(useTrackerStore.getState().trackings.squat?.reference).toBe(120);
  });

  it("revient à la dernière performance quand on en supprime une", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    fireEvent.change(within(dialog).getByLabelText(/charge en kg/i), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /définir ma référence/i }));

    const update = openExercise("Squat");
    fireEvent.change(within(update).getByLabelText(/charge en kg/i), { target: { value: "110" } });
    fireEvent.click(within(update).getByRole("button", { name: /enregistrer la performance/i }));

    const sheet = openExercise("Squat");
    expect((within(sheet).getByLabelText(/charge en kg/i) as HTMLInputElement).value).toBe("110");

    fireEvent.click(within(sheet).getByRole("button", { name: /supprimer la performance/i }));

    expect((within(sheet).getByLabelText(/charge en kg/i) as HTMLInputElement).value).toBe("100");
  });

  it("referme la feuille au retour du téléphone plutôt que de quitter l'app", async () => {
    render(<Dashboard />);

    openExercise("Squat");
    expect(screen.queryByRole("dialog", { name: "Squat" })).not.toBeNull();

    // Geste « retour » d'Android : le navigateur dépile puis émet popstate.
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitForElementToBeRemoved(() => screen.queryByRole("dialog", { name: "Squat" }));
  });

  it("empile une entrée d'historique par feuille ouverte", () => {
    const before = window.history.length;
    render(<Dashboard />);

    openExercise("Squat");

    expect(window.history.length).toBeGreaterThan(before);
  });

  it("laisse ouverte la fiche du suivi qu'on vient de créer", async () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /\+ suivi/i }));
    const add = screen.getByRole("dialog", { name: /ajouter un suivi/i });
    fireEvent.change(within(add).getByLabelText(/^nom$/i), { target: { value: "Rowing T-bar" } });
    fireEvent.click(within(add).getByRole("button", { name: /créer l'exercice/i }));

    // La feuille de création se referme, celle du nouveau suivi doit rester.
    const sheet = await screen.findByRole("dialog", { name: "Rowing T-bar" });
    expect(sheet).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByRole("dialog", { name: "Rowing T-bar" })).not.toBeNull();
  });

  it("valide la saisie à la touche Entrée", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    const field = within(dialog).getByLabelText(/charge en kg/i);
    fireEvent.change(field, { target: { value: "90" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(useTrackerStore.getState().trackings.squat?.reference).toBe(90);
  });
});
