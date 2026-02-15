const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const axios = require('axios');
require('dotenv').config();

let mainWindow;

// Create window
const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true
        },
        icon: path.join(__dirname, '../assets/icon.png')
    });

    // Load app
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../build/index.html')}`;
    
    mainWindow.loadFile(path.join(__dirname, 'app.html'));

    // Open DevTools in dev
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

// App lifecycle
app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Create menu
const createMenu = () => {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

app.on('ready', createMenu);

/* ===== IPC HANDLERS (Preload Bridge) ===== */

/**
 * File Operations
 */
ipcMain.handle('file:read', async (event, filePath) => {
    try {
        const fs = require('fs').promises;
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:write', async (event, filePath, content) => {
    try {
        const fs = require('fs').promises;
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:list', async (event, dirPath) => {
    try {
        const fs = require('fs').promises;
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        const result = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            path: path.join(dirPath, file.name)
        }));
        return { success: true, files: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:delete', async (event, filePath) => {
    try {
        const fs = require('fs').promises;
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            await fs.rm(filePath, { recursive: true });
        } else {
            await fs.unlink(filePath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Execution
 */
ipcMain.handle('exec:run', async (event, command) => {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout, stderr } = await execAsync(command);
        return { success: true, output: stdout, error: stderr };
    } catch (error) {
        return { success: false, error: error.message, output: error.stdout || '', stderr: error.stderr || '' };
    }
});

ipcMain.handle('exec:open', async (event, filePath) => {
    try {
        const { shell } = require('electron');
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('exec:openUrl', async (event, url) => {
    try {
        const { shell } = require('electron');
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * System Info
 */
ipcMain.handle('system:home', async (event) => {
    try {
        const { homedir } = require('os');
        return { success: true, path: homedir() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('system:desktop', async (event) => {
    try {
        const { homedir } = require('os');
        const desktopPath = path.join(homedir(), 'Desktop');
        return { success: true, path: desktopPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('system:info', async (event) => {
    try {
        const { platform, arch, release } = require('os');
        return {
            success: true,
            info: {
                os: process.platform,
                arch: arch(),
                version: release(),
                nodeVersion: process.version,
                appVersion: app.getVersion()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Clipboard
 */
ipcMain.handle('clipboard:read', async (event) => {
    try {
        const { clipboard } = require('electron');
        const content = clipboard.readText();
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('clipboard:write', async (event, text) => {
    try {
        const { clipboard } = require('electron');
        clipboard.writeText(text);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Auth & Backend Communication
 */
ipcMain.handle('auth:getToken', async (event) => {
    try {
        const token = mainWindow?.webContents?.session?.cookies?.get({ url: 'https://mybestagent.io' });
        return { success: true, token };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('api:call', async (event, { method, endpoint, data, token }) => {
    try {
        const baseURL = process.env.REACT_APP_API_URL || 'https://api.mybestagent.io';
        const response = await axios({
            method,
            url: `${baseURL}${endpoint}`,
            data,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

/**
 * Check for updates
 */
ipcMain.handle('app:checkUpdates', async (event) => {
    try {
        const currentVersion = app.getVersion();
        const response = await axios.get('https://api.mybestagent.io/api/app/latest-version');
        const latestVersion = response.data.version;
        
        if (latestVersion > currentVersion) {
            return { success: true, hasUpdate: true, latestVersion, downloadUrl: response.data.downloadUrl };
        }
        return { success: true, hasUpdate: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

module.exports = app;
