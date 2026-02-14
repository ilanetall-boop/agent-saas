const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const helmet = require('helmet');
const config = require('./config');
const { initDb } = require('./db/db');

// Initialize Sentry for error tracking (if SENTRY_DSN is set)
if (config.sentryDsn) {
    Sentry.init({
        dsn: config.sentryDsn,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 0.1,
    });
    console.log('✅ Sentry initialized');
} else {
    console.log('⚠️ Sentry DSN not set - error tracking disabled');
}

const app = express();

// Security Headers (Helmet) - Custom CSP to allow external scripts only
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https:"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
        }
    }
}));

// Rate Limiters
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Trop de requêtes, réessayez dans 15 minutes',
    standardHeaders: false, // Don't return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable RateLimit-* headers
    skip: (req) => req.path === '/api/health' // Don't rate limit health checks
});

// CORS Configuration (restrict to allowed origins only)
const allowedOrigins = [
    'https://mybestagent.io',
    'https://www.mybestagent.io',
    'https://agent-saas.onrender.com',
    'http://localhost:3000' // Development only
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy: origin not allowed'));
        }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
}));

// Request ID middleware (for error tracking)
app.use((req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    next();
});

// Middleware
app.use(express.json());
app.use(cookieParser()); // Parse cookies (for refresh token)

// HTTPS redirect (production only)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.header('host')}${req.url}`);
        }
        next();
    });
}

app.use('/api/', globalLimiter); // Apply global limiter to all API routes

// Sentry error tracking middleware
if (config.sentryDsn) {
    app.use(Sentry.Handlers.requestHandler());
}

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agent', require('./routes/agents'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/telegram', require('./routes/telegram'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve static files (landing page)
app.use(express.static(path.join(__dirname, '../../')));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
});

// Sentry error tracking middleware (must be after all other middleware/routes)
if (config.sentryDsn) {
    app.use(Sentry.Handlers.errorHandler());
}

// Error handler (must be after all other middleware and routes)
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const requestId = req.id || Math.random().toString(36).substr(2, 9);
    
    // Log full error server-side (with context)
    console.error('[ERROR]', {
        requestId,
        message: err.message,
        status: err.status || 500,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
        stack: err.stack
    });
    
    // Report to Sentry if enabled
    if (config.sentryDsn) {
        Sentry.captureException(err, {
            tags: { requestId, path: req.path }
        });
    }
    
    // Determine status code
    const statusCode = err.statusCode || err.status || 500;
    
    // Return generic error to user in production
    // Show details only in development
    res.status(statusCode).json({
        error: isProduction 
            ? 'Une erreur est survenue. Veuillez réessayer.' 
            : err.message,
        ...(isProduction ? { requestId } : { stack: err.stack }) // Support ticket reference
    });
});

// Start server after DB init
async function start() {
    try {
        await initDb();
        
        app.listen(config.port, () => {
            console.log(`
🚀 Agent SaaS server running

   Local:    http://localhost:${config.port}
   API:      http://localhost:${config.port}/api
   
   ✨ DUAL-TOKEN AUTHENTICATION (Access + Refresh)
   
   Endpoints:
   Auth (Dual-Token):
   - POST /api/auth/register  (returns: accessToken + refreshToken)
   - POST /api/auth/login     (returns: accessToken + refreshToken)
   - POST /api/auth/refresh   (returns: new accessToken, expires in 30 min)
   - POST /api/auth/logout    (revokes refresh token)
   - GET  /api/auth/me
   
   Agent:
   - GET  /api/agent/me
   - POST /api/agent/chat
   - POST /api/agent/memory
   
   Telegram:
   - POST /api/telegram/link
   - GET  /api/telegram/status
   - GET  /api/telegram/info
   - POST /api/telegram/send
   - POST /api/telegram/init
   - POST /api/telegram/disconnect
   - POST /api/telegram/webhook/:agentId
   
   Health:
   - GET  /api/health
`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

module.exports = app;
