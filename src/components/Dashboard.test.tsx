import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import { RELEASES } from "@/data/changelog";
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
    warmupSeconds: 300,
    // Les nouveautés ont leurs propres tests : on les tient à l'écart des autres.
    lastSeenRelease: RELEASES[0]?.id ?? null,
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
    fireEvent.click(screen.getByRole("button", { name: /créer le mien/i }));

    const programs = screen.getByRole("dialog", { name: /mes programmes/i });
    fireEvent.change(within(programs).getByLabelText(/nom du nouveau programme/i), {
      target: { value: "Push Pull Legs" },
    });
    fireEvent.click(within(programs).getByRole("button", { name: /^créer$/i }));
    fireEvent.click(within(programs).getByRole("button", { name: /fermer|^×$/i }));

    expect(useTrackerStore.getState().programs[0]?.name).toBe("Push Pull Legs");

    // Le jour est vide : on lui programme une séance, puis on la remplit.
    fireEvent.click(screen.getByRole("button", { name: /programmer une séance/i }));
    const workoutPicker = screen.getByRole("dialog", { name: /séance du/i });
    fireEvent.change(within(workoutPicker).getByLabelText(/nom de la nouvelle séance/i), {
      target: { value: "Haut du corps" },
    });
    fireEvent.click(within(workoutPicker).getByRole("button", { name: /^créer$/i }));

    const picker = screen.getByRole("dialog", { name: /ajouter des exercices/i });
    fireEvent.click(within(picker).getByRole("button", { name: /^squat$/i }));
    fireEvent.click(within(picker).getByRole("button", { name: /terminer/i }));

    const today = todayWeekday();
    const [workout] = useTrackerStore.getState().programs[0]?.workouts ?? [];
    expect(workout?.name).toBe("Haut du corps");
    expect(workout?.exercises).toEqual(["squat"]);
    expect(useTrackerStore.getState().programs[0]?.days[today]).toEqual([workout?.id]);

    // On sort de l'édition pour retrouver la séance prête à être suivie.
    fireEvent.click(screen.getByRole("button", { name: /terminer l'édition/i }));
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
    days[todayWeekday()] = ["w"];

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
      programs: [
        {
          id: "p",
          name: "Recomposition",
          workouts: [
            { id: "w", name: "Haut du corps", exercises: ["curl-incline", "squat-importe"] },
          ],
          days,
        },
      ],
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

    // La feuille refermée par le test précédent a lancé un retour que jsdom ne
    // livre jamais : on laisse son repère expirer, comme le ferait un vrai geste.
    await new Promise((resolve) => setTimeout(resolve, 150));

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
    planToday("squat", "leg-curl");

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /modifier la journée/i }));
    fireEvent.click(screen.getByRole("button", { name: /monter leg curl/i }));

    expect(useTrackerStore.getState().programs[0]?.workouts[0]?.exercises).toEqual([
      "leg-curl",
      "squat",
    ]);
  });

  function planToday(...exerciseIds: string[]) {
    const state = useTrackerStore.getState();
    const program = state.createProgram("PPL");
    const workout = state.createWorkout(program.id, "Séance du test")!;
    const today = todayWeekday();

    state.assignWorkout(program.id, today, workout.id);
    for (const id of exerciseIds) {
      state.toggleExerciseInWorkout(program.id, workout.id, id);
    }

    state.selectDay(today);
    return { program, workout };
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

  it("lance le repos et situe la série qui arrive", () => {
    planToday("squat", "leg-curl");
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /^squat —/i }));
    const sheet = screen.getByRole("dialog", { name: "Squat" });
    completeSets(sheet, 8, 1);

    const timer = screen.getByRole("timer");
    expect(timer.textContent).toMatch(/1:3[01]/);
    // On annonce la série à venir, pas l'exercice suivant : il reste des séries.
    expect(timer.textContent).toMatch(/série 2 sur 3/i);
    expect(timer.textContent).toMatch(/squat/i);
  });

  it("allonge l'anneau en même temps que le décompte", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      planToday("squat");
      useTrackerStore.getState().startTracking("squat", 100);

      render(<Dashboard />);

      fireEvent.click(screen.getByRole("button", { name: /^squat —/i }));
      completeSets(screen.getByRole("dialog", { name: "Squat" }), 8, 1);

      const timer = screen.getByRole("timer");
      fireEvent.click(within(timer).getByRole("button", { name: /\+30 s/i }));

      // 90 s de repos + 30 s : le total devient 2 min.
      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      // Il reste 1:30 sur 2:00, donc trois quarts d'anneau. Sans allonger la
      // durée totale, le rapport serait resté à 1 et l'anneau plein.
      expect(screen.getByRole("timer").textContent).toMatch(/1:30/);
      const arc = screen.getByRole("timer").querySelector("circle[stroke-dashoffset]");
      const dash = Number(arc?.getAttribute("stroke-dasharray") ?? "0");
      const offset = Number(arc?.getAttribute("stroke-dashoffset") ?? "0");

      expect(offset / dash).toBeCloseTo(0.25, 1);
    } finally {
      vi.useRealTimers();
    }
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

  it("liste les séries de chaque séance dans l'historique", () => {
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    const sheet = openExercise("Squat");
    completeSets(sheet, 10);

    const again = openExercise("Squat");
    expandPanel(again, /^historique/i);

    expect(again.textContent).toMatch(/× 10, 10, 10/);
    expect(again.textContent).not.toMatch(/au total/);
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

  it("réutilise une séance sur un autre jour sans la dupliquer", () => {
    const { program, workout } = planToday("squat", "leg-curl");
    const other = WEEKDAYS.find((weekday) => weekday.id !== todayWeekday())!;
    useTrackerStore.getState().assignWorkout(program.id, other.id, workout.id);

    render(<Dashboard />);

    // La séance est la même : retirer un exercice le retire des deux jours.
    fireEvent.click(screen.getByRole("button", { name: /modifier la journée/i }));
    expect(screen.getByText(new RegExp(`aussi programmée le ${other.label}`, "i"))).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /retirer leg curl/i }));

    const programs = useTrackerStore.getState().programs;
    expect(programs[0]?.workouts).toHaveLength(1);
    expect(programs[0]?.workouts[0]?.exercises).toEqual(["squat"]);
    expect(programs[0]?.days[other.id]).toEqual([workout.id]);
  });

  it("retire une séance d'un jour sans la supprimer du programme", () => {
    const { program, workout } = planToday("squat");
    const other = WEEKDAYS.find((weekday) => weekday.id !== todayWeekday())!;
    useTrackerStore.getState().assignWorkout(program.id, other.id, workout.id);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /modifier la journée/i }));
    fireEvent.click(screen.getByRole("button", { name: /retirer séance du test du/i }));

    const programs = useTrackerStore.getState().programs;
    expect(programs[0]?.days[todayWeekday()]).toEqual([]);
    expect(programs[0]?.days[other.id]).toEqual([workout.id]);
    expect(programs[0]?.workouts).toHaveLength(1);
  });

  it("affiche le nom de la séance au-dessus des exercices", () => {
    planToday("squat");

    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: /séance du test/i })).toBeDefined();
  });
  it("lance un échauffement avant la séance sans rien enregistrer", () => {
    planToday("squat");

    render(<Dashboard />);

    const progress = screen.getByLabelText(/avancement de la séance/i);
    fireEvent.click(within(progress).getByRole("button", { name: /s'échauffer/i }));
    fireEvent.click(within(progress).getByRole("button", { name: /^10 min$/i }));
    fireEvent.click(within(progress).getByRole("button", { name: /lancer · 10 min/i }));

    const timer = screen.getByRole("timer");
    expect(timer.textContent).toMatch(/10:0[01]/);
    expect(timer.textContent).toMatch(/avant séance du test/i);

    fireEvent.click(within(timer).getByRole("button", { name: /je suis prêt/i }));

    // Ni performance ni avancement : l'échauffement ne compte pas.
    expect(useTrackerStore.getState().trackings).toEqual({});
    expect(screen.getByLabelText(/avancement de la séance/i).textContent).toMatch(/0\/1/);
    // La durée choisie est reproposée la fois suivante.
    expect(useTrackerStore.getState().warmupSeconds).toBe(600);
  });

  it("accepte une durée d'échauffement saisie à la main", () => {
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    const sheet = openExercise("Squat");
    fireEvent.click(within(sheet).getByRole("button", { name: /s'échauffer/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^autre…$/i }));
    fireEvent.change(within(sheet).getByLabelText(/^minutes$/i), { target: { value: "7" } });
    fireEvent.change(within(sheet).getByLabelText(/^secondes$/i), { target: { value: "30" } });
    fireEvent.click(within(sheet).getByRole("button", { name: /lancer · 7 min 30/i }));

    const timer = screen.getByRole("timer");
    expect(timer.textContent).toMatch(/7:3[01]/);
    expect(timer.textContent).toMatch(/avant squat/i);
  });

  it("retire l'échauffement de la fiche une fois la première série validée", () => {
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    const sheet = openExercise("Squat");
    completeSets(sheet, 8, 1);

    expect(
      within(screen.getByRole("dialog", { name: "Squat" })).queryByRole("button", {
        name: /s'échauffer/i,
      }),
    ).toBeNull();
  });

  it("règle un repos personnalisé depuis la fiche", () => {
    useTrackerStore.getState().startTracking("squat", 100);

    render(<Dashboard />);

    const sheet = openExercise("Squat");
    openEditPanel(sheet);
    fireEvent.click(within(sheet).getByRole("button", { name: /^autre…$/i }));
    fireEvent.change(within(sheet).getByLabelText(/^minutes$/i), { target: { value: "4" } });
    fireEvent.change(within(sheet).getByLabelText(/^secondes$/i), { target: { value: "15" } });
    fireEvent.click(within(sheet).getByRole("button", { name: /^enregistrer$/i }));

    expect(useTrackerStore.getState().exercises.find((item) => item.id === "squat")?.rest).toBe(
      255,
    );

    completeSets(screen.getByRole("dialog", { name: "Squat" }), 8, 1);
    expect(screen.getByRole("timer").textContent).toMatch(/4:1[56]/);
  });
  it("suit un programme tout prêt depuis la séance vide", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /choisir un programme tout prêt/i }));
    const sheet = screen.getByRole("dialog", { name: /programmes tout prêts/i });

    // Le filtre par jours ne garde que les modèles qui ont ce rythme.
    fireEvent.click(within(sheet).getByRole("button", { name: /^5 jours$/i }));
    expect(within(sheet).queryByRole("button", { name: /^débuter/i })).toBeNull();
    fireEvent.click(within(sheet).getByRole("button", { name: /^fessiers & jambes/i }));

    // Le rythme filtré est déjà choisi, et on annonce ce qui sera ajouté.
    expect(
      within(sheet).getByRole("button", { name: /^5 jours$/i }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(sheet.textContent).toMatch(/hip thrust/i);
    expect(sheet.textContent).toMatch(/nouveaux exercices rejoindront ta bibliothèque/i);

    fireEvent.click(within(sheet).getByRole("button", { name: /suivre ce programme/i }));

    const state = useTrackerStore.getState();
    const program = state.programs[0];
    expect(program?.name).toBe("Fessiers & jambes · 5 jours");
    expect(state.activeProgramId).toBe(program?.id);
    expect(state.exercises.some((exercise) => exercise.id === "hip-thrust")).toBe(true);
    expect(screen.getByText(/programme « fessiers & jambes · 5 jours » prêt/i)).toBeDefined();
  });

  it("propose les programmes tout prêts depuis la gestion des programmes", () => {
    useTrackerStore.getState().createProgram("Le mien");

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /programme suivi/i }));
    const programs = screen.getByRole("dialog", { name: /mes programmes/i });
    fireEvent.click(within(programs).getByRole("button", { name: /programmes tout prêts/i }));

    const sheet = screen.getByRole("dialog", { name: /programmes tout prêts/i });
    fireEvent.click(within(sheet).getByRole("button", { name: /^force 5×5/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^3 jours$/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /suivre ce programme/i }));

    const state = useTrackerStore.getState();
    expect(state.programs.map((program) => program.name)).toEqual([
      "Le mien",
      "Force 5×5 · 3 jours",
    ]);
    expect(state.activeProgramId).toBe(state.programs[1]?.id);
  });
  it("annonce les nouveautés une seule fois à qui avait déjà l'app", () => {
    useTrackerStore.getState().startTracking("squat", 100);
    useTrackerStore.setState({ lastSeenRelease: null });

    render(<Dashboard />);

    const news = screen.getByRole("dialog", { name: /quoi de neuf/i });
    expect(news.textContent).toMatch(/programmes tout prêts/i);
    fireEvent.click(within(news).getByRole("button", { name: /c'est parti/i }));

    expect(useTrackerStore.getState().lastSeenRelease).toBe(RELEASES[0]?.id);
    cleanup();
    render(<Dashboard />);
    expect(screen.queryByRole("dialog", { name: /quoi de neuf/i })).toBeNull();
  });

  it("épargne les nouveautés à un nouvel utilisateur", () => {
    useTrackerStore.setState({ lastSeenRelease: null });

    render(<Dashboard />);

    expect(screen.queryByRole("dialog", { name: /quoi de neuf/i })).toBeNull();
    expect(useTrackerStore.getState().lastSeenRelease).toBe(RELEASES[0]?.id);
  });

  it("garde les nouveautés consultables en bas de page", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /quoi de neuf/i }));

    expect(screen.getByRole("dialog", { name: /quoi de neuf/i })).toBeDefined();
  });
  it("pose un programme tout prêt sur les jours choisis", () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /choisir un programme tout prêt/i }));
    const sheet = screen.getByRole("dialog", { name: /programmes tout prêts/i });
    fireEvent.click(within(sheet).getByRole("button", { name: /^force 5×5/i }));
    fireEvent.click(within(sheet).getByRole("button", { name: /^3 jours$/i }));

    // Lundi, mercredi, vendredi par défaut : on passe le vendredi au samedi.
    fireEvent.click(within(sheet).getByRole("button", { name: /^vendredi$/i }));
    const follow = within(sheet).getByRole("button", { name: /suivre ce programme/i });
    expect(sheet.textContent).toMatch(/choisis encore 1 jour/i);
    expect((follow as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(sheet).getByRole("button", { name: /^samedi$/i }));
    expect((follow as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(follow);

    const program = useTrackerStore.getState().programs[0]!;
    const [a, b] = program.workouts;
    expect(program.days.lundi).toEqual([a?.id]);
    expect(program.days.mercredi).toEqual([b?.id]);
    expect(program.days.samedi).toEqual([a?.id]);
    expect(program.days.vendredi).toEqual([]);
  });
});
