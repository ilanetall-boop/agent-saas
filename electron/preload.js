const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose secure API to renderer process
 * All calls go through ipcRenderer to main process
 */
contextBridge.exposeInMainWorld('api', {
    // File operations
    files: {
        read: (filePath) => ipcRenderer.invoke('file:read', filePath),
        write: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
        list: (dirPath) => ipcRenderer.invoke('file:list', dirPath),
        delete: (filePath) => ipcRenderer.invoke('file:delete', filePath)
    },

    // Code execution
    exec: {
        run: (command) => ipcRenderer.invoke('exec:run', command),
        open: (filePath) => ipcRenderer.invoke('exec:open', filePath),
        openUrl: (url) => ipcRenderer.invoke('exec:openUrl', url)
    },

    // System information
    system: {
        home: () => ipcRenderer.invoke('system:home'),
        desktop: () => ipcRenderer.invoke('system:desktop'),
        getInfo: () => ipcRenderer.invoke('system:info')
    },

    // Clipboard
    clipboard: {
        read: () => ipcRenderer.invoke('clipboard:read'),
        write: (text) => ipcRenderer.invoke('clipboard:write', text)
    },

    // Backend API
    auth: {
        getToken: () => ipcRenderer.invoke('auth:getToken')
    },

    api: {
        call: (method, endpoint, data, token) => 
            ipcRenderer.invoke('api:call', { method, endpoint, data, token })
    },

    // App updates
    app: {
        checkUpdates: () => ipcRenderer.invoke('app:checkUpdates')
    }
});
