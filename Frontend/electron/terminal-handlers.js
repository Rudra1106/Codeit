import pty from 'node-pty';
import os from 'os';

const ptyProcesses = new Map();

export function setupTerminalHandlers(ipcMain) {
  ipcMain.on('terminal:create', (event, { id, cwd }) => {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'zsh');

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: cwd || os.homedir(),
      env: process.env,
    });

    ptyProcesses.set(id, ptyProcess);

    ptyProcess.onData((data) => {
      event.sender.send(`terminal:data:${id}`, data);
    });
  });

  ipcMain.on('terminal:write', (event, { id, data }) => {
    ptyProcesses.get(id)?.write(data);
  });

  ipcMain.on('terminal:resize', (event, { id, cols, rows }) => {
    ptyProcesses.get(id)?.resize(cols, rows);
  });

  ipcMain.on('terminal:destroy', (event, { id }) => {
    ptyProcesses.get(id)?.kill();
    ptyProcesses.delete(id);
  });
}
