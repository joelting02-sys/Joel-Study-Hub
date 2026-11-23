/**
 * Minimal Electron ambient type declarations so `tsc --noEmit` passes cleanly
 * even before `npm install -D electron` is run on the user's Windows machine.
 */
declare module 'electron' {
  export interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    properties?: string[];
  }
  export interface OpenDialogReturnValue {
    canceled: boolean;
    filePaths: string[];
  }
  export interface BrowserWindowConstructorOptions {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    title?: string;
    autoHideMenuBar?: boolean;
    backgroundColor?: string;
    webPreferences?: {
      preload?: string;
      contextIsolation?: boolean;
      nodeIntegration?: boolean;
      sandbox?: boolean;
    };
  }
  export class BrowserWindow {
    constructor(options?: BrowserWindowConstructorOptions);
    webContents: {
      send(channel: string, ...args: unknown[]): void;
    };
    loadFile(filePath: string): Promise<void>;
    isDestroyed(): boolean;
    isMinimized(): boolean;
    restore(): void;
    focus(): void;
    on(event: string, listener: (...args: unknown[]) => void): this;
    static getAllWindows(): BrowserWindow[];
  }
  export const app: {
    readonly isPackaged: boolean;
    getVersion(): string;
    requestSingleInstanceLock(): boolean;
    quit(): void;
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): void;
  };
  export const dialog: {
    showOpenDialog(
      window: BrowserWindow | undefined,
      options: OpenDialogOptions,
    ): Promise<OpenDialogReturnValue>;
  };
  export const ipcMain: {
    handle(
      channel: string,
      listener: (event: unknown, ...args: any[]) => unknown,
    ): void;
  };
  export const shell: {
    openPath(fullPath: string): Promise<string>;
    openExternal(url: string): Promise<void>;
  };
}
