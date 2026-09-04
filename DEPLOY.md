# Déploiement — Supabase + Vercel

Le CRM est une application Next.js unique. En production : base PostgreSQL gérée
par **Supabase**, hébergement sur **Vercel**.

---

## 1. Base de données — Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) (région `East US` ou
   `Canada Central` si disponible).
2. Projet → **Connect** → onglet **ORMs / Prisma**. Récupérer :
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`
   - **Direct connection** (port `5432`) → `DIRECT_URL`
3. Ajouter à `DATABASE_URL` les paramètres pooler :
   `?pgbouncer=true&connection_limit=1`

```
DATABASE_URL="postgresql://postgres.xxxx:[MOT_DE_PASSE]@aws-0-....pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxx:[MOT_DE_PASSE]@aws-0-....pooler.supabase.com:5432/postgres"
```

Les migrations s'appliquent automatiquement au build Vercel (`vercel-build` →
`prisma migrate deploy`, qui utilise `DIRECT_URL`).

### Premier remplissage (compte propriétaire)

`prisma db seed` ne tourne pas sur Vercel. Après le premier déploiement, créer le
compte une fois depuis ta machine, en pointant sur Supabase :

```bash
DATABASE_URL="<session pooler 5432>" DIRECT_URL="<session pooler 5432>" \
SEED_OWNER_EMAIL="alexandre@effetmat.com" SEED_OWNER_PASSWORD="<mot de passe fort>" \
SEED_OWNER_NAME="Alexandre" npx tsx prisma/seed.ts
```

Sans `SEED_DEMO=true`, le seed crée uniquement le compte propriétaire, les
réglages et les disponibilités par défaut (lun–ven 9 h–17 h) — aucune donnée
fictive. Il est idempotent : relançable sans risque.

---

## 2. Hébergement — Vercel

1. Pousser le dépôt sur GitHub, puis **Import Project** sur Vercel.
2. Framework détecté : Next.js. Aucune config à changer — Vercel utilise le script
   `vercel-build`.
3. **Environment Variables** (Production) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | Supabase — transaction pooler (`6543`, `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | Supabase — direct (`5432`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `APP_URL` | `https://<ton-domaine>` (URL publique finale) |
| `RESEND_API_KEY` | Resend (voir §3) |
| `EMAIL_FROM` | `Effet Mat <facturation@effetmat.com>` (domaine vérifié Resend) |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `STRIPE_SECRET_KEY` | facultatif — `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | facultatif — voir §4 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | facultatif — voir §5 |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://<ton-domaine>/api/google/oauth/callback` |
| `GOOGLE_TOKEN_ENC_KEY` | `openssl rand -base64 32` |

4. Déployer. Le cron `/api/cron/daily` est déclaré dans `vercel.json` (une fois par
   jour, 13 h UTC) — Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.

---

## 3. Emails — Resend

1. [resend.com](https://resend.com) → ajouter le domaine `effetmat.com`, publier
   les enregistrements DNS (SPF, DKIM).
2. Créer une clé API → `RESEND_API_KEY`.
3. `EMAIL_FROM` doit utiliser une adresse du domaine vérifié.

Sans `RESEND_API_KEY`, les emails sont seulement journalisés (utile en pré-prod).

---

## 4. Paiements — Stripe (facultatif)

1. Clé secrète live → `STRIPE_SECRET_KEY`.
2. Dashboard Stripe → **Developers → Webhooks → Add endpoint** :
   - URL : `https://<ton-domaine>/api/stripe/webhook`
   - Événements : `invoice.paid`, `invoice.finalized`, `invoice.voided`,
     `invoice.marked_uncollectible`
   - Copier le **Signing secret** → `STRIPE_WEBHOOK_SECRET`
3. Redéployer. À la finalisation d'une facture, Stripe crée la facture, l'envoie et
   le webhook rapproche le paiement automatiquement.

---

## 5. Google Calendar (facultatif)

1. [console.cloud.google.com](https://console.cloud.google.com) → nouveau projet →
   activer **Google Calendar API**.
2. **Écran de consentement OAuth** : type « Externe », ajouter ton adresse en
   utilisateur de test (ou publier l'app).
3. **Identifiants → Créer → ID client OAuth → Application Web** :
   - URI de redirection autorisés :
     `https://<ton-domaine>/api/google/oauth/callback`
   - Copier `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
4. `GOOGLE_TOKEN_ENC_KEY` = `openssl rand -base64 32` (chiffre le jeton au repos).
5. Redéployer, puis **Réglages → Google Agenda → Connecter**, choisir l'agenda de
   travail et les agendas « occupé ».

---

## Checklist post-déploiement

- [ ] Connexion à `/connexion` avec le compte seedé
- [ ] `/reserver` s'affiche et propose des créneaux (définir les disponibilités
      dans Réglages si besoin)
- [ ] Créer un rendez-vous test → facture → page publique `/facture/<token>`
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/daily`
      renvoie un JSON
- [ ] (si Stripe) régler une facture test → webhook la passe à « payée »
- [ ] (si Google) une séance confirmée apparaît dans Google Agenda
