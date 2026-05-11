const { app, Tray, Menu, nativeImage } = require('electron');
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

    } catch (err) {
      console.error('Failed to start server:', err);
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
  // Create a simple blank icon, or load one if available
  // To avoid errors, using nativeImage to create an empty transparent icon for now.
  // We can replace this with a real icon file (e.g., path.join(__dirname, 'icon.png'))
  const icon = nativeImage.createEmpty(); 
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
