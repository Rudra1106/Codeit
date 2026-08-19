import { useState } from "react";
import { Folder, FolderOpen, FileCode2, FileJson, FileText, Image, Terminal, ChevronRight, ChevronDown, File } from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface ExplorerProps {
  root: FileNode | null;
  onOpenFolder: () => void;
  onOpenFile: (filePath: string) => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode2 size={15} />;
    case 'json':
      return <FileJson size={15} />;
    case 'md':
      return <FileText size={15} />;
    case 'png':
    case 'jpg':
    case 'svg':
      return <Image size={15} />;
    case 'sh':
      return <Terminal size={15} />;
    default:
      return <File size={15} />;
  }
}

function ExplorerItem({
  node,
  depth,
  onOpenFile,
  activePath
}: {
  node: FileNode;
  depth: number;
  onOpenFile: (filePath: string) => void;
  activePath?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const isDir = node.type === "directory";
  const isActive = node.path === activePath;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isDir) {
      setIsOpen(!isOpen);
    } else {
      onOpenFile(node.path);
    }
  }

  return (
    <div>
      <div
        className={`explorer-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        onClick={handleClick}
      >
        <span className="explorer-icon" style={{ display: 'flex', alignItems: 'center', marginRight: '6px', opacity: 0.8 }}>
          {isDir ? (
            <span style={{ display: 'flex', alignItems: 'center', width: '32px' }}>
              {isOpen ? <ChevronDown size={14} style={{ marginRight: '2px'}}/> : <ChevronRight size={14} style={{ marginRight: '2px'}}/>}
              {isOpen ? <FolderOpen size={15} color="#c065ff" /> : <Folder size={15} color="#aa3bff" />}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
              {getFileIcon(node.name)}
            </span>
          )}
        </span>

        {node.name}
      </div>

      {isDir && isOpen && node.children &&
        node.children.map((child) => (
          <ExplorerItem
            key={child.path}
            node={child}
            depth={depth + 1}
            onOpenFile={onOpenFile}
            activePath={activePath}
          />
        ))}
    </div>
  );
}

export default function Explorer({
  root,
  onOpenFolder,
  onOpenFile,
}: ExplorerProps) {
  return (
    <aside className="explorer">
      <div className="explorer-header">
        <span>Explorer</span>

        <div className="explorer-actions">
          <button className="icon-btn" onClick={onOpenFolder} title="Open Folder">
            <FolderOpen size={16} />
          </button>
        </div>
      </div>

      <div className="explorer-content">
        {!root ? (
          <div className="empty-explorer">
            <Folder size={48} opacity={0.2} strokeWidth={1} />
            <p>No folder opened</p>
            <button className="glass-button primary" onClick={onOpenFolder}>
              Open Folder
            </button>
          </div>
        ) : (
          <ExplorerItem
            node={root}
            depth={0}
            onOpenFile={onOpenFile}
            activePath={null}
          />
        )}
      </div>
    </aside>
  );
}