/**
 * My Best Agent - Desktop App UI Controller
 * Handles chat, file management, and settings
 */

class DesktopApp {
    constructor() {
        this.currentView = 'chat';
        this.messages = [];
        this.authToken = null;
        this.userData = null;
        this.init();
    }

    async init() {
        // Load authentication
        await this.loadAuth();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadUserData();
        
        // Check for updates
        this.checkUpdates();
    }

    async loadAuth() {
        try {
            const result = await window.api.auth.getToken();
            if (result.success) {
                this.authToken = result.token;
            }
        } catch (error) {
            console.error('Auth load error:', error);
            // Redirect to login if no token
            window.location.href = '/auth/login';
        }
    }

    async loadUserData() {
        try {
            const result = await window.api.api.call('GET', '/api/auth/me', null, this.authToken);
            if (result.success) {
                this.userData = result.data;
                document.getElementById('userName').textContent = result.data.name || 'User';
                document.getElementById('settingsEmail').textContent = result.data.email || 'N/A';
            }
        } catch (error) {
            console.error('User data error:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.closest('.nav-item').dataset.view));
        });

        // Chat
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const clearBtn = document.getElementById('clearBtn');

        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        clearBtn.addEventListener('click', () => this.clearHistory());

        // File drop zone
        const dropZone = document.getElementById('dropZone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFileDrop(e.dataTransfer.files);
        });

        // Settings
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('checkUpdateBtn').addEventListener('click', () => this.checkUpdates());

        // Sidebar toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
    }

    switchView(viewName) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update active view
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.dataset.view === viewName);
        });

        this.currentView = viewName;

        // Handle specific views
        if (viewName === 'files') {
            this.loadFileExplorer();
        }

        if (viewName === 'settings') {
            this.loadSettings();
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (!message) return;

        // Clear input
        input.value = '';

        // Add user message to UI
        this.addMessage(message, 'user');

        // Show typing indicator
        this.showTyping();

        try {
            // Send to backend
            const result = await window.api.api.call('POST', '/api/agent/chat', {
                message: message,
                platform: 'desktop'
            }, this.authToken);

            // Remove typing indicator
            this.removeTyping();

            if (result.success) {
                const { reply, actions } = result.data;
                
                // Add assistant response
                this.addMessage(reply, 'assistant');

                // Handle actions
                if (actions && actions.length > 0) {
                    await this.handleActions(actions);
                }
            } else {
                this.addMessage(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            this.removeTyping();
            this.addMessage(`Error: ${error.message}`, 'error');
            console.error('Message send error:', error);
        }

        // Focus back to input
        document.getElementById('messageInput').focus();
    }

    addMessage(text, role) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${role}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';

        // Parse markdown-like formatting
        text = text.replace(/```(.*?)\n([\s\S]*?)```/g, 
            `<div class="message-code"><pre>$2</pre></div>`);
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        contentEl.innerHTML = text;
        messageEl.appendChild(contentEl);
        messagesContainer.appendChild(messageEl);

        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.messages.push({ role, text });
    }

    showTyping() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingEl = document.createElement('div');
        typingEl.className = 'message assistant';
        typingEl.id = 'typing-indicator';
        typingEl.innerHTML = `
            <div class="message-content">
                <div style="display: flex; gap: 4px;">
                    <span style="width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; animation: typing 1.4s infinite;"></span>
                    <span style="width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; animation: typing 1.4s infinite 0.2s;"></span>
                    <span style="width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; animation: typing 1.4s infinite 0.4s;"></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTyping() {
        const typingEl = document.getElementById('typing-indicator');
        if (typingEl) typingEl.remove();
    }

    clearHistory() {
        if (confirm('Clear chat history?')) {
            document.getElementById('chatMessages').innerHTML = '';
            this.messages = [];
            this.addMessage('Chat history cleared. Start a new conversation!', 'system');
        }
    }

    async handleActions(actions) {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'create_file':
                        await this.handleCreateFile(action);
                        break;
                    case 'open_url':
                        await this.handleOpenUrl(action);
                        break;
                    case 'execute_command':
                        await this.handleExecuteCommand(action);
                        break;
                }
            } catch (error) {
                console.error('Action error:', error);
            }
        }
    }

    async handleCreateFile(action) {
        try {
            const result = await window.api.files.write(action.path, action.content);
            if (result.success) {
                this.addMessage(`✅ File created: ${action.path}`, 'system');
            }
        } catch (error) {
            this.addMessage(`❌ Failed to create file: ${error.message}`, 'error');
        }
    }

    async handleOpenUrl(action) {
        try {
            await window.api.exec.openUrl(action.url);
            this.addMessage(`🔗 Opened: ${action.label}`, 'system');
        } catch (error) {
            this.addMessage(`❌ Failed to open URL: ${error.message}`, 'error');
        }
    }

    async handleExecuteCommand(action) {
        try {
            const result = await window.api.exec.run(action.command);
            if (result.success) {
                this.addMessage(`✅ Command executed:\n\`\`\`\n${result.output}\n\`\`\``, 'system');
            }
        } catch (error) {
            this.addMessage(`❌ Command failed: ${error.message}`, 'error');
        }
    }

    async handleFileDrop(files) {
        const fileList = Array.from(files).map(f => f.name).join(', ');
        this.addMessage(`📎 Files uploaded: ${fileList}`, 'system');
        
        // In a real app, you'd upload these to the backend
        console.log('Files dropped:', files);
    }

    async loadFileExplorer() {
        try {
            const homeResult = await window.api.system.home();
            if (homeResult.success) {
                this.displayDirectory(homeResult.path);
            }
        } catch (error) {
            console.error('File explorer error:', error);
        }
    }

    async displayDirectory(dirPath) {
        try {
            const result = await window.api.files.list(dirPath);
            if (result.success) {
                const fileList = document.getElementById('fileList');
                fileList.innerHTML = '';

                result.files.forEach(file => {
                    const fileEl = document.createElement('div');
                    fileEl.className = 'file-item';
                    fileEl.innerHTML = `
                        <div class="file-icon">${file.isDirectory ? '📁' : '📄'}</div>
                        <div class="file-name">${file.name}</div>
                    `;
                    
                    fileEl.addEventListener('dblclick', () => {
                        if (file.isDirectory) {
                            this.displayDirectory(file.path);
                        } else {
                            window.api.exec.open(file.path);
                        }
                    });

                    fileList.appendChild(fileEl);
                });
            }
        } catch (error) {
            console.error('Directory listing error:', error);
        }
    }

    async loadSettings() {
        try {
            const sysInfo = await window.api.system.getInfo();
            if (sysInfo.success) {
                document.getElementById('appVersion').textContent = `v${sysInfo.info.appVersion}`;
            }
        } catch (error) {
            console.error('Settings load error:', error);
        }
    }

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                await window.api.api.call('POST', '/api/auth/logout', {}, this.authToken);
                window.location.href = '/auth/login';
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    }

    async checkUpdates() {
        try {
            const result = await window.api.app.checkUpdates();
            if (result.success) {
                if (result.hasUpdate) {
                    alert(`New version available: ${result.latestVersion}\n\nClick OK to download.`);
                    window.api.exec.openUrl(result.downloadUrl);
                } else {
                    alert('You are on the latest version!');
                }
            }
        } catch (error) {
            console.error('Update check error:', error);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DesktopApp();
});
