# N8N Setup for MyBestAgent

## Déploiement sur Render

### Option 1: Via Blueprint (Recommandé)
1. Créer un nouveau service sur Render
2. Choisir "Blueprint" et pointer vers ce repo
3. Render va automatiquement créer N8N + PostgreSQL

### Option 2: Manuel
1. Créer une base PostgreSQL sur Render (gratuit)
2. Créer un Web Service Docker
3. Configurer les variables d'environnement (voir ci-dessous)

## Variables d'Environnement

```env
# Auth
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<mot_de_passe_fort>

# Serveur
N8N_HOST=mybestagent-n8n.onrender.com
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://mybestagent-n8n.onrender.com/

# Sécurité
N8N_ENCRYPTION_KEY=<clé_générée>

# Base de données PostgreSQL
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=<host>
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=<password>
```

## Configuration OAuth par Service

### Gmail / Google Calendar / Google Drive
1. Aller sur https://console.cloud.google.com
2. Créer un projet "MyBestAgent"
3. Activer les APIs: Gmail, Calendar, Drive
4. Créer des credentials OAuth 2.0
5. Redirect URI: `https://mybestagent-n8n.onrender.com/rest/oauth2-credential/callback`

### Slack
1. Aller sur https://api.slack.com/apps
2. Créer une app "MyBestAgent"
3. Ajouter les scopes nécessaires
4. Redirect URI: `https://mybestagent-n8n.onrender.com/rest/oauth2-credential/callback`

### GitHub
1. Aller sur https://github.com/settings/developers
2. Créer une OAuth App
3. Redirect URI: `https://mybestagent-n8n.onrender.com/rest/oauth2-credential/callback`

### LinkedIn
1. Aller sur https://www.linkedin.com/developers
2. Créer une app
3. Ajouter les produits: Sign In, Share on LinkedIn
4. Redirect URI: `https://mybestagent-n8n.onrender.com/rest/oauth2-credential/callback`

## Workflows à Créer

### 1. Gmail - Trier les mails
- Trigger: Webhook
- Actions: Gmail Read → Filter → Label

### 2. Calendar - Créer événement
- Trigger: Webhook
- Actions: Google Calendar Create Event

### 3. Slack - Envoyer message
- Trigger: Webhook
- Actions: Slack Send Message

### 4. LinkedIn - Publier post
- Trigger: Webhook
- Actions: LinkedIn Create Post

## Intégration avec Eva

Eva appelle les workflows via webhooks:
```
POST https://mybestagent-n8n.onrender.com/webhook/{workflow-name}
{
  "userId": "user-123",
  "action": "sort",
  "params": { ... }
}
```

## Test

1. Accéder à https://mybestagent-n8n.onrender.com
2. Se connecter avec les credentials admin
3. Créer un workflow test
4. Tester le webhook
