const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDb } = require('./db/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agent', require('./routes/agents'));
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

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
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
   
   Endpoints:
   Auth:
   - POST /api/auth/register
   - POST /api/auth/login
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
