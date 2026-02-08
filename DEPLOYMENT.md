# 🚀 Déploiement sur Railway

Ce guide explique comment déployer le projet `agent-saas` sur Railway.

## Prérequis

- Un compte Railway (gratuit ou payant)
- Un compte GitHub (pour connecter le repo)
- Les variables d'environnement nécessaires :
  - `ANTHROPIC_API_KEY` : Clé API Anthropic
  - `JWT_SECRET` : Clé secrète JWT (chaîne aléatoire)
  - `TELEGRAM_BOT_TOKEN` : (optionnel) Token de bot Telegram

## Option 1 : Déploiement depuis GitHub (Recommandé)

### 1️⃣ Préparer le repository

```bash
# Assurer que tous les fichiers sont en place
git add Dockerfile railway.json DEPLOYMENT.md
git commit -m "chore: add Railway deployment files"
git push origin main
```

### 2️⃣ Créer un projet Railway

1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous avec GitHub
3. Cliquez sur **"+ New Project"**
4. Sélectionnez **"Deploy from GitHub repo"**
5. Sélectionnez ce repository (`agent-saas`)

### 3️⃣ Configurer les variables d'environnement

Dans le dashboard Railway :

1. Ouvrez le service déployé
2. Allez à **Variables**
3. Remplissez les variables requises :

| Variable | Valeur | Notes |
|----------|--------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | [Obtenir une clé](https://console.anthropic.com) |
| `JWT_SECRET` | `random-string-here` | Générez une chaîne aléatoire longue |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-...` | Optionnel, obtenir depuis [@BotFather](https://t.me/BotFather) |
| `DB_PATH` | `/app/data/agent-saas.db` | Défaut, laissez tel quel |

### 4️⃣ Déploiement automatique

Chaque `git push` déclenche un redéploiement automatique grâce à Railway.

## Option 2 : Déploiement CLI avec `railway`

### 1️⃣ Installer Railway CLI

```bash
npm i -g @railway/cli
# ou
brew install railway  # macOS
```

### 2️⃣ Authentifier

```bash
railway login
```

### 3️⃣ Initialiser le projet

```bash
cd /path/to/agent-saas
railway init
```

### 4️⃣ Configurer les variables

```bash
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set JWT_SECRET=your-random-secret
railway variables set TELEGRAM_BOT_TOKEN=123456:ABC-... # optional
```

### 5️⃣ Déployer

```bash
railway up
```

## Fichiers de déploiement

### `Dockerfile`
- Utilise une **image Alpine optimisée** (plus légère)
- Build multi-stage pour réduire la taille finale
- Installe les dépendances en production seulement
- Inclut un health check

### `railway.json`
- Configuration complète du déploiement
- Définit le port et le health check
- Déclare toutes les variables d'environnement
- Politique de redémarrage automatique

## Structure de l'application

```
agent-saas/
├── src/api/
│   ├── server.js          # Point d'entrée Express
│   ├── routes/            # Endpoints API
│   ├── services/          # Logique métier
│   ├── db/                # Base de données SQLite (sql.js)
│   └── middleware/        # Auth, logging, etc.
├── index.html             # Page d'accueil
├── package.json
├── Dockerfile             # Configuration Docker
├── railway.json           # Configuration Railway
└── DEPLOYMENT.md          # Ce fichier
```

## Configuration détaillée

### Port

Railway assigne un port aléatoire via la variable `$PORT`. L'application l'utilise automatiquement via `process.env.PORT` dans `src/api/config.js`.

### Base de données SQLite (sql.js)

- Stockée dans `/app/data/agent-saas.db`
- Initialisée au premier démarrage via `src/api/db/init.js`
- Schéma défini dans `src/api/db/schema.sql`

### Logs

Consulter les logs en temps réel :

```bash
railway logs -f
```

Ou depuis le dashboard Railway → Logs tab.

## Dépannage

### Erreur : `ANTHROPIC_API_KEY` non définie

```
Error: ANTHROPIC_API_KEY is required
```

✅ **Solution** : Définir la variable dans le dashboard Railway.

### Erreur : Port en conflit

Railway assigne automatiquement un port. Pas besoin de config.

### Application crash au démarrage

1. Vérifier les logs : `railway logs -f`
2. S'assurer que `JWT_SECRET` est défini
3. Vérifier que la DB est initialisée correctement

## Monitoring

### Health Check

L'application expose un endpoint santé :
- **URL** : `https://your-app.up.railway.app/api/health`
- **Réponse** : `{ "status": "ok", "time": "2026-02-08T..." }`

Railway teste cet endpoint toutes les 30 secondes.

### Métriques

Consulter les métriques (CPU, mémoire, réseau) dans l'onglet **Metrics** du dashboard.

## Mise à jour

Pour mettre à jour l'application :

1. Faire les modifications locales
2. Committer et pousser vers GitHub
3. Railway redéploie automatiquement en ~2-3 minutes

## Coûts

- **Gratuit** : 5$/mois de crédit (suffisant pour MVP)
- **Usage** : ~$5/mois pour une petite app (2GB RAM, 100GB data)

Consulter [Railway Pricing](https://railway.app/pricing).

## Support

- [Railway Docs](https://docs.railway.app)
- [Community Slack](https://railway.app/community)
- GitHub Issues (ce repo)

---

**Déploiement prêt !** 🚀
