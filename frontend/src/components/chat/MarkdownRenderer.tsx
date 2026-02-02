import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useState } from 'react';
import mermaid from 'mermaid';

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown 渲染组件
 * 支持：GFM、代码高亮、LaTeX公式、Mermaid图表
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  // 渲染 Mermaid 图表
  useEffect(() => {
    if (mermaidRef.current) {
      const mermaidElements = mermaidRef.current.querySelectorAll('.mermaid');
      mermaidElements.forEach((element) => {
        try {
          mermaid.render(
            `mermaid-${Math.random().toString(36).substr(2, 9)}`,
            element.textContent || ''
          ).then((result) => {
            element.innerHTML = result.svg;
          });
        } catch (error) {
          console.error('Mermaid 渲染失败:', error);
        }
      });
    }
  }, [content]);

  // 预处理内容：提取 Mermaid 代码块
  const processedContent = content.replace(
    /```mermaid\n([\s\S]*?)```/g,
    '<div class="mermaid">$1</div>'
  );

  return (
    <div ref={mermaidRef} className={`markdown-renderer ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // 自定义代码块渲染
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');

            if (!inline && language) {
              return (
                <CodeBlock
                  language={language}
                  code={codeContent}
                />
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // 自定义表格渲染
          table({ children }) {
            return (
              <div className="table-wrapper">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

/**
 * 代码块组件（带复制功能）
 */
interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <Tooltip title={copied ? '已复制' : '复制'}>
          <Button
            type="text"
            size="small"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
            className="copy-button"
          />
        </Tooltip>
      </div>
      <pre>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default MarkdownRenderer;
