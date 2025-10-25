const { app, BrowserWindow, Menu } = require('electron');
const waitOn = require('wait-on');
const path = require('path');
const isDev = require('electron-is-dev');
const { initializeStoreKit } = require('./storeKit.cjs');

// Keep a global reference of the window object to prevent garbage collection
const { spawn } = require('child_process');
let mainWindow;
let backendProcess = null;

function startBackend() {
  // Determine paths
  const backendDir = path.resolve(__dirname, '../../backend');
  const venvPython = path.join(backendDir, 'venv', 'bin', 'python');

  // Prefer venv python if it exists, else fallback to python3
  const pythonCmd = require('fs').existsSync(venvPython) ? venvPython : 'python3';

  backendProcess = spawn(
    pythonCmd,
    ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'],
    {
      cwd: backendDir,
      env: {
        ...process.env,
      },
      stdio: 'inherit',
    }
  );

  backendProcess.on('exit', (code, signal) => {
    console.log(`[backend] exited with code=${code} signal=${signal}`);
  });
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    try {
      if (process.platform === 'win32') {
        // Best-effort on Windows
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill('SIGINT');
      }
    } catch (e) {
      console.error('Error stopping backend:', e);
    }
  }
}

// Disable the default menu to prevent view source
Menu.setApplicationMenu(null);

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#161820',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true, // Enable dev tools for debugging
      webSecurity: false, // Disable to prevent security overlays
      sandbox: false,
      // Additional options to hide web elements
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // Disable all overlays
      backgroundThrottling: false
    },
    // Hide all browser UI elements
    show: false, // Start hidden
    autoHideMenuBar: true,
    // Allow controlled window spawning for authentication
    webContents: {
      // We'll control this in the setWindowOpenHandler below
    },
  });

  // Use the correct URL based on environment
  const startUrl = isDev 
    ? process.env.DEV_SERVER_URL || 'http://localhost:3000'  // Webpack dev server
    : `file://${path.join(__dirname, '../dist/index.html')}`; // Built files

  console.log(`[electron] Loading ${isDev ? 'development' : 'production'} app from:`, startUrl);

  // Load the app
  // Try to load, and retry once if it fails
  const tryLoad = async (url, attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      try {
        await mainWindow.loadURL(url);
        console.log(`[electron] Successfully loaded app`);
        return;
      } catch (err) {
        console.error(`[electron] Failed to load URL (attempt ${i + 1}/${attempts}):`, err);
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    console.error(`[electron] Failed to load app after ${attempts} attempts`);
  };

  tryLoad(startUrl);
  
  // Show window after content loads to prevent address bar flash
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Allow Firebase authentication popups, block others
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Firebase authentication popups
    const isFirebaseAuth = url.includes('accounts.google.com') || 
                          url.includes('github.com/login') || 
                          url.includes('firebaseapp.com') ||
                          url.includes('googleapis.com') ||
                          url.includes('accounts.google.com/oauth');
    
    if (isFirebaseAuth) {
      console.log('Opening Firebase auth popup for:', url);
      
      // Allow popup for Firebase auth, but control the window
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 450,
          height: 600,
          modal: true,
          parent: mainWindow,
          title: 'Sign In',
          // Hide all browser UI elements including address bar
          frame: false,
          titleBarStyle: 'hidden',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            devTools: false,
            // Additional security to prevent address bar
            backgroundThrottling: false,
            experimentalFeatures: false
          },
          // Remove all browser chrome
          autoHideMenuBar: true,
          menuBarVisible: false,
          show: true,
          // Custom window styling
          backgroundColor: '#ffffff',
          minimizable: false,
          maximizable: false,
          resizable: false,
          fullscreenable: false,
          // Critical: This should hide any address bar
          titleBarOverlay: false
        }
      };
    }
    
    // Block all other popup attempts
    return { action: 'deny' };
  });

  // Hide URL bar and other browser elements in child windows
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    // Inject CSS to hide any remaining URL elements
    childWindow.webContents.on('dom-ready', () => {
      childWindow.webContents.insertCSS(`
        /* Hide address bar and navigation elements */
        input[type="url"],
        .location-bar,
        .url-bar,
        .address-bar,
        .navigation-bar,
        [class*="address"],
        [class*="location"],
        [class*="url"],
        [id*="address"],
        [id*="location"],
        [id*="url"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        /* Hide Chrome/Electron specific elements */
        .titlebar,
        .tab-strip,
        .toolbar,
        #toolbar,
        #nav-bar,
        #urlbar,
        #location {
          display: none !important;
        }
        
        /* Ensure content takes full space */
        body {
          margin: 0 !important;
          padding: 0 !important;
        }
      `);
    });
  });

  // Prevent external/unexpected navigations (e.g., from file drop)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation within the same origin in dev mode
    const isValidUrl = isDev 
      ? url.startsWith('http://localhost:3000')
      : url === startUrl;
      
    if (!isValidUrl) {
      event.preventDefault();
      if (!mainWindow.isDestroyed()) {
        mainWindow.loadURL(startUrl);
      }
    }
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window and start backend when Electron is ready
app.whenReady().then(async () => {
  // startBackend(); // Temporarily disabled - will fix backend database issue
  
  // Initialize StoreKit for Mac App Store purchases
  await initializeStoreKit();
  
  // No need to wait for Vite, we're using a standalone HTML file
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
