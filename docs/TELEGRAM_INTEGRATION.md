# Telegram Integration Guide

## Overview

The Telegram integration allows users to link their agent-saas agents to Telegram, enabling real-time conversations with their AI assistant via Telegram.

## Features

### 1. **Webhook Support**
- Receive Telegram updates via webhook or polling
- Automatically routes messages to the appropriate agent
- Handles commands and callback queries

### 2. **Message Handling**
- Receives messages from Telegram users
- Generates responses using Claude AI
- Stores conversation history in the database
- Splits long messages (>4096 chars) into multiple parts

### 3. **Agent Linking**
- Link an existing agent to a Telegram chat
- Store Telegram bot token and chat ID
- Support for multiple agents with different bots

### 4. **Built-in Commands**
- `/start` - Welcome message
- `/help` - Show available commands
- `/memory` - View what the agent knows about you
- `/reset` - Start a new conversation

## Setup

### Prerequisites

1. **Telegram Bot Token**
   - Create a bot with [@BotFather](https://t.me/botfather) on Telegram
   - Get your bot token

2. **Environment Variables**
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

### Installation

1. **Dependencies** are already included:
   ```json
   "node-telegram-bot-api": "^0.64.0"
   ```

2. **File Structure**
   ```
   src/api/
   ├── services/telegram.js      # Bot logic and message handling
   └── routes/telegram.js        # API endpoints
   ```

## API Endpoints

### Link Agent to Telegram
```
POST /api/telegram/link
Content-Type: application/json
Authorization: Bearer {token}

{
  "botToken": "your_telegram_bot_token",
  "chatId": 123456789,
  "webhookUrl": "https://yourdomain.com/api/telegram/webhook/:agentId" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Telegram lié avec succès",
  "agent": {
    "id": "agent_id",
    "name": "Agent Name",
    "telegramConnected": true
  }
}
```

### Get Connection Status
```
GET /api/telegram/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "connected": true,
  "isRunning": true,
  "chatId": "123456789",
  "agentName": "My Agent"
}
```

### Get Connection Info
```
GET /api/telegram/info
Authorization: Bearer {token}
```

**Response:**
```json
{
  "connected": true,
  "chatId": "123456789",
  "botTokenSet": true,
  "agentName": "My Agent",
  "agentId": "agent_id"
}
```

### Send Message via Telegram
```
POST /api/telegram/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "message": "Hello from the app!"
}
```

### Initialize Bot
```
POST /api/telegram/init
Content-Type: application/json
Authorization: Bearer {token}

{
  "botToken": "your_telegram_bot_token",
  "webhookUrl": "https://yourdomain.com/api/telegram/webhook/:agentId" // optional
}
```

### Disconnect/Stop Bot
```
POST /api/telegram/disconnect
Authorization: Bearer {token}
```

### Webhook Endpoint
```
POST /api/telegram/webhook/:agentId
Content-Type: application/json

{
  "message": {
    "chat": { "id": 123456789 },
    "from": { "id": 987654321, "first_name": "John" },
    "text": "Hello!"
  }
}
```

## How It Works

### Message Flow

1. **User sends message on Telegram** → Bot receives it
2. **Message is routed to handler** → Looks up agent ID from chat ID
3. **Conversation history retrieved** → Last 10 messages
4. **Claude generates response** → Using agent's system prompt and memories
5. **Response sent back to Telegram** → User receives answer

### Polling vs Webhook

**Polling Mode (Default)**
- Bot continuously asks Telegram for new messages
- Simpler setup, no external URL needed
- Slightly higher latency and API usage

```javascript
const bot = new TelegramBot(botToken, { polling: true });
```

**Webhook Mode**
- Telegram sends updates to your server directly
- Lower latency, efficient
- Requires public HTTPS URL

```javascript
const bot = new TelegramBot(botToken, { 
  webHook: { port: process.env.PORT || 3000 } 
});
```

## Usage Example

### In a Frontend App

```javascript
// Link agent to Telegram
async function linkTelegram(botToken, chatId) {
  const response = await fetch('/api/telegram/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      botToken,
      chatId
    })
  });
  return response.json();
}

// Check connection status
async function checkStatus() {
  const response = await fetch('/api/telegram/status', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  return response.json();
}

// Send message
async function sendMessage(message) {
  const response = await fetch('/api/telegram/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ message })
  });
  return response.json();
}
```

## Database Schema

The following fields are used in the `agents` table:

```sql
CREATE TABLE agents (
  ...
  telegram_bot_token TEXT,    -- Telegram bot API token
  telegram_chat_id TEXT,      -- Telegram chat ID
  ...
);
```

Additional table used:

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  channel TEXT DEFAULT 'telegram',  -- Track where conversation came from
  created_at DATETIME,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,        -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at DATETIME,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

## Error Handling

The service handles various errors gracefully:

- **Bot initialization failure** - Returns error message
- **Telegram API errors** - Logs to console and sends fallback message
- **Message too long** - Automatically splits into multiple parts
- **Conversation creation** - Creates new conversation if none exists
- **Missing agent** - Returns 404 error

## Memory Integration

The service integrates with the agent's memory system:

```javascript
// Get agent's memories
const memories = db.getAllMemories(agentId);
const memoryMap = {};
memories.forEach(m => { memoryMap[m.key] = m.value; });

// Use in Claude prompt
const systemPrompt = getDefaultSystemPrompt(agent.name, memoryMap.name);
```

## Rate Limiting

Currently uses the global rate limiter from `config.js`:
- 30 requests per minute per IP

Consider implementing Telegram-specific rate limiting based on chat ID if needed.

## Security Considerations

1. **Bot Token Storage**
   - Stored in database as plain text (consider encryption)
   - Never expose in frontend

2. **Chat ID Verification**
   - Verify chat ID belongs to authenticated user
   - Implement additional security checks if needed

3. **Message Content**
   - Messages are stored in database (clear on request)
   - Consider GDPR implications

4. **Webhook Validation**
   - In webhook mode, validate requests come from Telegram
   - Use bot token for verification if implemented

## Troubleshooting

### Bot not responding
- Check bot token is correct
- Verify `TELEGRAM_BOT_TOKEN` in environment
- Check server logs for errors

### Polling not working
- Ensure `polling: true` in bot options
- Check network connectivity
- Verify bot token in database

### Webhook not receiving updates
- Ensure HTTPS is used (Telegram requirement)
- Verify domain is reachable
- Check webhook URL format

### Messages not being saved
- Verify database is initialized
- Check agent ID is correct
- Check conversation creation

## Future Enhancements

- [ ] Message persistence improvements
- [ ] Telegram user linking to user accounts
- [ ] Rich message formatting (markdown, buttons)
- [ ] Voice message support
- [ ] Sticker handling
- [ ] Inline keyboard support
- [ ] File/media handling
- [ ] Webhook security validation
- [ ] Bot token encryption

## Support

For issues or questions, check the main agent-saas documentation.
