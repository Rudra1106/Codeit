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

function ExplorerItem({
  node,
  depth,
  onOpenFile,
}: {
  node: FileNode;
  depth: number;
  onOpenFile: (filePath: string) => void;
}) {
  function handleClick() {
    if (node.type === "file") {
      onOpenFile(node.path);
    }
  }

  return (
    <div>
      <div
        className="explorer-item"
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
        onClick={handleClick}
      >
        <span className="explorer-icon">
          {node.type === "directory" ? "📁" : "📄"}
        </span>

        {node.name}
      </div>

      {node.type === "directory" &&
        node.children?.map((child) => (
          <ExplorerItem
            key={child.path}
            node={child}
            depth={depth + 1}
            onOpenFile={onOpenFile}
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
        <span>EXPLORER</span>

        <button onClick={onOpenFolder}>
          Open Folder
        </button>
      </div>

      {!root && (
        <div className="empty-explorer">
          No folder opened
        </div>
      )}

      {root && (
        <ExplorerItem
          node={root}
          depth={0}
          onOpenFile={onOpenFile}
        />
      )}
    </aside>
  );
}