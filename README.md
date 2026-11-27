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

1. **Variables** : URL du projet et clé publique, dans `.env.local` en local (voir
   `.env.example`) et sur Vercel. `next.config.ts` accepte tous les noms courants,
   y compris ceux de l'intégration Vercel × Supabase : `NEXT_PUBLIC_SUPABASE_URL` ou
   `SUPABASE_URL` (avec ou sans préfixe), et `…_PUBLISHABLE_KEY` ou `…_ANON_KEY`.
   Après un changement de variable sur Vercel, il faut **redéployer** (valeurs lues au build).
2. **Base** : Supabase › SQL Editor › coller [`supabase/setup.sql`](supabase/setup.sql) › Run.
   Ce fichier réunit toutes les migrations de `supabase/migrations/` dans l'ordre et peut être
   relancé sans risque (régénération : `npm run db:setup-sql`).
3. **Adresses** : Authentication › URL Configuration : *Site URL* = `https://reelqueue.vercel.app`,
   *Redirect URLs* = `https://reelqueue.vercel.app/**` et `http://localhost:3000/**`.
4. **Connexion Google** (facultatif) : dans Google Cloud Console, créer un identifiant OAuth
   « Application Web » avec l'URI de redirection `https://<projet>.supabase.co/auth/v1/callback`,
   puis Supabase › Authentication › Providers › Google : activer et coller Client ID et Secret.
   Tant que ce n'est pas fait, le bouton « Continuer avec Google » affiche un message clair.

Connexion par Google ou par e-mail et mot de passe (pas de lien magique) : sur iPhone, une PWA
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

## Ajouter une vidéo

- **Collage en un geste** (`lib/quick-add.ts`) : le bouton « + » lit le presse-papiers. Un
  lien de vidéo reconnu est ajouté directement (avec « Annuler ») ; un autre lien ouvre la
  feuille d'ajout pré-remplie ; sinon la feuille s'ouvre vide.
- **Raccourci iOS** (page `/raccourci`) : l'utilisateur crée une clé personnelle (affichée
  une fois, seule son empreinte SHA-256 est stockée) et un raccourci « Ajouter à
  ReelQueue » qui envoie le lien partagé à `POST /api/share`
  (`Authorization: Bearer <clé>`, corps JSON `{ "url": … }`). La route récupère titre,
  auteur et miniature puis appelle la fonction `add_shared_video`, qui authentifie par la
  clé : aucune clé secrète Supabase n'est nécessaire. Un Reel déjà vu revient dans « À
  regarder ».

## Limites connues sur iOS

- **Partage natif vers une PWA impossible sur iOS** : Safari ne prend pas en charge la
  Web Share Target API ([WebKit #194593](https://bugs.webkit.org/show_bug.cgi?id=194593)).
  Sur iPhone, le Raccourci iOS (ci-dessus) la remplace ; le partage natif Android reste à faire.
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
  « Jouer » de son intégration officielle renvoie vers instagram.com). La miniature d'un
  Reel ouvre donc directement Instagram, qui le lit en plein écran ; l'aperçu officiel reste
  dans le menu « ⋯ ». YouTube, TikTok et Vimeo se lisent dans un lecteur immersif plein
  écran (plein écran système sur ordinateur et Android ; sur iPhone, Safari ne l'autorise
  que pour une vidéo native, le lecteur occupe alors tout l'écran). La vidéo passe en
  « Vue » si le lecteur reste ouvert au moins 10 s.
