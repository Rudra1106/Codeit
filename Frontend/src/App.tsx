import Editor from '@monaco-editor/react'
import './App.css'

function App() {
  return (
    <div className="app">
      <div className="explorer">Explorer</div>
      <div className="editor">
        <Editor
          height="100%"
          defaultLanguage="python"
          defaultValue={'def hello():\n    print("Hello")\n'}
          theme="vs-dark"
        />
      </div>
      <div className="terminal">Terminal (placeholder)</div>
    </div>
  )
}

export default App