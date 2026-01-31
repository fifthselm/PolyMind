import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, List, Avatar, Badge, Typography, Spin, Empty, Button, message } from 'antd';
import { UserOutlined, RobotOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import MessageInput from '../../components/chat/MessageInput';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const { Content, Sider } = Layout;
const { Text, Title } = Typography;

interface Message {
  id: string;
  senderType: 'human' | 'ai';
  content: string;
  createdAt: Date;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

const ChatRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentRoom, messages, members, setCurrentRoom, setMessages, addMessage, setMembers } = useRoomStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!roomId) {
      navigate('/dashboard');
      return;
    }

    loadRoomData();
    setupSocketListeners();

    return () => {
      socketService.leaveRoom(roomId);
      socketService.off('message:new');
      socketService.off('member:joined');
      socketService.off('member:left');
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadRoomData = async () => {
    setLoading(true);
    try {
      const [room, roomMembers] = await Promise.all([
        api.getRoom(roomId!),
        // TODO: 获取成员列表API
      ]);

      setCurrentRoom(room);
      setMembers(room.members || []);

      // 加载消息历史
      const { messages: msgList } = await api.getMessages(roomId!);
      setMessages(msgList);

      // 加入WebSocket房间
      socketService.joinRoom(roomId!);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载失败');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // 新消息
    socketService.on('message:new', (data: Message) => {
      addMessage(data);
    });

    // AI流式输出
    socketService.on('message:ai:streaming', (data: any) => {
      // 处理AI流式输出
      console.log('AI流式输出:', data);
    });

    // AI输出完成
    socketService.on('message:ai:complete', (data: any) => {
      console.log('AI输出完成:', data);
    });

    // 成员加入
    socketService.on('member:joined', (data: any) => {
      // 刷新成员列表
      loadRoomData();
    });

    // 成员离开
    socketService.on('member:left', (data: any) => {
      // 刷新成员列表
      loadRoomData();
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isOwner = (member: any) => member.role === 'owner';
  const isAI = (member: any) => member.memberType === 'ai';

  return (
    <Layout style={{ height: 'calc(100vh - 112px)', background: '#fff' }}>
      {/* 聊天内容区 */}
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {/* 顶部栏 */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard')}
            style={{ marginRight: 12 }}
          />
          <div>
            <Title level={5} style={{ margin: 0 }}>{currentRoom?.name}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {members.length} 成员
              {isAI(members.find(m => m.memberType === 'ai')) && ' · AI已加入'}
            </Text>
          </div>
        </div>

        {/* 消息列表 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
              <Spin size="large" />
            </div>
          ) : messages.length === 0 ? (
            <Empty description="还没有消息，开始聊天吧" />
          ) : (
            <List
              dataSource={messages.filter(m => !m.isDeleted)}
              renderItem={(message) => {
                const isOwn = message.senderUserId === user?.id;
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', maxWidth: '70%' }}>
                      <Avatar
                        icon={message.senderType === 'ai' ? <RobotOutlined /> : <UserOutlined />}
                        style={{ margin: isOwn ? '0 0 0 8px' : '0 8px 0 0' }}
                      />
                      <div>
                        <div style={{ marginBottom: 4, fontSize: 12 }}>
                          <Text type="secondary">
                            {message.sender?.username}
                            {message.senderType === 'ai' && (
                              <span style={{ marginLeft: 4, color: '#667eea' }}>AI</span>
                            )}
                          </Text>
                        </div>
                        <div
                          style={{
                            background: isOwn ? '#1890ff' : '#f5f5f5',
                            color: isOwn ? '#fff' : '#333',
                            padding: '8px 12px',
                            borderRadius: 8,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {message.content}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          <Text type="secondary">
                            {dayjs(message.createdAt).format('HH:mm')}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
          <MessageInput roomId={roomId!} />
        </div>
      </Content>

      {/* 成员列表 */}
      <Sider
        width={250}
        style={{ background: '#fafafa', borderLeft: '1px solid #f0f0f0' }}
        theme="light"
      >
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text strong>成员列表</Text>
            <Text type="secondary">({members.length})</Text>
          </div>

          <List
            dataSource={members}
            renderItem={(member) => (
              <List.Item style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Badge status={member.memberType === 'ai' ? 'processing' : 'success'} />
                  <Avatar
                    icon={member.memberType === 'ai' ? <RobotOutlined /> : <UserOutlined />}
                    size="small"
                    style={{ margin: '0 8px' }}
                  />
                  <div>
                    <div style={{ fontSize: 14 }}>
                      {member.user?.username || member.aiModel?.displayName}
                      {member.memberType === 'ai' && (
                        <span style={{ marginLeft: 4, fontSize: 12, color: '#667eea' }}>AI</span>
                      )}
                    </div>
                    {isOwner(member) && (
                      <Text type="secondary" style={{ fontSize: 12 }}>群主</Text>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Sider>
    </Layout>
  );
};

export default ChatRoomPage;
