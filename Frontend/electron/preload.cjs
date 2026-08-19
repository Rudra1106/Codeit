// Preload script — runs in a special context between main and renderer.
// Must use CommonJS require() to guarantee compatibility across all Electron versions.
// Do NOT use ES module import syntax here.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () =>
    ipcRenderer.invoke("file:open"),

  readFile: (filePath) =>
    ipcRenderer.invoke("file:read", filePath),

  openFolder: () =>
    ipcRenderer.invoke("folder:open"),

  saveFile: (filePath, content) =>
    ipcRenderer.invoke("file:save", filePath, content),

  saveFileAs: (defaultName, content) =>
    ipcRenderer.invoke("file:saveAs", defaultName, content),

  terminal: {
    create: (id, cwd) => ipcRenderer.send('terminal:create', { id, cwd }),
    write: (id, data) => ipcRenderer.send('terminal:write', { id, data }),
    resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
    destroy: (id) => ipcRenderer.send('terminal:destroy', { id }),
    onData: (id, callback) => {
      const channel = `terminal:data:${id}`;
      const listener = (_event, data) => callback(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
});

// This creates a tiny public API on window.electronAPI:
//
// window.electronAPI
// ├── openFile()         → opens a file dialog, returns { path, name, content }
// ├── openFolder()       → opens a folder dialog, returns a FileNode tree
// ├── readFile(path)     → reads file at path, returns { path, name, content }
// ├── saveFile(path, c)  → writes content to path
// └── saveFileAs(name,c) → saves-as dialog, returns { path, name }
//
// contextIsolation: true  → renderer cannot reach Node.js directly
// nodeIntegration: false  → renderer has no require()
// This pattern is the secure Electron bridge pattern.
