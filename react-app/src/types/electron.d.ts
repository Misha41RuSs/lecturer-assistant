export interface ElectronAPI {
  selectFile: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<Buffer>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
