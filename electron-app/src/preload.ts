import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:readFile', filePath)
});
