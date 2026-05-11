const { app, Tray, Menu, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { startServer } = require('./index');

let tray = null;
let serverProcess = null;

// Ensure this app only runs once
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Hide from the dock on macOS (and taskbar on Windows if applicable)
  if (app.dock) app.dock.hide();

  app.whenReady().then(async () => {
    try {
      // 1. Start the Express backend
      const { port } = await startServer();
      
      // 2. Setup the Tray Icon
      setupTray(port);

      // 3. Configure Auto-start on Login
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true, // start hidden in background
      });

      // 4. Notify the user that it started successfully
      dialog.showMessageBox({
        type: 'info',
        title: 'Chills Payroll Server',
        message: 'The Payroll Server is now running in the background!',
        detail: `You can find the server icon in your Windows System Tray (bottom right corner).\nServer IP: ${getLocalIPAddress()}:${port}`
      });

    } catch (err) {
      console.error('Failed to start server:', err);
      dialog.showErrorBox('Server Error', `Failed to start server. Port might be in use or database error.\n\n${err.message}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    // Keep app running in background even if all windows are closed
  });
}

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function setupTray(port) {
  // Create a 16x16 blue square as a fallback icon
  const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAO0lEQVQ4T2NkoBAwUqifYdQAhtEwGEjAYPj///9/bJgYGBgYWBgYGBiwhTEYjFpANLUMo2EQpajpFEgAAM3kH+HT/1V0AAAAAElFTkSuQmCC';
  const icon = nativeImage.createFromBuffer(Buffer.from(iconBase64, 'base64')); 
  tray = new Tray(icon);
  
  const localIP = getLocalIPAddress();

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Chills Payroll Server', enabled: false },
    { type: 'separator' },
    { label: `Status: Running ✅`, enabled: false },
    { label: `IP: ${localIP}:${port}`, enabled: false },
    { type: 'separator' },
    { 
      label: 'Start with Windows', 
      type: 'checkbox', 
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true
        });
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit Server', 
      click: () => {
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('Chills Payroll Server');
  tray.setContextMenu(contextMenu);
}
