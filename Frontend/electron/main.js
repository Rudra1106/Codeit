const { app, BrowserWindow } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
  })

  const isDev = !app.isPackaged

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile('dist/index.html')
  }
}

app.whenReady().then(createWindow)