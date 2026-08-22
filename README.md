# TrackProgress

Suivi de charges pour la salle de sport : on enregistre une **charge de référence** par
exercice, on la met à jour au fil des séances, et l'app montre le chemin parcouru.

## Pourquoi

Le carnet papier (ou les notes du téléphone) répond mal à la seule question qui motive :
*est-ce que je progresse ?* Ici chaque exercice affiche sa charge actuelle, l'écart avec la
référence de départ, le record personnel et une courbe. Et quand la charge monte,
l'app le fait savoir.

## Fonctionnalités

- **Charge de référence + charge actuelle** avec écart en kg et en pourcentage.
- **Regroupement par partie du corps** : pectoraux, dos, jambes, épaules, bras, abdos.
- **Mise à jour en deux gestes** : incréments rapides (+1,25 / +2,5 / +5 kg), répétitions
  et séries optionnelles.
- **Animation de célébration** quand une charge progresse, avec badge « record personnel ».
- **Historique et sparkline** par exercice, suppression d'une entrée erronée.
- **Exercices personnalisés** mesurés en kilos, en répétitions ou en secondes.
- **Statistiques globales** : kilos gagnés, exercices en progression, jours actifs sur 30 jours.
- **Export / import JSON** pour changer de téléphone sans rien perdre.

Les données restent dans le navigateur (`localStorage`) : pas de compte, pas de serveur,
utilisable hors-ligne à la salle.

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
