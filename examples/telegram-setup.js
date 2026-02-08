/**
 * Example: Setting up Telegram integration for agent-saas
 * 
 * This shows how to use the Telegram service and routes
 */

// Example 1: Initialize bot directly (in backend)
const telegramService = require('../src/api/services/telegram');

async function setupBotForAgent() {
    const agentId = 'user-123';
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const result = await telegramService.initBot({
        agentId,
        botToken,
        webhookUrl: null // Use polling instead
    });

    if (result.success) {
        console.log('✅ Bot initialized for agent:', agentId);
    } else {
        console.error('❌ Error:', result.error);
    }
}

// Example 2: Link a Telegram chat to an agent (via API)
const axios = require('axios');

async function linkTelegramViaAPI() {
    const authToken = 'your_jwt_token';
    const botToken = 'your_telegram_bot_token';
    const chatId = 123456789; // Telegram chat ID

    try {
        const response = await axios.post(
            'http://localhost:3000/api/telegram/link',
            {
                botToken,
                chatId
            },
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Telegram linked:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Example 3: Get Telegram connection status
async function getStatus() {
    const authToken = 'your_jwt_token';

    try {
        const response = await axios.get(
            'http://localhost:3000/api/telegram/status',
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );

        console.log('📊 Status:', response.data);
        // {
        //   connected: true,
        //   isRunning: true,
        //   chatId: '123456789',
        //   agentName: 'My Agent'
        // }
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Example 4: Send message via Telegram
async function sendMessageViaAPI() {
    const authToken = 'your_jwt_token';
    const message = 'Hello from the application!';

    try {
        const response = await axios.post(
            'http://localhost:3000/api/telegram/send',
            { message },
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Message sent:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Example 5: Disconnect Telegram bot
async function disconnectTelegram() {
    const authToken = 'your_jwt_token';

    try {
        const response = await axios.post(
            'http://localhost:3000/api/telegram/disconnect',
            {},
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );

        console.log('✅ Telegram disconnected:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Example 6: Frontend integration (TypeScript/React example)
/*
// In your React component:

import { useState } from 'react';

function TelegramLinkComponent() {
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLink = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/telegram/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    botToken,
                    chatId: parseInt(chatId)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to link Telegram');
            }

            const data = await response.json();
            console.log('✅ Linked:', data);
            // Show success message
        } catch (err) {
            setError(err.message);
            console.error('❌ Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Telegram Bot Token"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
            />
            <input
                type="number"
                placeholder="Chat ID"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
            />
            <button onClick={handleLink} disabled={loading}>
                {loading ? 'Linking...' : 'Link Telegram'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default TelegramLinkComponent;
*/

// Example 7: How Telegram messages flow through the system
/*
1. User sends message on Telegram:
   "What's the weather?"

2. Bot receives update (polling or webhook):
   {
     message: {
       chat: { id: 123456789 },
       from: { id: 987654321, first_name: "John" },
       text: "What's the weather?"
     }
   }

3. telegram.js handleMessage():
   - Gets or creates conversation
   - Retrieves conversation history
   - Gets agent's memories
   - Calls generateResponse() with Claude

4. Claude generates response:
   "I don't have real-time weather data, but I can help you..."

5. Response stored and sent back to Telegram

6. User sees response in Telegram chat
*/

// Example 8: Environment setup
/*
.env file should contain:

TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

Optional for webhook mode:
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook

Other variables:
PORT=3000
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-secret-key
DB_PATH=./data/agent-saas.db
*/

console.log(`
Telegram Integration Examples
==============================

This file shows how to use the Telegram service.

To use these examples:

1. Set up a Telegram bot (@BotFather)
2. Get your bot token and chat ID
3. Set TELEGRAM_BOT_TOKEN in .env
4. Call the functions above

Functions:
- setupBotForAgent() - Initialize bot
- linkTelegramViaAPI() - Link chat to agent
- getStatus() - Check connection status
- sendMessageViaAPI() - Send message
- disconnectTelegram() - Stop bot

See docs/TELEGRAM_INTEGRATION.md for full documentation.
`);

module.exports = {
    setupBotForAgent,
    linkTelegramViaAPI,
    getStatus,
    sendMessageViaAPI,
    disconnectTelegram
};
