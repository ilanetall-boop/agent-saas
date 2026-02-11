# Smart Error Recovery System

## Concept

Au lieu de crash sur erreur, l'agent applique une stratégie intelligente:

```
❌ Erreur détectée
  ↓
📊 Classifier
  ├→ TRANSIENT (timeout, 500) → Retry (1s, 2s, 4s)
  ├→ LOGIC (parse fail, 404) → Try alternative
  └→ BLOCKED (401, 403) → Ask user
```

---

## 3-Tier Strategy

### Tier 1: RETRY (Transient Errors)

**Détecte**: Timeout, connexion perdue, HTTP 500+, Rate limit

**Stratégie**: Exponential backoff
- Tentative 1 → 1 sec
- Tentative 2 → 2 sec
- Tentative 3 → 4 sec

**Exemple**:
```javascript
try {
  const result = await fetch('https://api.example.com/data');
  if (result.status === 500) {
    // ErrorClassifier → TRANSIENT
    // ErrorRecovery → Retry with backoff
    return result;
  }
} catch (timeout) {
  // TRANSIENT (timeout)
  // Auto-retry 3 times
}
```

---

### Tier 2: ALTERNATIVE (Logic Errors)

**Détecte**: Parse failed, selector not found, 4xx errors

**Stratégies** (dans l'ordre):
1. Try alternative CSS selector
2. Try XPath method
3. Try alternative endpoint/version

**Exemple**:
```javascript
try {
  const data = JSON.parse(response); // Parse fails
  // ErrorClassifier → LOGIC
  // ErrorRecovery → Try alternative parsing method
} catch (parseError) {
  // Try: JSON.parse → XML → CSV
}
```

---

### Tier 3: ASK USER (Blocked Errors)

**Détecte**: 401, 403, auth failed, API key invalid, quota exceeded

**Stratégie**: Return detailed error + ask user

**Exemple**:
```javascript
try {
  const result = await apiCall({ auth: token });
  if (result.status === 401) {
    // ErrorClassifier → BLOCKED
    // ErrorRecovery → Ask user
    return {
      type: 'REQUIRES_USER_INPUT',
      error: 'Token invalide',
      suggestions: ['Regénérer API key', 'Vérifier expiry']
    }
  }
} catch (authError) {
  // BLOCKED (auth failed)
  // Need user action
}
```

---

## Usage Pattern

### In Agent Service

```javascript
const errorRecovery = require('./error-recovery');

async function performAction(url, selector) {
  try {
    // Original action
    return await browser.click(selector);
  } catch (error) {
    // Handle with smart recovery
    return await errorRecovery.handle(error, {
      fn: () => browser.click(selector), // For retry
      url: url,
      originalSelector: selector,
      browser: browser
    });
  }
}
```

### For Retry

```javascript
const result = await errorRecovery.handle(error, {
  fn: async () => {
    return await apiCall(endpoint, data);
  }
});
```

### For Alternative

```javascript
const result = await errorRecovery.handle(error, {
  browser: page,
  url: 'https://example.com',
  originalSelector: '.old-selector'
});
```

### For Blocked

```javascript
const result = await errorRecovery.handle(error, {
  url: 'https://api.example.com',
  message: 'Mon API key est peut-être expiré'
});
```

---

## Classification Examples

| Error | Classified As | Action |
|-------|---------------|--------|
| `ECONNREFUSED` | TRANSIENT | Retry 3x |
| `HTTP 503` | TRANSIENT | Retry 3x |
| `JSON.parse failed` | LOGIC | Try alternative |
| `selector not found` | LOGIC | Try alternative |
| `HTTP 401` | BLOCKED | Ask user |
| `API key invalid` | BLOCKED | Ask user |
| Unknown | UNKNOWN | Retry 2x |

---

## Response Format

### Success
```json
{
  "success": true,
  "used": "alternative_selector: .btn"
}
```

### Retry Exhausted
```json
{
  "success": false,
  "error": "Connection timeout after 3 retries",
  "type": "RETRY_EXHAUSTED",
  "recommendation": "❌ Tous les tentatives ont échoué. Vérifiez votre connexion internet."
}
```

### Alternative Failed
```json
{
  "success": false,
  "error": "Element not found",
  "type": "ALTERNATIVE_FAILED",
  "recommendation": "⚠️ Toutes les approches alternatives ont échoué."
}
```

### Requires User Input
```json
{
  "success": false,
  "error": "Unauthorized (401)",
  "type": "REQUIRES_USER_INPUT",
  "recommendation": "❓ Je suis bloqué et j'ai besoin de ton aide.",
  "details": {
    "problem": "Authentication failed",
    "suggestions": [
      "Vérifier les identifiants",
      "Vérifier la limite API",
      "Vérifier les permissions"
    ]
  }
}
```

---

## Test Cases

### Test 1: Transient Error → Success

```javascript
// Mock a timeout error that resolves on retry
let attempts = 0;
const fn = async () => {
  attempts++;
  if (attempts < 3) throw new Error('Connection timeout');
  return { success: true };
};

const result = await errorRecovery.handle(
  new Error('Connection timeout'),
  { fn }
);

console.assert(result.success === true);
console.assert(attempts === 3);
```

### Test 2: Logic Error → Alternative

```javascript
const result = await errorRecovery.handle(
  new Error('Element not found'),
  { browser: page, url: 'https://example.com' }
);

console.assert(result.type === 'ALTERNATIVE_FAILED' || result.success === true);
```

### Test 3: Blocked Error → Ask User

```javascript
const result = await errorRecovery.handle(
  new Error('Authorization failed'),
  { url: 'https://api.example.com' }
);

console.assert(result.type === 'REQUIRES_USER_INPUT');
console.assert(result.details.suggestions.length > 0);
```

---

## Integration Checklist

- [x] `error-classifier.js` created (pattern matching)
- [x] `error-recovery.js` created (recovery logic)
- [ ] Integrate into `agent.js` (apply to all API calls)
- [ ] Integrate into `browser.js` (apply to Puppeteer actions)
- [ ] Add logging/monitoring
- [ ] Test all 3 tiers
- [ ] Document user-facing error messages

---

## Next Steps

1. Import errorRecovery into agent.js
2. Wrap all API calls with error recovery
3. Wrap all Puppeteer actions with error recovery
4. Test each tier (retry, alternative, ask)
5. Deploy and monitor
