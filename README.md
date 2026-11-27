# ReelQueue

File d'attente pour les Reels Instagram (et toute autre vidéo) à regarder plus tard.
PWA pensée d'abord pour l'iPhone.

**Partager → Enregistrer → Regarder → Revenir → Marquer comme vue → Classer si intéressant.**

ReelQueue gère des **liens**, pas des vidéos : rien n'est téléchargé ni hébergé, et
l'URL d'origine est conservée pour ouvrir le contenu dans son application.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de production (vérifie aussi le prérendu)
npm run lint
npx tsc --noEmit
```

Pour tester sur iPhone pendant le développement, ouvrez `http://<ip-du-poste>:3000`
depuis Safari, sur le même réseau Wi-Fi.

## État d'avancement

| Phase | Contenu | État |
| --- | --- | --- |
| 1 | Projet, architecture, design system, navigation, écrans (données de démo locales) | ✅ |
| 2 | Supabase : authentification, persistance, RLS, migrations, cache hors ligne | ✅ (migration à appliquer) |
| 3 | Métadonnées (titre, auteur, miniature) ✅ · lecteur intégré / aperçu ✅ · partage depuis iOS | en cours |
| 4 | Retour dans l'app → statut « Vue » automatique, cas limites | ✅ |
| 5 | PWA : manifest, service worker, hors ligne, installation iOS | à venir |

Sans variables Supabase, l'app tourne en **mode local** : données dans le `localStorage`
et données de démonstration au premier lancement (bouton « Partir de zéro »).

## Supabase

1. Copier `.env.example` en `.env.local` et renseigner l'URL et la clé publique du projet.
2. Appliquer le schéma : Supabase › SQL Editor › coller
   [`supabase/migrations/20261125120000_initial_schema.sql`](supabase/migrations/20261125120000_initial_schema.sql) › Run
   (script rejouable).
3. Authentication › URL Configuration : *Site URL* = URL de production, *Redirect URLs* =
   `https://<prod>/**` et `http://localhost:3000/**`.
4. Sur Vercel, les mêmes variables `NEXT_PUBLIC_SUPABASE_*` doivent exister.

Authentification par e-mail et mot de passe (et non lien magique) : sur iPhone, une PWA
installée ne partage pas son stockage avec Safari, où s'ouvrent les liens reçus par e-mail.

## Stack

Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript strict, Tailwind CSS 4,
shadcn/ui (Radix), Lucide, Zustand, Sonner, Vaul. Supabase et Vercel à partir de la phase 2.

## Architecture

```
src/
├─ app/
│  ├─ layout.tsx               # polices, métadonnées iOS, viewport, toasts
│  ├─ not-found.tsx
│  └─ (app)/                   # coque : onglets (mobile) / barre latérale (desktop)
│     ├─ layout.tsx
│     ├─ error.tsx
│     ├─ page.tsx              # À regarder
│     ├─ library/              # Bibliothèque (vidéos consultées)
│     ├─ favorites/
│     ├─ collections/[id]/
│     └─ search/               # recherche globale + filtres
├─ components/
│  ├─ app-shell/               # navigation, en-tête, runtime (chargement + feuilles)
│  ├─ views/                   # un composant client par écran
│  ├─ videos/                  # carte, liste, miniature, menu, feuilles d'ajout/note/collections
│  ├─ collections/
│  ├─ common/                  # état vide, recherche, contrôle segmenté, bandeau démo
│  └─ ui/                      # shadcn/ui + ResponsiveSheet (tiroir mobile / dialogue desktop)
├─ lib/
│  ├─ platforms.ts             # détection de plateforme, normalisation anti-doublon, extraction d'URL
│  ├─ videos.ts                # titres de repli, dates relatives, recherche, filtres, tri
│  ├─ video-actions.ts         # actions métier + toasts « Annuler »
│  ├─ store/library.ts         # store Zustand : mises à jour optimistes + retour arrière
│  ├─ store/ui.ts              # feuille ouverte, préférences d'affichage
│  └─ data/
│     ├─ repository.ts         # contrat de persistance
│     ├─ local-repository.ts   # phase 1 : localStorage
│     └─ seed.ts               # données de démonstration
└─ types/index.ts              # modèle aligné sur le schéma Supabase (snake_case)
```

