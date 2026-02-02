import React, { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
import './StreamingAnimation.css';

interface StreamingAnimationProps {
  isStreaming: boolean;
  content: string;
  className?: string;
}

/**
 * 流式输出动画组件
 * 模拟打字机效果，显示AI正在输出的状态
 */
const StreamingAnimation: React.FC<StreamingAnimationProps> = ({
  isStreaming,
  content,
  className,
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const contentRef = useRef<string>(content);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 监听内容变化
  useEffect(() => {
    if (content !== contentRef.current) {
      contentRef.current = content;

      // 如果正在流式输出，逐步显示新内容
      if (isStreaming && content.startsWith(displayedContent)) {
        const newChar = content.slice(displayedContent.length, displayedContent.length + 1);
        if (newChar) {
          setDisplayedContent((prev) => prev + newChar);
        }
      } else {
        // 如果不是流式输出，直接显示全部内容
        setDisplayedContent(content);
      }
    }
  }, [content, isStreaming, displayedContent]);

  // 光标闪烁
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setCursorVisible((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setCursorVisible(false);
    }
  }, [isStreaming]);

  // 清理timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`streaming-animation ${className || ''}`}>
      <div className="streaming-content">
        {displayedContent}
        {isStreaming && (
          <span className={`streaming-cursor ${cursorVisible ? 'visible' : 'hidden'}`}>
            |
          </span>
        )}
        {isStreaming && (
          <Spin size="small" className="streaming-spinner" />
        )}
      </div>
    </div>
  );
};

/**
 * 流式输出指示器
 * 简单的小点动画，表示AI正在思考
 */
export const StreamingIndicator: React.FC = () => {
  return (
    <div className="streaming-indicator">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
  );
};

/**
 * AI响应加载状态组件
 */
export const AIResponseLoader: React.FC<{ provider: string }> = ({ provider }) => {
  return (
    <div className="ai-response-loader">
      <div className="ai-avatar">
        <img src="/ai-avatar.png" alt="AI" onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />
        <span className="ai-icon">🤖</span>
      </div>
      <div className="ai-loading-content">
        <div className="ai-loading-text">
          <StreamingIndicator />
          <span className="loading-text">AI ({provider}) 正在思考...</span>
        </div>
      </div>
    </div>
  );
};

export default StreamingAnimation;
