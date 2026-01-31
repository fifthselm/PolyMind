import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Button, Modal, Form, Input, message, Empty, Spin } from 'antd';
import { PlusOutlined, MessageOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useRoomStore } from '../../stores/roomStore';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { rooms, setRooms } = useRoomStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await api.getRooms();
      setRooms(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载房间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (values: { name: string; description: string }) => {
    try {
      const room = await api.createRoom(values);
      message.success('创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      navigate(`/rooms/${room.id}`);
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/rooms/${roomId}`);
  };

  return (
    <div style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>我的群聊</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建房间
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
          <Spin size="large" />
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <Empty
            description="还没有群聊房间"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => setCreateModalVisible(true)}>
              创建第一个房间
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
          dataSource={rooms}
          renderItem={(room) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => handleJoinRoom(room.id)}
                style={{ borderRadius: 8 }}
              >
                <Card.Meta
                  avatar={
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 20,
                    }}>
                      <MessageOutlined />
                    </div>
                  }
                  title={room.name}
                  description={
                    <div>
                      <span style={{ marginRight: 16 }}>
                        <TeamOutlined /> {room.members?.length || 0} 成员
                      </span>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      )}

      <Modal
        title="创建群聊房间"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRoom}
        >
          <Form.Item
            name="name"
            label="房间名称"
            rules={[{ required: true, message: '请输入房间名称' }]}
          >
            <Input placeholder="输入房间名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="房间描述"
          >
            <Input.TextArea placeholder="输入房间描述（可选）" rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DashboardPage;
