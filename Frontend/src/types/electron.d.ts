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
    };
  }
}

// Without this, TypeScript will complain:
// Property 'electronAPI' does not exist on type 'Window'
// Now TypeScript understands our bridge.