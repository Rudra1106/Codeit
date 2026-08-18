const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("file:open"),

  readFile: (filePath) =>
    ipcRenderer.invoke("file:read", filePath),

  openFolder: () => ipcRenderer.invoke("folder:open"),

  saveFile: (filePath, content) =>
    ipcRenderer.invoke("file:save", filePath, content),

  saveFileAs: (defaultPath, content) =>
    ipcRenderer.invoke("file:saveAs", defaultPath, content),
});
// This creates a very small public API for the renderer:

// window.electronAPI
// │
// ├── openFile()
// ├── openFolder()
// ├── saveFile(...)
// └── saveFileAs(...)

// This is much safer than giving React all of Node.js:

// require("fs")

// which is exactly why we used:

// contextIsolation: true
// nodeIntegration: false