Choix structurants :

- **Données côté client, derrière un dépôt.** Les écrans lisent un store Zustand qui
  applique chaque action de façon optimiste puis délègue à un `LibraryRepository`.
  En phase 2, un `SupabaseRepository` remplace le dépôt local sans toucher aux écrans,
  et le cache local servira la consultation hors ligne.
- **Anti-doublon par URL canonique.** `canonical_url` normalise les variantes d'un
  même contenu (`/reel/X` et `/p/X`, `www`, paramètres de suivi comme `igsh`), tandis
  que `url` garde le lien d'origine, celui qu'on ouvre.
- **Ouverture par lien natif** (`<a target="_blank">`), plus fiable sur iOS pour
  basculer vers l'application d'origine.
- **« Vue » automatique** (`lib/open-tracking.ts`) : au clic sur « Ouvrir », la vidéo est
  notée ; quand l'utilisateur quitte l'app (`visibilitychange`, `blur`) puis revient
  (`visible`, `focus`) après au moins 3 s, elle passe en « Vue » avec « Annuler ». Un retour
  plus rapide est traité comme une ouverture accidentelle. Les ouvertures en attente sont
  gardées sur l'appareil : si iOS ferme l'app pendant le visionnage, elles sont appliquées
  au lancement suivant. « Vue » signifie « consultée », pas « regardée jusqu'au bout ».
- **Lecteur intégré prévu, pas simulé.** Les plateformes qui autorisent l'embed
  déclarent `embedUrl` dans `lib/platforms.ts` ; aucun lecteur n'est affiché tant
  qu'il n'est pas implémenté.
- **`cacheComponents` / Activity.** Next.js garde les pages quittées montées et
  masquées : les feuilles sont hébergées une seule fois dans le layout, et
  `usePathname` est placé sous `Suspense` à cause de la route dynamique
  `/collections/[id]`.

## Limites connues sur iOS

- **Partage natif vers une PWA impossible sur iOS** : Safari ne prend pas en charge la
  Web Share Target API ([WebKit #194593](https://bugs.webkit.org/show_bug.cgi?id=194593)).
  Elle sera déclarée pour Android ; sur iPhone, l'alternative prévue en phase 3 est un
  Raccourci iOS qui ouvre ReelQueue avec le lien, en plus du bouton « Coller ».
- **Métadonnées Instagram** : depuis le 3 novembre 2025, l'API oEmbed de Meta ne renvoie
  plus ni auteur ni miniature ([annonce](https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/)).
  Comme Meta le recommande, `/api/metadata` lit les balises Open Graph publiques de la
  publication (page d'intégration officielle en secours), avec un agent HTTP identifié et
  sans connexion. La légende devient le titre. Ce n'est pas une API garantie : en cas
  d'échec, titre et visuel de repli s'affichent et le lien reste utilisable.
- **Miniatures Instagram** : le CDN d'Instagram interdit l'affichage de ses images sur un
  autre site et signe ses URL pour quelques jours. `/api/thumbnail/instagram/<code>` les
  relaie à une adresse stable (cache HTTP seulement, rien n'est stocké).
- **Lecture** : Instagram ne permet pas de lire un Reel hors de son application (le bouton
  « Jouer » de son intégration officielle renvoie vers instagram.com). ReelQueue affiche
  l'aperçu officiel et ouvre Instagram pour la lecture. YouTube, TikTok et Vimeo se lisent
  dans l'app ; la vidéo passe en « Vue » si le lecteur reste ouvert au moins 10 s.
