import { useState } from "react";
import Editor from "@monaco-editor/react";
import Explorer from "./components/Explorer";
import "./App.css";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface OpenFile {
  path: string | null;
  name: string;
  content: string;
}

function App() {
  const [root, setRoot] = useState<FileNode | null>(null);

  const [file, setFile] = useState<OpenFile>({
    path: null,
    name: "Untitled",
    content: "",
  });

  const [savedContent, setSavedContent] = useState("");

  const isDirty = file.content !== savedContent;


  function handleNewFile() {
    setFile({
      path: null,
      name: "Untitled",
      content: "",
    });

    setSavedContent("");
  }


  async function handleOpenFile() {
    const result = await window.electronAPI.openFile();

    if (!result) return;

    setFile(result);
    setSavedContent(result.content);
  }


  async function handleOpenFolder() {
    const result = await window.electronAPI.openFolder();

    if (!result) return;

    setRoot(result);
  }


  async function handleExplorerFile(filePath: string) {
    const result = await window.electronAPI.readFile(filePath);

    setFile(result);
    setSavedContent(result.content);
  }


  async function handleSaveFile() {
    if (!file.path) {
      const result = await window.electronAPI.saveFileAs(
        file.name,
        file.content
      );

      if (!result) return;

      setFile({
        path: result.path,
        name: result.name,
        content: file.content,
      });

      setSavedContent(file.content);
      return;
    }

    await window.electronAPI.saveFile(
      file.path,
      file.content
    );

    setSavedContent(file.content);
  }


  async function handleSaveAs() {
    const result = await window.electronAPI.saveFileAs(
      file.name,
      file.content
    );

    if (!result) return;

    setFile({
      path: result.path,
      name: result.name,
      content: file.content,
    });

    setSavedContent(file.content);
  }


  return (
    <div className="app">

      <header className="titlebar">
        <div className="logo">
          Erudition
        </div>

        <div className="actions">
          <button onClick={handleNewFile}>New</button>
          <button onClick={handleOpenFile}>Open File</button>
          <button onClick={handleOpenFolder}>Open Folder</button>
          <button onClick={handleSaveFile}>Save</button>
          <button onClick={handleSaveAs}>Save As</button>
        </div>
      </header>


      <main className="workspace">

        <Explorer
          root={root}
          onOpenFolder={handleOpenFolder}
          onOpenFile={handleExplorerFile}
        />


        <section className="editor-area">

          <div className="tab">
            {isDirty && "● "}
            {file.name}
          </div>

          <Editor
            height="100%"
            language="typescript"
            value={file.content}
            theme="vs-dark"
            onChange={(value) => {
              setFile((currentFile) => ({
                ...currentFile,
                content: value ?? "",
              }));
            }}
            options={{
              minimap: {
                enabled: false,
              },
              fontSize: 15,
              automaticLayout: true,
            }}
          />

        </section>

      </main>

    </div>
  );
}

export default App;