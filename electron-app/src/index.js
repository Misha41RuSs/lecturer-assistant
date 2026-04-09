const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('fs')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit()
}

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, '../dist/preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	})

	//! Development
	mainWindow.loadURL('http://localhost:5173')
	// TODO: Production
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

// Создание окна
app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

// Закрытие окон
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
