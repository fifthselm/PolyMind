import React from 'react';
import { Button } from 'antd';
import { StopOutlined } from '@ant-design/icons';

interface StopGenerationButtonProps {
  onStop: () => void;
  loading?: boolean;
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

/**
 * 中断生成按钮组件
 * 在AI正在生成回复时显示，允许用户中断生成过程
 */
const StopGenerationButton: React.FC<StopGenerationButtonProps> = ({
  onStop,
  loading = false,
  size = 'middle',
  className = '',
}) => {
  return (
    <Button
      type="primary"
      danger
      icon={<StopOutlined />}
      onClick={onStop}
      loading={loading}
      size={size}
      className={`stop-generation-button ${className}`}
    >
      停止生成
    </Button>
  );
};

export default StopGenerationButton;
