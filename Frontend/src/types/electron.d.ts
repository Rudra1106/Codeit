// Tell TypeScript that window.electronAPI exists
export {};

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{
        path: string;
        name: string;
        content: string;
      } | null>;

      openFolder: () => Promise<FileNode | null>;

      saveFile: (
        filePath: string,
        content: string
      ) => Promise<{
        success: boolean;
      }>;

      saveFileAs: (
        defaultPath: string,
        content: string
      ) => Promise<{
        path: string;
        name: string;
      } | null>;
      
      readFile: (filePath: string) => Promise<{
        path: string;
        name: string;
        content: string;
      }>;
      
      terminal: {
        create: (id: string, cwd?: string) => void;
        write: (id: string, data: string) => void;
        resize: (id: string, cols: number, rows: number) => void;
        destroy: (id: string) => void;
        onData: (id: string, callback: (data: string) => void) => () => void;
      };
    };
  }
}

// Without this, TypeScript will complain:
// Property 'electronAPI' does not exist on type 'Window'
// Now TypeScript understands our bridge.