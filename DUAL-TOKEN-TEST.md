# Test Dual-Token Authentication

## Vue d'ensemble

Nouveau système: Access Token (court, 30 min) + Refresh Token (long, 90 jours)

**Avant**: JWT 30 jours → Day 31 = utilisateur kick-out ❌  
**Après**: JWT + refresh → Day 30 renouvelle automatiquement → Day 90 re-login ✅

---

## Endpoints Testables

### 1. Register (Obtenir tokens initiaux)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepass123",
    "name": "Test User"
  }'
```

**Réponse**:
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",  // 30 min expiry
  "refreshToken": "eyJhbGc...", // 90 jours expiry
  "expiresIn": 1800,              // 30 min in seconds
  "user": { ... },
  "agent": { ... }
}
```

---

### 2. Login (Obtenir tokens)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepass123"
  }'
```

**Réponse**: Identique à Register

---

### 3. Get Current User (Avec accessToken)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Important**: Utiliser l'accessToken, pas le refreshToken!

---

### 4. Refresh Access Token (NEW!)

Quand l'accessToken approche l'expiry ou après 30 min:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

**Réponse**:
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",  // Nouveau token (30 min from now)
  "expiresIn": 1800
}
```

**Ou avec cookie**: Si le refreshToken est stocké en cookie HTTPOnly
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=<REFRESH_TOKEN>"
```

---

### 5. Logout (Révoquer refresh token)

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Réponse**:
```json
{
  "success": true,
  "message": "Déconnecté avec succès"
}
```

---

## Workflow Typique (SPA/Mobile)

```
1. User login
   → GET accessToken (30 min) + refreshToken (90 jours)
   → Store accessToken in memory
   → Store refreshToken in secure cookie OR localStorage

2. Make API request
   → POST /api/agent/chat with "Authorization: Bearer <accessToken>"
   
3. If 401 (token expired)
   → POST /api/auth/refresh with refreshToken
   → Get new accessToken
   → Retry original request
   
4. If refresh fails (401)
   → refreshToken expired (>90 jours)
   → Redirect to login
```

---

## Sécurité

| Property | Access Token | Refresh Token |
|----------|--------------|---------------|
| Durée | 30 minutes | 90 jours |
| Stockage | Memory (volatile) | Cookie HTTPOnly (sûr) |
| Utilisation | Toutes les requêtes API | Seulement /refresh |
| Révocation | Auto à expiry | POST /logout |
| Exposé si token volé | 30 min max damage | 90 jours = plus critique |

---

## Implémentation Client (JavaScript)

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken, refreshToken } = await loginResponse.json();

// Store
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 2. API request avec refresh auto
async function apiCall(endpoint, options = {}) {
  let accessToken = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers
  };
  
  let response = await fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers
  });
  
  // Si 401 = token expiré, refresh et retry
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const refreshResponse = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const { accessToken: newAccessToken } = await refreshResponse.json();
    localStorage.setItem('accessToken', newAccessToken);
    
    // Retry avec nouveau token
    headers['Authorization'] = `Bearer ${newAccessToken}`;
    response = await fetch(`http://localhost:3000${endpoint}`, {
      ...options,
      headers
    });
  }
  
  return response.json();
}

// 3. Usage
const data = await apiCall('/api/agent/chat', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Hello' })
});

// 4. Logout
await fetch('http://localhost:3000/api/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
});

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

---

## Résumé des Changements

| Fichier | Changement |
|---------|-----------|
| `middleware/auth.js` | ✅ Ajouté `generateDualTokens()` + `refreshAccessToken()` |
| `routes/auth.js` | ✅ Modifié `/register`, `/login` + Ajouté `/refresh`, `/logout` |
| `server.js` | ✅ Ajouté cookie-parser |
| `package.json` | ✅ Ajouté cookie-parser |
| `db/postgres.js` | ✅ Ajouté `saveRefreshToken()`, `getRefreshToken()`, `deleteRefreshToken()` |
| `db/schema-postgres.sql` | ✅ Ajouté table `refresh_tokens` |

---

## Prochaines Étapes

- ✅ Dual-token implementation complète
- ⏳ Smart Error Recovery (dernière tâche, 4h)
- ⏳ Testing complet avant launch
- ⏳ Déploiement sur Render avec PostgreSQL
