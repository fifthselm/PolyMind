import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, List, Avatar, Badge, Typography, Spin, Empty, Button, Modal, Form, Select, Input, App } from 'antd';
import { UserOutlined, RobotOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import MessageInput from '@/components/chat/MessageInput';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const { Content, Sider } = Layout;
const { Text, Title } = Typography;
const { Option } = Select;

// 类型定义
interface AIModelOption {
  id: string;
  displayName: string;
  provider: string;
  isActive: boolean;
}

// Message类型从roomStore导入，这里使用兼容的接口
type MessageData = {
  id: string;
  roomId: string;
  senderType: 'human' | 'ai';
  senderUserId?: string;
  senderAiModelId?: string;
  content: string;
  contentType: 'text' | 'image' | 'file';
  replyToId?: string;
  mentions: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
};

type RoomMember = {
  id: string;
  roomId: string;
  userId?: string;
  aiModelId?: string;
  memberType: 'human' | 'ai';
  role: 'owner' | 'admin' | 'member';
  aiPrompt?: string;
  joinedAt: Date;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  aiModel?: {
    id: string;
    displayName: string;
    provider: string;
  };
};

const ChatRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [models, setModels] = useState<AIModelOption[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [addMemberForm] = Form.useForm();
  const { message, modal } = App.useApp();

  const { currentRoom, messages, members, setCurrentRoom, setMessages, addMessage, updateMessage, setMembers } = useRoomStore();
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
      const [room, roomMembers, msgList] = await Promise.all([
        api.getRoom(roomId!),
        api.getRoomMembers(roomId!),
        api.getMessages(roomId!),
      ]);

      setCurrentRoom(room);
      setMembers(roomMembers || []);
      setMessages(msgList.messages || []);

      // 加入WebSocket房间
      socketService.joinRoom(roomId!);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message || '加载失败');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // 新消息
    socketService.on('message:new', (data: MessageData) => {
      addMessage(data as unknown as Parameters<typeof addMessage>[0]);
    });

      // AI流式输出
    socketService.on('message:ai:streaming', (data: { messageId: string; aiModelId: string; chunk: string }) => {
      const { messages: currentMessages, members: currentMembers } = useRoomStore.getState();
      const existing = currentMessages.find((m) => m.id === data.messageId);
      const sender = currentMembers.find((m) => m.aiModelId === data.aiModelId);
      if (existing) {
        updateMessage(existing.id, `${existing.content || ''}${data.chunk || ''}`);
      } else {
        addMessage({
          id: data.messageId,
          roomId: roomId!,
          senderType: 'ai',
          senderAiModelId: data.aiModelId,
          content: data.chunk || '',
          contentType: 'text',
          mentions: [],
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: sender?.aiModel ? {
            id: sender.aiModel.id,
            username: sender.aiModel.displayName,
            avatarUrl: undefined,
          } : undefined,
        });
      }
    });

    // AI输出完成
    socketService.on('message:ai:complete', (data: { messageId: string; content: string }) => {
      updateMessage(data.messageId, data.content || '');
    });

    socketService.on('message:ai:error', (data: { messageId: string; error: string }) => {
      updateMessage(data.messageId, data.error || 'AI响应失败');
    });

    // 成员加入
    socketService.on('member:joined', () => {
      // 刷新成员列表
      loadRoomData();
    });

    // 成员离开
    socketService.on('member:left', () => {
      // 刷新成员列表
      loadRoomData();
    });
  };

  const openAddMember = async () => {
    setAddMemberVisible(true);
    setModelsLoading(true);
    try {
      const data = await api.getModels();
      setModels(data.filter((model: AIModelOption) => model.isActive));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message || '加载模型失败');
    } finally {
      setModelsLoading(false);
    }
  };

  const handleAddMember = async (values: { aiModelId: string; aiPrompt?: string }) => {
    try {
      await api.addRoomMember(roomId!, {
        memberType: 'ai',
        aiModelId: values.aiModelId,
        aiPrompt: values.aiPrompt,
      });
      message.success('添加成员成功');
      setAddMemberVisible(false);
      addMemberForm.resetFields();
      loadRoomData();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message || '添加成员失败');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除成员 "${memberName}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.removeRoomMember(roomId!, memberId);
          message.success('成员已删除');
          loadRoomData();
        } catch (error: unknown) {
          const axiosError = error as { response?: { data?: { message?: string } } };
          message.error(axiosError.response?.data?.message || '删除成员失败');
        }
      },
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isOwner = (member: RoomMember) => member?.role === 'owner';
  const isAdmin = (member: RoomMember) => member?.role === 'admin';
  const canManageMembers = (member: RoomMember) => isOwner(member) || isAdmin(member);
  const hasAI = members.some((member: RoomMember) => member?.memberType === 'ai');
  const currentUserMember = members.find((m) => m.user?.id === user?.id);
  const userCanManage = currentUserMember ? canManageMembers(currentUserMember) : false;

  return (
    <ErrorBoundary
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Empty description="页面加载失败，请刷新重试">
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          </Empty>
        </div>
      }
    >
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
              {hasAI && ' · AI已加入'}
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
              renderItem={(message, index) => {
                const isOwn = message.senderUserId === user?.id;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const isSameSender = prevMessage && prevMessage.senderUserId === message.senderUserId && 
                                     prevMessage.senderAiModelId === message.senderAiModelId;
                
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      marginBottom: isSameSender ? 4 : 16,
                      marginTop: isSameSender ? 0 : 8,
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isOwn ? 'row-reverse' : 'row', 
                      maxWidth: '80%',
                      alignItems: 'flex-start',
                    }}>
                      {/* 头像 - 连续消息不重复显示 */}
                      <div style={{ width: 40, flexShrink: 0 }}>
                        {!isSameSender && (
                          <Avatar
                            icon={message.senderType === 'ai' ? <RobotOutlined /> : <UserOutlined />}
                            style={{ margin: isOwn ? '0 0 0 8px' : '0 8px 0 0' }}
                          />
                        )}
                      </div>
                      
                      <div style={{ maxWidth: 'calc(100% - 48px)' }}>
                        {/* 用户名 - 连续消息不重复显示 */}
                          {!isSameSender && (
                          <div style={{ marginBottom: 4, fontSize: 12, textAlign: isOwn ? 'right' : 'left' }}>
                            <Text type="secondary">
                              {message.sender?.username || 'AI助手'}
                              {message.senderType === 'ai' && (
                                <span style={{ marginLeft: 4, color: '#667eea' }}>AI</span>
                              )}
                            </Text>
                          </div>
                        )}
                        
                        {/* 消息气泡 */}
                        <div
                          style={{
                            background: isOwn ? '#95ec69' : '#fff',
                            color: '#000',
                            padding: '10px 14px',
                            borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: 15,
                            lineHeight: 1.5,
                          }}
                        >
                          {message.content}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary">({members.length})</Text>
              <Button size="small" type="link" onClick={openAddMember}>
                添加成员
              </Button>
            </div>
          </div>

          <List
            dataSource={members}
            renderItem={(member) => (
              <List.Item
                style={{ padding: '8px 0' }}
                actions={
                  userCanManage && member.memberType === 'ai' && !isOwner(member)
                    ? [
                        <Button
                          key="delete"
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            handleRemoveMember(
                              member.id,
                              member.aiModel?.displayName || 'AI成员'
                            )
                          }
                        >
                          删除
                        </Button>,
                      ]
                    : undefined
                }
              >
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
                    {isAdmin(member) && (
                      <Text type="secondary" style={{ fontSize: 12 }}>管理员</Text>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Sider>

      <Modal
        title="添加AI成员"
        open={addMemberVisible}
        onCancel={() => setAddMemberVisible(false)}
        footer={null}
      >
        <Form form={addMemberForm} layout="vertical" onFinish={handleAddMember}>
          <Form.Item
            name="aiModelId"
            label="选择模型"
            rules={[{ required: true, message: '请选择模型' }]}
          >
            <Select placeholder="请选择AI模型" loading={modelsLoading}>
              {models.map((model) => (
                <Option key={model.id} value={model.id}>
                  {model.displayName} · {model.provider}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="aiPrompt"
            label="角色提示词"
          >
            <Input.TextArea
              placeholder="为该房间里的AI设置角色或行为（可选）"
              rows={3}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setAddMemberVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
    </ErrorBoundary>
  );
};

export default ChatRoomPage;
