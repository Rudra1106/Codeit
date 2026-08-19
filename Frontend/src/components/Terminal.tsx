import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function Terminal({ cwd }: { cwd?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`term-${Date.now()}`);

  useEffect(() => {
    if (!containerRef.current) return;
    const id = idRef.current;

    const xterm = new XTerm({
      theme: { 
        background: '#0a0a0c', // Match the main background color
        foreground: '#f8f9fa',
        cursor: '#aa3bff',     // Match accent color
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    
    // Slight delay to ensure the container is fully rendered before fitting
    setTimeout(() => {
      fitAddon.fit();
    }, 10);

    window.electronAPI.terminal.create(id, cwd);

    const removeListener = window.electronAPI.terminal.onData(id, (data: string) => {
      xterm.write(data);
    });

    const onDataDisposable = xterm.onData((data) => {
      window.electronAPI.terminal.write(id, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      window.electronAPI.terminal.resize(id, xterm.cols, xterm.rows);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      removeListener();
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      window.electronAPI.terminal.destroy(id);
      xterm.dispose();
    };
  }, [cwd]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
