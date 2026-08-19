import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setupTerminalHandlers } from "./terminal-handlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the currently focused window (or any open window) for use as dialog parent. */
function getFocusedWindow() {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

/** Recursively reads a directory, skipping noisy folders. */
async function readDirectory(directoryPath) {
  const IGNORED = new Set(["node_modules", ".git", "dist", ".next", "__pycache__", ".venv"]);

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;

    const fullPath = path.join(directoryPath, entry.name);

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

  // Sort: directories first, then files, both alphabetically
  return children.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "directory" ? -1 : 1;
  });
}

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset", // macOS native traffic lights + drag area
    backgroundColor: "#0a0a0c",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:5173");
    // win.webContents.openDevTools(); // uncomment when debugging
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

// ─── IPC Handlers ────────────────────────────────────────────────────────────

/** Open a single file with a native file picker dialog. */
ipcMain.handle("file:open", async () => {
  try {
    const result = await dialog.showOpenDialog(getFocusedWindow(), {
      properties: ["openFile"],
      filters: [
        { name: "All Files", extensions: ["*"] },
        { name: "TypeScript", extensions: ["ts", "tsx"] },
        { name: "JavaScript", extensions: ["js", "jsx"] },
        { name: "Python", extensions: ["py"] },
        { name: "Markdown", extensions: ["md"] },
        { name: "JSON", extensions: ["json"] },
      ],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const filePath = result.filePaths[0];
    const content = await fs.readFile(filePath, "utf-8");

    return { path: filePath, name: path.basename(filePath), content };
  } catch (err) {
    console.error("[file:open] Error:", err);
    return null;
  }
});


/** Read the contents of a file given its path. */
ipcMain.handle("file:read", async (_, filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { path: filePath, name: path.basename(filePath), content };
  } catch (err) {
    console.error("[file:read] Error:", err);
    return null;
  }
});


/** Save content to a known file path. */
ipcMain.handle("file:save", async (_, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (err) {
    console.error("[file:save] Error:", err);
    return { success: false, error: err.message };
  }
});


/** Show a Save As dialog and write to the chosen path. */
ipcMain.handle("file:saveAs", async (_, defaultName, content) => {
  try {
    const result = await dialog.showSaveDialog(getFocusedWindow(), {
      defaultPath: defaultName,
      filters: [
        { name: "All Files", extensions: ["*"] },
        { name: "TypeScript", extensions: ["ts", "tsx"] },
        { name: "JavaScript", extensions: ["js", "jsx"] },
        { name: "Python", extensions: ["py"] },
        { name: "Text", extensions: ["txt", "md"] },
      ],
    });

    if (result.canceled || !result.filePath) return null;

    await fs.writeFile(result.filePath, content, "utf-8");

    return { path: result.filePath, name: path.basename(result.filePath) };
  } catch (err) {
    console.error("[file:saveAs] Error:", err);
    return null;
  }
});


/** Open a folder with a native folder picker and return the full directory tree. */
ipcMain.handle("folder:open", async () => {
  try {
    const result = await dialog.showOpenDialog(getFocusedWindow(), {
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const folderPath = result.filePaths[0];

    const tree = {
      name: path.basename(folderPath),
      path: folderPath,
      type: "directory",
      children: await readDirectory(folderPath),
    };

    return tree;
  } catch (err) {
    console.error("[folder:open] Error:", err);
    return null;
  }
});

setupTerminalHandlers(ipcMain);