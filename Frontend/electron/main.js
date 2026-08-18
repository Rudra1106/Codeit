const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");

async function readDirectory(directoryPath) {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });

  const children = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    // Ignore some folders we don't want in the IDE explorer
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      children.push({
        name: entry.name,
        path: fullPath,
        type: "directory",
        children: await readDirectory(fullPath),
      });
    } else {
      children.push({
        name: entry.name,
        path: fullPath,
        type: "file",
      });
    }
  }

  return children;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/* IPC HANDLERS */ // ipc means inter-process communication, which allows the main process and renderer process to communicate with each other. In this case, we are handling file operations like opening, saving, and saving as.
ipcMain.handle("file:open", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
  });

  if (result.canceled) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf-8");

  return {
    path: filePath,
    name: path.basename(filePath),
    content,
  };
});


ipcMain.handle("file:save", async (_, filePath, content) => {
  await fs.writeFile(filePath, content, "utf-8");

  return {
    success: true,
  };
});


ipcMain.handle("file:saveAs", async (_, defaultPath, content) => {
  const result = await dialog.showSaveDialog({
    defaultPath,
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.writeFile(result.filePath, content, "utf-8");

  return {
    path: result.filePath,
    name: path.basename(result.filePath),
  };
});

ipcMain.handle("folder:open", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (result.canceled) {
    return null;
  }

  const folderPath = result.filePaths[0];

  const tree = {
    name: path.basename(folderPath),
    path: folderPath,
    type: "directory",
    children: await readDirectory(folderPath),
  };

  return tree;
});

ipcMain.handle("file:read", async (_, filePath) => {
  const content = await fs.readFile(filePath, "utf-8");

  return {
    path: filePath,
    name: path.basename(filePath),
    content,
  };
});