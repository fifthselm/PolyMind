import React, { useState, useRef, useEffect } from 'react';
import { Input, Avatar, Button, Tooltip } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';
import { socketService } from '../../services/socket';
import { api } from '../../services/api';
import MentionList from './MentionList';

interface Member {
  id: string;
  userId?: string;
  aiModelId?: string;
  memberType: 'human' | 'ai';
  role: string;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  aiModel?: {
    id: string;
    displayName: string;
  };
}

interface MessageInputProps {
  roomId: string;
  onSend?: (content: string, mentions: string[]) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ roomId, onSend }) => {
  const [value, setValue] = useState('');
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  
  const inputRef = useRef<any>(null);
  const { members } = useRoomStore();
  const { user } = useAuthStore();

  // 获取所有可提及的成员（排除自己）
  const mentionableMembers = members.filter(m => {
    if (m.memberType === 'human' && m.userId === user?.id) {
      return false;
    }
    return true;
  });

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // 检测@提及
    const lastAtIndex = newValue.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = newValue.slice(lastAtIndex + 1);
      
      // 检查@后面是否有空格或其他分隔符
      const hasSpace = textAfterAt.includes(' ');
      
      if (!hasSpace && (textAfterAt.length > 0 || lastAtIndex === newValue.length - 1)) {
        setMentionQuery(textAfterAt);
        setShowMention(true);
        
        // 过滤成员
        const filtered = mentionableMembers.filter(m => {
          const name = m.user?.username || m.aiModel?.displayName || '';
          return name.toLowerCase().includes(textAfterAt.toLowerCase());
        });
        setFilteredMembers(filtered);
        setMentionIndex(0);
        return;
      }
    }
    
    setShowMention(false);
  };

  // 选择提及
  const handleMentionSelect = (member: Member) => {
    const lastAtIndex = value.lastIndexOf('@');
    const newValue = value.slice(0, lastAtIndex + 1) + 
      (member.user?.username || member.aiModel?.displayName) + ' ';
    
    setValue(newValue);
    setShowMention(false);
    inputRef.current?.focus();
  };

  // 关闭提及列表
  const handleMentionClose = () => {
    setShowMention(false);
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMention) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredMembers[mentionIndex]) {
        e.preventDefault();
        handleMentionSelect(filteredMembers[mentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleMentionClose();
      }
      return;
    }

    // 发送消息
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!value.trim() || sending) return;

    setSending(true);

    try {
      // 解析提及
      const mentions = extractMentions(value);

      // 发送消息
      await api.sendMessage(roomId, {
        content: value.trim(),
        mentions,
      });

      // 发送WebSocket事件
      socketService.sendMessage(roomId, value.trim(), { mentions });

      setValue('');
      setShowMention(false);

      onSend?.(value.trim(), mentions);
    } catch (error) {
      console.error('发送失败:', error);
    } finally {
      setSending(false);
    }
  };

  // 提取提及的用户ID
  const extractMentions = (text: string): string[] => {
    const mentions: string[] = [];
    const nameToId = new Map<string, string>();
    
    // 构建名称到ID的映射
    mentionableMembers.forEach(m => {
      const name = m.user?.username || m.aiModel?.displayName;
      if (name) {
        nameToId.set(name, m.id);
      }
    });

    // 解析@提及
    const regex = /@([^\s@]+)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      if (nameToId.has(name)) {
        mentions.push(nameToId.get(name)!);
      }
    }

    return mentions;
  };

  return (
    <div style={{ position: 'relative' }}>
      <Input.TextArea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="输入消息，使用 @ 提及成员..."
        autoSize={{ minRows: 1, maxRows: 4 }}
        disabled={sending}
        style={{ 
          borderRadius: 20,
          padding: '8px 50px 8px 16px',
        }}
      />
      
      <Button
        type="primary"
        shape="circle"
        icon={<SendOutlined />}
        onClick={handleSend}
        disabled={!value.trim() || sending}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* 提及列表 */}
      {showMention && (
        <MentionList
          items={filteredMembers.map(m => ({
            id: m.id,
            name: m.user?.username || m.aiModel?.displayName || '',
            type: m.memberType,
          }))}
          onSelect={(item) => {
            const member = filteredMembers.find(m => m.id === item.id);
            if (member) {
              handleMentionSelect(member);
            }
          }}
          onClose={handleMentionClose}
        />
      )}
    </div>
  );
};

export default MessageInput;
