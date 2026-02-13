/**
 * AI Router - Intelligent model selection based on task complexity
 * 
 * Routes tasks to the most cost-effective AI model:
 * - Simple queries → Mistral/Haiku (cheap/free)
 * - Code/Analysis → GPT-3.5/Sonnet (mid-tier)
 * - Complex reasoning → GPT-4/Opus (premium)
 */

const Anthropic = require('@anthropic-ai/sdk');

// Model configurations with cost per 1M tokens
const MODELS = {
  // Free/Very cheap tier
  mistral: {
    provider: 'mistral',
    model: 'mistral-small-latest',
    inputCost: 0.1,
    outputCost: 0.3,
    maxTokens: 4096,
    tier: 'free'
  },
  haiku: {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    inputCost: 0.25,
    outputCost: 1.25,
    maxTokens: 4096,
    tier: 'cheap'
  },
  // Mid tier
  gpt35: {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    inputCost: 0.5,
    outputCost: 1.5,
    maxTokens: 4096,
    tier: 'mid'
  },
  sonnet: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    inputCost: 3,
    outputCost: 15,
    maxTokens: 8192,
    tier: 'mid'
  },
  // Premium tier
  gpt4: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    inputCost: 10,
    outputCost: 30,
    maxTokens: 4096,
    tier: 'premium'
  },
  opus: {
    provider: 'anthropic',
    model: 'claude-opus-4-5',
    inputCost: 15,
    outputCost: 75,
    maxTokens: 8192,
    tier: 'premium'
  }
};

// Task complexity patterns
const COMPLEXITY_PATTERNS = {
  simple: [
    /^(hi|hello|hey|bonjour|salut)/i,
    /what('s| is) (the )?(time|date|weather)/i,
    /thank(s| you)/i,
    /^(yes|no|ok|okay|sure|got it)/i,
    /how are you/i,
  ],
  code: [
    /\b(code|function|script|program|debug|error|bug|fix)\b/i,
    /\b(javascript|python|html|css|sql|api|json)\b/i,
    /\b(create|build|make|write).*(app|site|website|page)\b/i,
    /```/,
  ],
  analysis: [
    /\b(analyze|analyse|explain|compare|evaluate)\b/i,
    /\b(spreadsheet|data|report|chart|graph)\b/i,
    /\b(summarize|summary|digest)\b/i,
  ],
  complex: [
    /\b(architect|design|strategy|plan|roadmap)\b/i,
    /\b(research|investigate|deep dive)\b/i,
    /step.by.step/i,
    /\b(complex|difficult|challenging)\b/i,
  ]
};

/**
 * Analyze task complexity and return appropriate tier
 */
function analyzeComplexity(message) {
  const text = message.toLowerCase();
  const wordCount = text.split(/\s+/).length;
  
  // Very short messages = simple
  if (wordCount < 5) {
    for (const pattern of COMPLEXITY_PATTERNS.simple) {
      if (pattern.test(text)) return 'simple';
    }
  }
  
  // Check for complex patterns first (highest priority)
  for (const pattern of COMPLEXITY_PATTERNS.complex) {
    if (pattern.test(text)) return 'complex';
  }
  
  // Check for code patterns
  for (const pattern of COMPLEXITY_PATTERNS.code) {
    if (pattern.test(text)) return 'code';
  }
  
  // Check for analysis patterns
  for (const pattern of COMPLEXITY_PATTERNS.analysis) {
    if (pattern.test(text)) return 'analysis';
  }
  
  // Long messages tend to be more complex
  if (wordCount > 100) return 'analysis';
  if (wordCount > 50) return 'code';
  
  // Default to simple for short, unclassified messages
  return 'simple';
}

/**
 * Select the best model based on task complexity and user tier
 */
function selectModel(message, userTier = 'free') {
  const complexity = analyzeComplexity(message);
  
  // Free users: limited to cheap models
  if (userTier === 'free' || userTier === 'starter') {
    switch (complexity) {
      case 'simple':
        return MODELS.mistral;
      case 'code':
      case 'analysis':
        return MODELS.haiku;
      case 'complex':
        // Free users get Haiku even for complex tasks
        return MODELS.haiku;
      default:
        return MODELS.mistral;
    }
  }
  
  // Pro users: full access, smart routing
  switch (complexity) {
    case 'simple':
      return MODELS.haiku; // Still use cheap for simple
    case 'code':
      return MODELS.sonnet; // Good at code
    case 'analysis':
      return MODELS.sonnet;
    case 'complex':
      return MODELS.opus; // Premium for complex
    default:
      return MODELS.haiku;
  }
}

/**
 * Call the appropriate AI provider
 */
async function callModel(modelConfig, messages, systemPrompt) {
  const { provider, model, maxTokens } = modelConfig;
  
  switch (provider) {
    case 'anthropic':
      return await callAnthropic(model, messages, systemPrompt, maxTokens);
    case 'openai':
      return await callOpenAI(model, messages, systemPrompt, maxTokens);
    case 'mistral':
      return await callMistral(model, messages, systemPrompt, maxTokens);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Call Anthropic API
 */
async function callAnthropic(model, messages, systemPrompt, maxTokens) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt || 'You are a helpful AI assistant.',
    messages: messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }))
  });
  
  return {
    content: response.content[0].text,
    model,
    provider: 'anthropic',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(model, messages, systemPrompt, maxTokens) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
        ...messages
      ]
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI API error');
  }
  
  return {
    content: data.choices[0].message.content,
    model,
    provider: 'openai',
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens
    }
  };
}

/**
 * Call Mistral API
 */
async function callMistral(model, messages, systemPrompt, maxTokens) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful AI assistant.' },
        ...messages
      ]
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Mistral API error');
  }
  
  return {
    content: data.choices[0].message.content,
    model,
    provider: 'mistral',
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens
    }
  };
}

/**
 * Main router function - analyze, select, and call
 */
async function route(message, conversationHistory = [], options = {}) {
  const {
    userTier = 'free',
    systemPrompt = null,
    forceModel = null
  } = options;
  
  // Allow forcing a specific model
  const modelConfig = forceModel 
    ? MODELS[forceModel] 
    : selectModel(message, userTier);
  
  if (!modelConfig) {
    throw new Error(`Invalid model: ${forceModel}`);
  }
  
  // Prepare messages
  const messages = [
    ...conversationHistory,
    { role: 'user', content: message }
  ];
  
  // Call the model
  const result = await callModel(modelConfig, messages, systemPrompt);
  
  // Add routing metadata
  result.routing = {
    complexity: analyzeComplexity(message),
    tier: modelConfig.tier,
    userTier
  };
  
  return result;
}

/**
 * Estimate cost for a message
 */
function estimateCost(message, userTier = 'free') {
  const modelConfig = selectModel(message, userTier);
  const estimatedInputTokens = Math.ceil(message.length / 4);
  const estimatedOutputTokens = estimatedInputTokens * 2; // Rough estimate
  
  const inputCost = (estimatedInputTokens / 1_000_000) * modelConfig.inputCost;
  const outputCost = (estimatedOutputTokens / 1_000_000) * modelConfig.outputCost;
  
  return {
    model: modelConfig.model,
    tier: modelConfig.tier,
    estimatedCost: inputCost + outputCost,
    currency: 'USD'
  };
}

module.exports = {
  route,
  selectModel,
  analyzeComplexity,
  estimateCost,
  MODELS
};
