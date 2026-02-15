-- Knowledge Base Schema for Agent-SaaS
-- Stores Q&A pairs with embeddings for semantic search and reuse

-- Knowledge entries (cached Q&A pairs)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,

    -- Original question and answer
    question TEXT NOT NULL,
    answer TEXT NOT NULL,

    -- Embeddings for semantic search (stored as JSON array)
    question_embedding TEXT,  -- JSON array of floats

    -- Metadata
    category TEXT,            -- 'code', 'analysis', 'simple', 'complex'
    language TEXT DEFAULT 'en',
    quality_score REAL DEFAULT 0.0,  -- 0-1, based on user feedback
    use_count INTEGER DEFAULT 0,      -- How many times reused

    -- Source tracking
    original_model TEXT,      -- Which AI generated this
    original_cost REAL,       -- Cost in USD to generate

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,

    -- User who created (for attribution)
    created_by_user_id TEXT,

    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Cost tracking per request
CREATE TABLE IF NOT EXISTS cost_tracking (
    id TEXT PRIMARY KEY,

    -- Request info
    user_id TEXT NOT NULL,
    request_type TEXT,        -- 'chat', 'image', 'audio', etc.

    -- Model used
    provider TEXT NOT NULL,   -- 'anthropic', 'openai', 'mistral', etc.
    model TEXT NOT NULL,

    -- Token counts
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,

    -- Costs
    cost_usd REAL NOT NULL,   -- Actual cost to us
    price_usd REAL,           -- What we charge user (if applicable)
    margin_usd REAL,          -- price - cost
    margin_percent REAL,      -- margin / price * 100

    -- Cache info
    from_cache BOOLEAN DEFAULT FALSE,
    cache_hit_id TEXT,        -- Reference to knowledge_base if from cache

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cache_hit_id) REFERENCES knowledge_base(id) ON DELETE SET NULL
);

-- Daily cost aggregates (for dashboards)
CREATE TABLE IF NOT EXISTS cost_daily_stats (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,

    -- Totals
    total_requests INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0,
    total_revenue_usd REAL DEFAULT 0,
    total_margin_usd REAL DEFAULT 0,

    -- Cache stats
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    cache_savings_usd REAL DEFAULT 0,

    -- By provider
    anthropic_cost REAL DEFAULT 0,
    openai_cost REAL DEFAULT 0,
    mistral_cost REAL DEFAULT 0,
    other_cost REAL DEFAULT 0,

    UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_quality ON knowledge_base(quality_score);
CREATE INDEX IF NOT EXISTS idx_knowledge_use_count ON knowledge_base(use_count);
CREATE INDEX IF NOT EXISTS idx_cost_user ON cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_created ON cost_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_provider ON cost_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_daily_date ON cost_daily_stats(date);
