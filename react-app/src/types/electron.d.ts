export interface ElectronAPI {
  selectFile: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<Buffer>;
  openProjector: (lectureId: string | number) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
