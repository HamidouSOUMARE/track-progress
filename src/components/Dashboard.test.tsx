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

/** Valide les séries d'un exercice jusqu'à atteindre l'objectif. */
function completeSets(sheet: HTMLElement, reps: number, count = 3, from = 0) {
  for (let index = from; index < from + count; index += 1) {
    const field = within(sheet).getByLabelText(
      new RegExp(`répétitions de la série ${index + 1}`, "i"),
    );
    fireEvent.change(field, { target: { value: String(reps) } });
    fireEvent.click(within(sheet).getByRole("button", { name: /^valider$/i }));
  }
}

/** Les sections secondaires sont repliées : on les ouvre avant de les lire. */
function expandPanel(sheet: HTMLElement, name: RegExp) {
  fireEvent.click(within(sheet).getByRole("button", { name }));
}

/** Masquer et Supprimer vivent désormais dans le panneau de modification. */
function openEditPanel(sheet: HTMLElement) {
  fireEvent.click(within(sheet).getByRole("button", { name: /^modifier$/i }));
}

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
    completeSets(updateDialog, 8);

    const entries = useTrackerStore.getState().trackings.squat?.entries ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.series).toHaveLength(3);
    expect(entries[0]?.done).toBe(true);
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
    completeSets(update, 8);

    const history = openExercise("Squat");
    expandPanel(history, /^historique/i);
    fireEvent.click(within(history).getByRole("button", { name: /supprimer la performance/i }));
    expect(useTrackerStore.getState().trackings.squat?.entries).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /^annuler$/i }));

    expect(useTrackerStore.getState().trackings.squat?.entries).toHaveLength(1);
  });

  it("enregistre une note de réglage sur l'exercice", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    expandPanel(dialog, /^notes/i);
    fireEvent.change(within(dialog).getByLabelText(/notes/i), {
      target: { value: "Barre cran 7, pieds écartés" },
    });

    const squat = useTrackerStore.getState().exercises.find((item) => item.id === "squat");
    expect(squat?.note).toBe("Barre cran 7, pieds écartés");
  });

  it("garde le focus dans le champ de notes pendant la saisie", () => {
    render(<Dashboard />);

    const dialog = openExercise("Squat");
    expandPanel(dialog, /^notes/i);
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
    openEditPanel(sheet);
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
    expandPanel(sheet, /^historique/i);
    fireEvent.click(within(sheet).getByRole("button", { name: /modifier la référence/i }));
    const field = within(sheet).getByLabelText(/nouvelle référence/i);
    fireEvent.change(field, { target: { value: "120" } });
    fireEvent.click(within(sheet).getByRole("button", { name: /valider la référence/i }));

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
    completeSets(update, 8);

    const sheet = openExercise("Squat");
    expect((within(sheet).getByLabelText(/charge en kg/i) as HTMLInputElement).value).toBe("110");

    expandPanel(sheet, /^historique/i);
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

  it("garde les flèches pour réordonner sans glisser", () => {
    const program = useTrackerStore.getState().createProgram("PPL");
    const today = todayWeekday();
    useTrackerStore.getState().toggleExerciseInDay(program.id, today, "squat");
    useTrackerStore.getState().toggleExerciseInDay(program.id, today, "leg-curl");
    useTrackerStore.getState().selectDay(today);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /modifier la séance/i }));
    fireEvent.click(screen.getByRole("button", { name: /monter leg curl/i }));

    expect(useTrackerStore.getState().programs[0]?.days[today]).toEqual(["leg-curl", "squat"]);
  });

  function planToday(...exerciseIds: string[]) {
    const program = useTrackerStore.getState().createProgram("PPL");
    const today = todayWeekday();

    for (const id of exerciseIds) {
      useTrackerStore.getState().toggleExerciseInDay(program.id, today, id);
    }

    useTrackerStore.getState().selectDay(today);
    return program;
  }

  it("coche l'exercice enregistré et fait avancer le compteur de séance", () => {
    planToday("squat", "leg-curl");
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    expect(screen.getByLabelText(/avancement de la séance/i).textContent).toMatch(/0\/2/);

    fireEvent.click(screen.getByRole("button", { name: /^squat —/i }));
    completeSets(screen.getByRole("dialog", { name: "Squat" }), 8);

    const progress = screen.getByLabelText(/avancement de la séance/i);
    expect(progress.textContent).toMatch(/1\/2/);
    expect(progress.textContent).toMatch(/reste : leg curl/i);
  });

  it("lance le repos et annonce l'exercice suivant", () => {
    planToday("squat", "leg-curl");
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /^squat —/i }));
    const sheet = screen.getByRole("dialog", { name: "Squat" });
    completeSets(sheet, 8, 1);

    const timer = screen.getByRole("timer");
    expect(timer.textContent).toMatch(/1:3[01]/);
    expect(timer.textContent).toMatch(/ensuite/i);
    expect(timer.textContent).toMatch(/leg curl/i);
  });

  it("ne lance pas de repos pour une mensuration", () => {
    useTrackerStore.getState().startTracking("tour-de-taille", 85);

    render(<Dashboard />);

    const sheet = openExercise("Tour de taille");
    fireEvent.click(within(sheet).getByRole("button", { name: /enregistrer la mesure/i }));

    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("rappelle la dernière performance en tête de fiche", () => {
    useTrackerStore.getState().startTracking("squat", 100);
    useTrackerStore.setState((state) => ({
      trackings: {
        ...state.trackings,
        squat: {
          exerciseId: "squat",
          reference: 100,
          referenceDate: "2026-08-01T09:00:00.000Z",
          entries: [
            {
              id: "seance-precedente",
              value: 105,
              reps: null,
              sets: null,
              series: [
                { value: 105, reps: 8 },
                { value: 105, reps: 8 },
                { value: 105, reps: 7 },
              ],
              done: true,
              date: "2026-08-20T09:00:00.000Z",
            },
          ],
        },
      },
    }));

    render(<Dashboard />);

    const sheet = openExercise("Squat");

    expect(sheet.textContent).toMatch(/la dernière fois/i);
    expect(sheet.textContent).toMatch(/105 kg/);
    expect(sheet.textContent).toMatch(/× 8, 8, 7/);
  });

  it("règle le repos d'un exercice depuis sa fiche", () => {
    render(<Dashboard />);

    const sheet = openExercise("Squat");
    fireEvent.click(within(sheet).getByRole("button", { name: /^modifier$/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^3 min$/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^enregistrer$/i }));

    expect(useTrackerStore.getState().exercises.find((i) => i.id === "squat")?.rest).toBe(180);
  });

  it("n'achève l'exercice qu'une fois toutes les séries faites", () => {
    planToday("squat");
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /^squat —/i }));
    const sheet = screen.getByRole("dialog", { name: "Squat" });

    completeSets(sheet, 8, 1);
    expect(useTrackerStore.getState().trackings.squat?.entries[0]?.done).toBe(false);
    expect(screen.getByLabelText(/avancement de la séance/i).textContent).toMatch(/0\/1/);
    expect(screen.getByRole("button", { name: /^squat —/i }).textContent).toMatch(/1\/3/);

    completeSets(sheet, 8, 2, 1);

    expect(useTrackerStore.getState().trackings.squat?.entries[0]?.done).toBe(true);
    expect(screen.getByLabelText(/avancement de la séance/i).textContent).toMatch(/1\/1/);
  });

  it("annule une série mal saisie sans perdre les précédentes", () => {
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    const sheet = openExercise("Squat");
    completeSets(sheet, 8, 1);
    completeSets(sheet, 99, 1, 1);

    fireEvent.click(within(sheet).getByRole("button", { name: /annuler la série 2/i }));

    expect(useTrackerStore.getState().trackings.squat?.entries[0]?.series).toEqual([
      { value: 100, reps: 8 },
    ]);
  });

  it("affiche le tonnage de la séance dans l'historique", () => {
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    const sheet = openExercise("Squat");
    completeSets(sheet, 10);

    const again = openExercise("Squat");
    expandPanel(again, /^historique/i);
    // 3 séries de 10 répétitions à 100 kg.
    expect(again.textContent).toMatch(/3\s000 kg au total/);
  });

  it("règle le nombre de séries visées depuis la fiche", () => {
    render(<Dashboard />);

    const sheet = openExercise("Squat");
    fireEvent.click(within(sheet).getByRole("button", { name: /^modifier$/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /une série de plus/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^enregistrer$/i }));

    expect(useTrackerStore.getState().exercises.find((i) => i.id === "squat")?.targetSets).toBe(4);
  });

  it("replie l'historique et n'affiche qu'un aperçu des notes", () => {
    useTrackerStore.getState().startTracking("squat", 100);
    useTrackerStore.getState().setNote("squat", "Barre cran 7, pieds écartés");

    render(<Dashboard />);

    const sheet = openExercise("Squat");

    // L'aperçu de la note se lit sans ouvrir, le champ n'est pas monté.
    expect(sheet.textContent).toMatch(/barre cran 7/i);
    expect(within(sheet).queryByLabelText(/notes/i)).toBeNull();

    // L'historique ne déroule ses entrées qu'à la demande.
    expect(within(sheet).queryByRole("button", { name: /modifier la référence/i })).toBeNull();
    expandPanel(sheet, /^historique/i);
    expect(within(sheet).getByRole("button", { name: /modifier la référence/i })).toBeDefined();
  });

  it("garde masquer et supprimer hors de la vue courante", () => {
    render(<Dashboard />);

    const sheet = openExercise("Squat");
    expect(within(sheet).queryByRole("button", { name: /^masquer$/i })).toBeNull();

    openEditPanel(sheet);

    expect(within(sheet).getByRole("button", { name: /^masquer$/i })).toBeDefined();
  });

  it("laisse la célébration à la dernière série plutôt que le repos", async () => {
    planToday("squat");
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /^squat —/i }));
    const sheet = screen.getByRole("dialog", { name: "Squat" });

    completeSets(sheet, 8, 2);
    expect(screen.getByRole("timer")).toBeDefined();

    completeSets(screen.getByRole("dialog", { name: "Squat" }), 8, 1, 2);

    await waitForElementToBeRemoved(() => screen.queryByRole("timer"));
    // Le message est tiré au sort : on vérifie que la célébration cible bien l'exercice.
    expect(screen.getByRole("status").textContent).toMatch(/squat/i);
  });
});
