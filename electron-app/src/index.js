const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('node:path')
const fs = require('fs')

const buildAppMenu = () => {
	const template = []

	if (process.platform === 'darwin') {
		template.push({
			label: app.name,
			submenu: [
				{ role: 'about' },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ role: 'unhide' },
				{ type: 'separator' },
				{ role: 'quit' }
			]
		})
	}

	template.push({
		label: 'View',
		submenu: [
			{ role: 'reload' },
			{ role: 'forceReload' },
			{ role: 'toggleDevTools' },
			{ type: 'separator' },
			{ role: 'resetZoom' },
			{ role: 'zoomIn' },
			{ role: 'zoomOut' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' }
		]
	})

	Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit()
}

let projectorWindow = null

const createWindow = async () => {
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
	// ! Production
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

	// Open DevTools for debugging (disable in production)
	// mainWindow.webContents.openDevTools()

	// Keyboard shortcut for DevTools: Ctrl+Shift+I or F12
	mainWindow.webContents.on('before-input-event', (event, input) => {
		if (
			(input.control && input.shift && input.key.toLowerCase() === 'i') ||
			input.key === 'F12'
		) {
			mainWindow.webContents.toggleDevTools()
			event.preventDefault()
		}
	})

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

ipcMain.handle('projector:open', async (_event, lectureId) => {
	if (projectorWindow && !projectorWindow.isDestroyed()) {
		projectorWindow.focus()
		return
	}

	projectorWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		autoHideMenuBar: true,
		title: 'Проектор — LectureApp',
		webPreferences: {
			preload: path.join(__dirname, '../dist/preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	})

	projectorWindow.setMenuBarVisibility(false)

	projectorWindow.loadFile(path.join(__dirname, 'index.html'))

	projectorWindow.webContents.once('did-finish-load', () => {
		projectorWindow.webContents.executeJavaScript(`
			if (window.location.pathname !== '/') {
				window.history.pushState({}, '', '/#/projection/${lectureId}');
				window.dispatchEvent(new PopStateEvent('popstate'));
			}
		`)
	})

	projectorWindow.on('closed', () => {
		projectorWindow = null
	})
})

ipcMain.handle('shell:openExternal', async (_event, url) => {
	await shell.openExternal(url)
})

// Creating window
app.whenReady().then(() => {
	buildAppMenu()
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

// Closing windows
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
