import React, { useState, useRef } from 'react';
import { Input, Button, Switch, Space, Tooltip } from 'antd';
import { SendOutlined, GlobalOutlined, ThunderboltOutlined, RobotOutlined, TeamOutlined } from '@ant-design/icons';
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
  
  // AI模式开关
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [enableDeepThink, setEnableDeepThink] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { members } = useRoomStore();
  const { user } = useAuthStore();

  // 获取所有可提及的成员（排除自己）
  const mentionableMembers = members.filter(m => {
    if (m.memberType === 'human' && m.userId === user?.id) {
      return false;
    }
    return true;
  });

  // 获取AI成员（用于快速@所有AI）
  const aiMembers = members.filter(m => m.memberType === 'ai');
  
  // 获取人类成员
  const humanMembers = members.filter(m => m.memberType === 'human' && m.userId !== user?.id);

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
        
        // 特殊命令：@all 或 @所有人
        if (textAfterAt.toLowerCase() === 'all' || textAfterAt === '所有人') {
          setFilteredMembers(mentionableMembers);
          setMentionIndex(0);
          return;
        }
        
        // 特殊命令：@ai 或 @AI（所有AI）
        if (textAfterAt.toLowerCase() === 'ai' || textAfterAt === '所有AI') {
          setFilteredMembers(aiMembers);
          setMentionIndex(0);
          return;
        }
        
        // 过滤成员（支持拼音和模糊匹配）
        const filtered = mentionableMembers.filter(m => {
          const name = m.user?.username || m.aiModel?.displayName || '';
          const query = textAfterAt.toLowerCase();
          
          // 精确匹配
          if (name.toLowerCase().includes(query)) {
            return true;
          }
          
          // 首字母匹配（如 "gpt" 匹配 "GPT-4"）
          const nameParts = name.toLowerCase().split(/[-_\s]+/);
          const queryParts = query.split(/[-_\s]+/);
          if (queryParts.every(qp => nameParts.some(np => np.startsWith(qp)))) {
            return true;
          }
          
          return false;
        });
        
        // 排序：AI成员优先，然后按匹配度排序
        const sorted = filtered.sort((a, b) => {
          // AI成员优先
          if (a.memberType === 'ai' && b.memberType !== 'ai') return -1;
          if (a.memberType !== 'ai' && b.memberType === 'ai') return 1;
          
          // 按名称长度排序（短的优先，通常更匹配）
          const nameA = a.user?.username || a.aiModel?.displayName || '';
          const nameB = b.user?.username || b.aiModel?.displayName || '';
          return nameA.length - nameB.length;
        });
        
        setFilteredMembers(sorted);
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
        mode: enableWebSearch ? 'search' : enableDeepThink ? 'deep_think' : 'normal',
      });

      // 发送WebSocket事件（包含模式信息）
      socketService.sendMessage(roomId, value.trim(), { 
        mentions,
        enableWebSearch,
        enableDeepThink,
      });

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
      {/* AI模式开关工具栏 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 8,
        padding: '0 8px',
      }}>
        <Space>
          <Tooltip title="联网搜索：AI将先搜索网络再回答">
            <Switch
              checked={enableWebSearch}
              onChange={(checked) => {
                setEnableWebSearch(checked);
                if (checked) setEnableDeepThink(false); // 互斥
              }}
              checkedChildren={<><GlobalOutlined /> 联网</>}
              unCheckedChildren={<GlobalOutlined />}
              size="small"
            />
          </Tooltip>
          
          <Tooltip title="深度思考：更强的推理能力（需要模型支持）">
            <Switch
              checked={enableDeepThink}
              onChange={(checked) => {
                setEnableDeepThink(checked);
                if (checked) setEnableWebSearch(false); // 互斥
              }}
              checkedChildren={<><ThunderboltOutlined /> 深度</>}
              unCheckedChildren={<ThunderboltOutlined />}
              size="small"
            />
          </Tooltip>
        </Space>
        
        {/* 快速@按钮 */}
        <Space>
          {aiMembers.length > 0 && (
            <Tooltip title="@所有AI">
              <Button
                type="text"
                size="small"
                icon={<RobotOutlined />}
                onClick={() => {
                  const aiNames = aiMembers.map(m => m.aiModel?.displayName).filter(Boolean);
                  const mentionText = aiNames.map(name => `@${name}`).join(' ') + ' ';
                  setValue(prev => prev + mentionText);
                  inputRef.current?.focus();
                }}
              >
                @AI
              </Button>
            </Tooltip>
          )}
          
          {mentionableMembers.length > 0 && (
            <Tooltip title="@所有人">
              <Button
                type="text"
                size="small"
                icon={<TeamOutlined />}
                onClick={() => {
                  const allNames = mentionableMembers.map(m => 
                    m.user?.username || m.aiModel?.displayName
                  ).filter(Boolean);
                  const mentionText = allNames.map(name => `@${name}`).join(' ') + ' ';
                  setValue(prev => prev + mentionText);
                  inputRef.current?.focus();
                }}
              >
                @所有人
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      <div style={{ position: 'relative' }}>
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={enableWebSearch 
            ? "🔍 联网搜索模式：AI将先搜索网络再回答" 
            : enableDeepThink 
              ? "🧠 深度思考模式：更强的推理能力" 
              : "输入消息，使用 @ 提及成员..."
          }
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
      </div>

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
