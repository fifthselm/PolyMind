import React, { useState, useEffect, useRef } from 'react';
import { List, Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface MentionItem {
  id: string;
  name: string;
  type: 'human' | 'ai';
}

interface MentionListProps {
  items: MentionItem[];
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
}

const MentionList: React.FC<MentionListProps> = ({ items, onSelect, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          onSelect(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect, onClose]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        background: '#fff',
        border: '1px solid #d9d9d9',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxHeight: 200,
        overflow: 'auto',
        zIndex: 1000,
      }}
    >
      <List
        size="small"
        dataSource={items}
        renderItem={(item, index) => (
          <List.Item
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              background: index === selectedIndex ? '#e6f7ff' : 'transparent',
            }}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  size="small"
                  icon={item.type === 'ai' ? <RobotOutlined /> : <UserOutlined />}
                  style={{
                    background: item.type === 'ai' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#1890ff',
                  }}
                />
              }
              title={<Text strong>{item.name}</Text>}
              description={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.type === 'ai' ? 'AI助手' : '用户'}
                </Text>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default MentionList;
