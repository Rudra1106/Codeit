import { useState } from "react";
import Editor from "@monaco-editor/react";
import Explorer from "./components/Explorer";
import Terminal from "./components/Terminal";
import "./App.css";
import { FilePlus, FolderInput, Save, SaveAll, Code2, Terminal as TerminalIcon, Sparkles, Send } from "lucide-react";

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

  const [file, setFile] = useState<OpenFile | null>(null);

  const [savedContent, setSavedContent] = useState("");

  const isDirty = file && file.content !== savedContent;

  // AI Chat State
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  async function handleAiSubmit() {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setAiMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error communicating with the backend." }]);
    } finally {
      setIsAiLoading(false);
    }
  }

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
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.openFolder();
      if (!result) return;
      setRoot(result);
    } catch (err) {
      console.error("[openFolder] failed:", err);
    }
  }

  async function handleExplorerFile(filePath: string) {
    const result = await window.electronAPI.readFile(filePath);

    setFile(result);
    setSavedContent(result.content);
  }

  async function handleSaveFile() {
    if (!file) return;

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
    if (!file) return;
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
          <Code2 size={16} className="logo-icon" />
          Erudition
        </div>

        <div className="actions">
          <button onClick={handleNewFile} title="New File">
            <FilePlus size={14} />
            <span>New</span>
          </button>
          <button onClick={handleOpenFile} title="Open File">
            <FolderInput size={14} />
            <span>Open</span>
          </button>
          <button onClick={handleSaveFile} title="Save File" className={isDirty ? "text-gradient-accent" : ""}>
            <Save size={14} />
            <span>Save</span>
          </button>
          <button onClick={handleSaveAs} title="Save As">
            <SaveAll size={14} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <Explorer
          root={root}
          onOpenFolder={handleOpenFolder}
          onOpenFile={handleExplorerFile}
        />

        <div className="editor-and-ai-container">
          <div className="main-content">
            <section className="editor-area">
            {file ? (
              <>
                <div className="editor-tabs">
                  <div className="tab">
                    <Code2 size={14} className="tab-icon" />
                    <span>{file.name}</span>
                    <div className={`tab-dirty ${isDirty ? 'is-dirty' : ''}`} />
                  </div>
                </div>

                <div className="editor-container">
                  <Editor
                    height="100%"
                    language="typescript"
                    value={file.content}
                    theme="vs-dark"
                    onChange={(value) => {
                      setFile((currentFile) => currentFile ? ({
                        ...currentFile,
                        content: value ?? "",
                      }) : null);
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      automaticLayout: true,
                      padding: { top: 16 },
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      cursorSmoothCaretAnimation: "on"
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="empty-editor-state">
                <Code2 size={64} className="empty-logo" />
                <div className="keyboard-shortcuts">
                  <div className="shortcut">
                    <span>Open Folder</span>
                    <div className="keybind">
                      <span className="key">⌘</span>
                      <span className="key">O</span>
                    </div>
                  </div>
                  <div className="shortcut">
                    <span>New File</span>
                    <div className="keybind">
                      <span className="key">⌘</span>
                      <span className="key">N</span>
                    </div>
                  </div>
                  <div className="shortcut">
                    <span>Command Palette</span>
                    <div className="keybind">
                      <span className="key">⌘</span>
                      <span className="key">⇧</span>
                      <span className="key">P</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="terminal-area">
            <div className="terminal-header">
              <TerminalIcon size={12} style={{ marginRight: '6px' }} />
              <span>Terminal</span>
            </div>
            <div className="terminal-container">
              <Terminal cwd={root?.path} />
            </div>
          </section>
          </div>

          <aside className="ai-panel">
            <div className="ai-header">
              <Sparkles size={14} style={{ marginRight: '6px', color: 'var(--accent-primary)' }} />
              <span>AI Assistant</span>
            </div>

            <div className="ai-messages">
              {aiMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '20px', fontSize: '13px' }}>
                  Ask me anything about your code...
                </div>
              )}
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={`ai-message ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              {isAiLoading && <div className="ai-message-loading">Thinking...</div>}
            </div>

            <div className="ai-input-area">
              <textarea
                className="ai-input"
                placeholder="Ask a question..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAiSubmit();
                  }
                }}
              />
              <button 
                className="ai-submit" 
                onClick={handleAiSubmit}
                disabled={isAiLoading || !aiInput.trim()}
              >
                <Send size={14} />
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;