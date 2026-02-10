import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import DebateRoom from '../components/debate/DebateRoom';

const DebatePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // 如果没有roomId，显示房间列表占位
  if (!roomId) {
    return (
      <div className="debate-page">
        <Card
          title="🎭 AI辩论模式"
          extra={
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
              返回首页
            </Button>
          }
        >
          <Empty description="请从房间列表进入辩论或创建新辩论" />
        </Card>
      </div>
    );
  }

  return (
    <div className="debate-page">
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/rooms')}
        style={{ marginBottom: 16 }}
      >
        返回房间列表
      </Button>
      <DebateRoom roomId={roomId} />
    </div>
  );
};

export default DebatePage;
