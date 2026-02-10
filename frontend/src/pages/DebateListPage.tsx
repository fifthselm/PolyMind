import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Button, Modal, Form, Input, message, Empty, Tag, Space } from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { api } from '../services/api';

interface DebateRoom {
  id: string;
  topic: string;
  positionA: string;
  positionB: string;
  status: 'preparing' | 'active' | 'completed';
  currentRound: number;
  maxRounds: number;
  createdAt: string;
}

const DebateListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [debateRooms, setDebateRooms] = useState<DebateRoom[]>([
    {
      id: 'demo-1',
      topic: 'AI是否会让人类失业',
      positionA: '正方：AI会导致大规模失业',
      positionB: '反方：AI会创造更多就业机会',
      status: 'preparing',
      currentRound: 0,
      maxRounds: 4,
      createdAt: new Date().toISOString(),
    },
  ]);

  const handleCreate = async (values: { topic: string; positionA: string; positionB: string; maxRounds: number }) => {
    setLoading(true);
    try {
      // 这里调用API创建辩论房间
      const newRoom: DebateRoom = {
        id: `debate-${Date.now()}`,
        topic: values.topic,
        positionA: values.positionA,
        positionB: values.positionB,
        status: 'preparing',
        currentRound: 0,
        maxRounds: values.maxRounds || 4,
        createdAt: new Date().toISOString(),
      };
      setDebateRooms((prev) => [newRoom, ...prev]);
      message.success('创建成功');
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (roomId: string) => {
    navigate(`/debate/${roomId}`);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      preparing: 'orange',
      active: 'green',
      completed: 'blue',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      preparing: '准备中',
      active: '进行中',
      completed: '已结束',
    };
    return texts[status] || status;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>🎭 AI辩论</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          创建辩论
        </Button>
      </div>

      {debateRooms.length === 0 ? (
        <Card>
          <Empty description="暂无辩论房间" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => setCreateModalVisible(true)}>
              创建第一个辩论
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
          dataSource={debateRooms}
          renderItem={(room) => (
            <List.Item>
              <Card hoverable onClick={() => handleJoin(room.id)}>
                <Card.Meta
                  title={
                    <Space>
                      <span>{room.topic}</span>
                      <Tag color={getStatusColor(room.status)}>{getStatusText(room.status)}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <Tag color="blue">正方：{room.positionA}</Tag>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <Tag color="red">反方：{room.positionB}</Tag>
                      </div>
                      <Space>
                        <TeamOutlined /> {room.currentRound} / {room.maxRounds} 轮
                      </Space>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      )}

      <Modal
        title="创建辩论"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="topic"
            label="辩题"
            rules={[{ required: true, message: '请输入辩题' }]}
          >
            <Input placeholder="例如：AI是否会让人类失业" />
          </Form.Item>

          <Form.Item
            name="positionA"
            label="正方观点"
            rules={[{ required: true, message: '请输入正方观点' }]}
          >
            <Input placeholder="正方观点描述" />
          </Form.Item>

          <Form.Item
            name="positionB"
            label="反方观点"
            rules={[{ required: true, message: '请输入反方观点' }]}
          >
            <Input placeholder="反方观点描述" />
          </Form.Item>

          <Form.Item name="maxRounds" label="辩论轮数" initialValue={4}>
            <Input type="number" min={1} max={10} placeholder="辩论轮数" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DebateListPage;
