require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn: '30d',
    
    // Anthropic
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: 'claude-3-5-haiku-20241022',
    
    // OpenAI (Whisper for transcription, TTS for voice responses)
    openaiApiKey: process.env.OPENAI_API_KEY,
    
    // Telegram
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN, // Master bot for onboarding
    
    // Sentry (optional, for error tracking)
    sentryDsn: process.env.SENTRY_DSN,
    
    // Plans
    plans: {
        free: { messagesLimit: 50, features: ['search', 'reminders'] },
        perso: { messagesLimit: 2000, features: ['all'] },
        pro: { messagesLimit: 10000, features: ['all', 'code', 'api'] }
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 30 // requests per window
    }
};
