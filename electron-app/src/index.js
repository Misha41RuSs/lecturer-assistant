const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('fs')
const ServiceManager = require('../scripts/start-services')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit()
}

// Initialize service manager
const serviceManager = new ServiceManager()

const createWindow = async () => {
	// Start backend services first
	console.log('Starting backend services...')
	const servicesStarted = await serviceManager.startServices()

	if (!servicesStarted) {
		console.error('Failed to start backend services')
		// Still show the app but with error notification
	}

	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, '../dist/preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	})

	// ! Development
	// mainWindow.loadURL('http://localhost:5173')
	// !Production
	mainWindow.loadFile(path.join(__dirname, 'index.html'))

	// Navigate to root path after loading to fix initial 404
	mainWindow.webContents.once('did-finish-load', () => {
		mainWindow.webContents.executeJavaScript(`
			if (window.location.pathname !== '/') {
				window.history.pushState({}, '', '/');
				window.dispatchEvent(new PopStateEvent('popstate'));
			}
		`)
	})

	// Open DevTools for debugging (disabled in production)
	// mainWindow.webContents.openDevTools()

	// Log any errors
	mainWindow.webContents.on(
		'did-fail-load',
		(event, errorCode, errorDescription) => {
			console.error('Failed to load:', errorCode, errorDescription)
		}
	)
}

// IPC handlers для preload
ipcMain.handle('dialog:openFile', async () => {
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{ name: 'Presentations', extensions: ['pptx', 'pdf'] }]
	})
	if (canceled || filePaths.length === 0) return null
	return filePaths[0]
})

ipcMain.handle('file:readFile', async (_event, filePath) => {
	const buffer = fs.readFileSync(filePath)
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength
	)
})

// Creating window
app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

// Handle app quit - stop services
app.on('before-quit', async () => {
	console.log('Stopping backend services...')
	await serviceManager.stopServices()
})

// Closing windows
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
