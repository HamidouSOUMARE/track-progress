# TrackProgress

Suivi de charges pour la salle de sport : on enregistre une **charge de référence** par
exercice, on la met à jour au fil des séances, et l'app montre le chemin parcouru.

## Pourquoi

Le carnet papier (ou les notes du téléphone) répond mal à la seule question qui motive :
*est-ce que je progresse ?* Ici chaque exercice affiche sa charge actuelle, l'écart avec la
référence de départ, le record personnel et une courbe. Et quand la charge monte,
l'app le fait savoir.

## Deux vues

- **Séance** — la vue par défaut. Le programme suivi, la semaine en bandeau, et les
  exercices du jour prêts à être mis à jour. C'est l'écran qu'on ouvre à la salle : il
  suit l'avancement (3/6, exercices cochés, ce qu'il reste), lance le **minuteur de repos**
  dès qu'une performance est enregistrée et annonce l'exercice suivant.
- **Tous les suivis** — la bibliothèque complète : statistiques, recherche, filtres par
  groupe musculaire, et les suivis masqués repliés en bas.

## Fonctionnalités

- **Charge de référence + charge actuelle** avec écart en kg et en pourcentage.
- **Regroupement par partie du corps** : pectoraux, dos, jambes, fessiers, épaules, bras, abdos.
- **Mensurations** dans le même écran : tour de taille, tour de bras, poids de corps…
  chaque mesure porte le sens de son objectif (↑ gagner du bras, ↓ perdre du tour de
  taille), qui pilote la couleur, la détection de record et le message d'encouragement.
- **Bouton retour du téléphone** : il referme la feuille ouverte au lieu de quitter l'app.
- **Séance série par série** : on règle la charge, on valide chaque série avec ses
  répétitions, le repos démarre aussitôt et l'exercice passe en « fait » une fois le
  nombre de séries visé atteint. Le rappel de la dernière séance figure en tête de fiche.
- **Charge et tonnage distingués** : la progression et les records se jugent sur la
  charge la plus lourde de la séance, jamais sur le volume — cinq séries au lieu de
  quatre ne font pas un record. Le tonnage s'affiche à part dans l'historique.
- **Repos réglable par exercice** : raccourcis (aucun, 1 min, 1 min 30, 2 min, 3 min) ou
  durée saisie à la main jusqu'à 10 min, en plein écran, décompte adossé à un instant de
  fin pour ne pas dériver. L'écran reste allumé pendant le repos là où le navigateur le
  permet — le téléphone posé sur le banc ne se verrouille pas.
- **Échauffement minuté** avant la séance ou avant un exercice, dans le même plein écran
  que le repos. Il n'enregistre rien : ni performance, ni avancement de séance.
- **Animation de célébration** quand une charge progresse, avec badge « record personnel ».
- **Historique et sparkline** par exercice. Toute suppression — une performance, un
  suivi entier — s'annule pendant six secondes depuis une barre flottante, sans boîte
  de confirmation.
- **Fiche modifiable** : nom, groupe, unité et sens du progrès se changent après coup,
  ce qui rattrape un exercice mal typé à la création ou venu d'un fichier importé.
- **Notes libres** par suivi : réglages de la machine, points de technique, conditions
  de mesure. Un repère discret sur la carte signale les suivis annotés.
- **Suivis personnalisés** mesurés en kilos, répétitions, secondes ou centimètres.
- **Statistiques globales** : kilos gagnés, suivis en progression, records battus.
- **Programmes composés de séances** : un programme réunit des séances nommées
  (« Haut du corps », « Jambes »), qu'on pose ensuite sur les jours de la semaine. Une
  même séance peut revenir plusieurs fois — changer de rythme revient à déplacer des
  étiquettes, pas à reconstruire des listes. L'ordre des exercices se change au
  glisser-déposer par une poignée, ou aux flèches — qui restent le chemin accessible
  au clavier et au lecteur d'écran. Un seul est « suivi » à la
  fois et alimente la vue Séance.
- **Programmes tout prêts** : Débuter, Corps complet, Haut / Bas, Push Pull Legs, Split
  par muscle, Force 5×5, Fessiers & jambes, Haut du corps, À la maison, Express 30 min —
  chacun décliné de 2 à 5 jours par semaine. Le modèle est copié : il devient un programme
  comme les autres. Les exercices déjà suivis gardent leurs réglages et leur historique.
- **Nouveautés** annoncées une fois par version à l'ouverture (jamais au premier
  lancement), et consultables en bas de page. Une version publiée pendant que l'app est
  ouverte propose de recharger plutôt que de le faire en pleine série.
- **Masquer ou supprimer** : masquer sort un suivi des listes en conservant tout son
  historique — utile pour un exercice mis de côté quelques mois ; supprimer efface pour
  de bon. Les deux s'annulent depuis la barre flottante.
- **Export / import JSON** pour changer de téléphone sans rien perdre. À l'import, le
  choix est explicite : *fusionner* (rien n'est supprimé) ou *remplacer* (restauration à
  l'identique, avec le nombre de suivis perdus annoncé avant validation). Un fichier
  d'exemple, généré depuis les types de l'app, documente le format attendu et s'affiche
  automatiquement quand un fichier est refusé.

Les données restent dans le navigateur (`localStorage`) : pas de compte, pas de serveur.
Un service worker met la coquille de l'app en cache, donc elle s'ouvre même sans réseau et
s'installe sur l'écran d'accueil. La page passe toujours par le réseau en premier : une
version périmée ne peut pas s'installer durablement.

## Démarrer

```bash
npm install
npm run dev
```

L'app est disponible sur http://localhost:3000.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires (Vitest) |

## Organisation du code

```
src/
├── app/            # App Router : layout, page, styles et design tokens
├── components/     # Composants d'interface (cartes, feuilles modales, animations)
├── data/           # Catalogue d'exercices et groupes musculaires
├── lib/            # Types, calculs de progression, formatage, sauvegarde
└── store/          # État persistant (Zustand + localStorage)
```

Toutes les couleurs, rayons et ombres sont déclarés comme design tokens dans
`src/app/globals.css` ; aucune valeur brute n'est écrite dans les composants.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Motion · Vitest
