# CRM — Photo & Vidéo immobilière

CRM pour photographe / vidéaste immobilier : suivi des rendez-vous, facturation
clients (TPS/TVQ + Stripe), réservation en ligne connectée à l'agenda, et
synchronisation Google Calendar.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Actions) |
| Base de données | PostgreSQL via Prisma — `embedded-postgres` en local, Supabase en prod |
| Auth | Auth.js v5 (Credentials, compte propriétaire unique) |
| UI | Tailwind CSS v4, composants maison |
| Dates / fuseaux | Luxon (stockage UTC, affichage fuseau configuré) |
| Paiements | Stripe *(phase 3)* · Emails Resend *(phase 2)* · Google Calendar *(phase 4)* |

## Démarrage

```bash
cp .env.example .env      # puis renseigner AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:migrate        # crée le schéma dans le Postgres local
npm run db:seed           # compte propriétaire + données de démonstration
npm run dev               # lance Postgres + Next.js sur http://localhost:3000
```

Connexion par défaut (modifiable via `SEED_OWNER_*` dans `.env`) :
`alexandre@effetmat.com` / `changeme123`.

> En local, `npm run dev` démarre un PostgreSQL embarqué (port 5433, données dans
> `./.pgdata`) et surcharge `DATABASE_URL`. Aucun Docker ni Postgres système requis.

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Postgres local + serveur de développement |
| `npm run db` | Postgres local seul (pour lancer des commandes Prisma à côté) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Peuple la base (idempotent) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Réinitialise la base + reseed |
| `npm run build` / `npm start` | Build et exécution production |
| `npm run lint` | ESLint |

## Structure

```
prisma/schema.prisma        modèle de données
prisma/seed.ts              données initiales
scripts/with-db.ts          orchestrateur Postgres local
src/proxy.ts                protection des routes /(owner)
src/auth.ts, auth.config.ts Auth.js
src/lib/                     prisma, settings, datetime, money, tax, validation…
src/app/(owner)/            espace propriétaire (dashboard, agenda, clients, forfaits, réglages)
src/app/connexion/          page de connexion
src/app/reserver/           tunnel de réservation public (sans authentification)
src/lib/availability.ts     moteur de créneaux
src/lib/email/              envoi (Resend ou console) + gabarits
```

### Emails

Sans `RESEND_API_KEY`, les emails s'affichent dans la console du serveur. Pour un
envoi réel : renseigner `RESEND_API_KEY` et `EMAIL_FROM` (domaine vérifié Resend)
dans `.env`.

### Stripe (optionnel)

Renseigner `STRIPE_SECRET_KEY` (clé test `sk_test_…`) et `STRIPE_WEBHOOK_SECRET`
(`whsec_…`) dans `.env`. En local, relayer les webhooks :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

À la finalisation d'une facture, une facture Stripe est créée, finalisée et envoyée
au client (lien de paiement carte). Le webhook `invoice.paid` bascule la facture en
« payée » et enregistre le paiement.

### Google Calendar (optionnel)

1. Console Google Cloud → activer l'API Google Calendar, créer un identifiant OAuth
   « Web », URI de redirection `http://localhost:3000/api/google/oauth/callback`.
2. `.env` : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, et `GOOGLE_TOKEN_ENC_KEY`
   (`openssl rand -base64 32`) pour chiffrer le jeton au repos.
3. Redémarrer, puis Réglages → « Connecter Google Agenda », choisir l'agenda de
   travail et les agendas « occupé ».

### Tâches quotidiennes (rappels + relances)

Le cron `vercel.json` appelle `/api/cron/daily` chaque jour : rappels de séance
24–48 h avant, et relances des factures échues (max 3, une par semaine). Définir
`CRON_SECRET` sur Vercel. En local : `curl localhost:3000/api/cron/daily`.

## Roadmap

- [x] **Phase 0** — Fondations : projet, base locale, authentification.
- [x] **Phase 1** — Cœur CRM : clients, forfaits, agenda, réglages de disponibilité.
- [x] **Phase 2** — Réservation client en ligne (`/reserver`) : moteur de créneaux
  (disponibilités + battements + délai + horizon, anti-double-réservation), tunnel
  public, emails de demande / confirmation + fichier `.ics`.
- [x] **Phase 3** — Facturation : création depuis un rendez-vous, lignes éditables,
  TPS/TVQ, numérotation `AAAA-NNN`, finalisation + envoi courriel, page publique
  `/facture/[token]`, suivi payé / à recevoir. **Stripe** (lien de paiement carte +
  webhook de rapprochement) s'active dès que `STRIPE_SECRET_KEY` /
  `STRIPE_WEBHOOK_SECRET` sont renseignés ; sinon les factures fonctionnent avec les
  modalités de paiement définies dans Réglages.
- [x] **Phase 4** — Google Calendar : connexion OAuth dans Réglages, choix de
  l'agenda de travail + des agendas « occupé », intégration du *freebusy* Google au
  moteur de créneaux, miroir des séances (création / déplacement / annulation), et
  rappels automatiques 24–48 h avant (Vercel Cron). S'active dès que
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` sont renseignés.
- [x] **Phase 5** — Relances automatiques des factures échues, indicateurs du
  tableau de bord, préparation du déploiement (`vercel.json`, `vercel-build`,
  `directUrl` Prisma). Guide complet : [`DEPLOY.md`](DEPLOY.md).

## Déploiement

Base Postgres sur Supabase, application sur Vercel (les migrations s'appliquent au
build via `vercel-build`). Procédure pas à pas : [`DEPLOY.md`](DEPLOY.md).

## Design

Palette et typographie dérivées de [effetmat.com](https://effetmat.com) : vert
forêt `#004438`, jaune `#ebe340`, menthe `#cedfd7`, titres et boutons principaux en
Montserrat. Définies comme tokens dans `src/app/globals.css`.
