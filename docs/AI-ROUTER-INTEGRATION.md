# AI Router Integration Guide

## Overview
The AI Router (`src/api/ai-router.js`) provides intelligent multi-model routing to optimize cost and performance.

## How it Works

1. **Complexity Analysis**: Analyzes each message to determine complexity (simple/code/analysis/complex)
2. **Model Selection**: Routes to the optimal model based on complexity + user tier
3. **Cost Optimization**: Free users get cheap models, Pro users get smart routing

## Models Supported

| Model | Provider | Tier | Best For |
|-------|----------|------|----------|
| Mistral Small | Mistral | Free | Simple queries |
| Claude Haiku | Anthropic | Cheap | Basic tasks |
| GPT-3.5 Turbo | OpenAI | Mid | Code, analysis |
| Claude Sonnet | Anthropic | Mid | Complex code |
| GPT-4 Turbo | OpenAI | Premium | Complex reasoning |
| Claude Opus | Anthropic | Premium | Most complex tasks |

## Integration Steps

### 1. Add to agents.js

```javascript
// At top of file
const aiRouter = require('../ai-router');

// Replace generateResponse call with:
const routerResult = await aiRouter.route(message, history, {
  userTier: req.user.tier || 'free', // 'free' or 'pro'
  systemPrompt: systemPrompt
});

// Use result
const response = {
  success: true,
  content: routerResult.content,
  model: routerResult.model,
  usage: routerResult.usage
};
```

### 2. Add Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...
```

### 3. Update User Model

Add `tier` field to users table:
```sql
ALTER TABLE users ADD COLUMN tier VARCHAR(20) DEFAULT 'free';
```

### 4. Update Frontend

Show which model was used:
```javascript
// In chat response
console.log(`Used: ${response.model}`);
```

## Cost Estimates

| User Tier | Avg Cost/Message |
|-----------|-----------------|
| Free (Starter) | ~$0.0001 |
| Pro | ~$0.005 (varies by task) |

## Testing

```javascript
const { route, estimateCost } = require('./ai-router');

// Test routing
const result = await route("Hello!", [], { userTier: 'free' });
console.log(result.model); // 'mistral-small-latest'

// Test cost estimation
const cost = estimateCost("Build me a website", 'pro');
console.log(cost); // { model: 'claude-3-5-sonnet-...', estimatedCost: 0.002 }
```

## Notes

- The router is designed to be non-breaking
- Can be enabled gradually (feature flag)
- Fallback to current behavior if router fails
