import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

interface MindMapViewerProps {
  mermaidCode: string;
  title?: string;
}

export const MindMapViewer: React.FC<MindMapViewerProps> = ({ mermaidCode, title }) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false });
    mermaid.render(`mindmap-${Date.now()}`, mermaidCode).then(({ svg }) => {
      setSvg(svg);
    });
  }, [mermaidCode]);

  return (
    <div className="mindmap-viewer">
      {title && <h3>{title}</h3>}
      <div
        className="mermaid-render"
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{ overflow: 'auto', maxHeight: '600px' }}
      />
      <details>
        <summary>查看Mermaid源码</summary>
        <pre>{mermaidCode}</pre>
      </details>
    </div>
  );
};

export default MindMapViewer;
