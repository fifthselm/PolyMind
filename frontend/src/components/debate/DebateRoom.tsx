import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Card, Button, Slider, Modal, Tag } from 'antd';
import { PlayCircleOutlined, TrophyOutlined, MessageOutlined } from '@ant-design/icons';
import { useSocket } from '../../hooks/useSocket';

interface DebateRoom {
  id: string;
  topic: string;
  positionA: { name: string; score: number };
  positionB: { name: string; score: number };
  currentRound: number;
  maxRounds: number;
  status: 'preparing' | 'active' | 'completed';
}

interface Message {
  id: string;
  position: 'A' | 'B';
  content: string;
  round: number;
  timestamp: Date;
}

export const DebateRoom: React.FC<{ roomId: string }> = ({ roomId }) => {
  const navigate = useNavigate();
  const { socket } = useSocket('/debates');
  const [debate, setDebate] = useState<DebateRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [scores, setScores] = useState({ A: 5, B: 5 });

  useEffect(() => {
    if (socket) {
      socket.emit('debate:join', { roomId });

      socket.on('debate:state', (state: any) => {
        if (state) {
          setDebate({
            id: state.id,
            topic: state.topic,
            positionA: { name: '正方', score: state.scores?.A || 0 },
            positionB: { name: '反方', score: state.scores?.B || 0 },
            currentRound: state.currentRound,
            maxRounds: state.maxRounds,
            status: state.status,
          });
        }
      });

      socket.on('debate:turn', (data: any) => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          position: data.position,
          content: data.content,
          round: data.round,
          timestamp: new Date(),
        }]);
        setLoading(false);
      });

      socket.on('debate:result', (data: any) => {
        setDebate(prev => prev ? ({
          ...prev,
          status: 'completed',
          positionA: { ...prev.positionA, score: data.scores.A },
          positionB: { ...prev.positionB, score: data.scores.B },
        }) : null);
        setShowScore(false);
        message.success(`辩论结束！胜方：${data.winner === 'A' ? '正方' : data.winner === 'B' ? '反方' : '平局'}`);
      });
    }
  }, [socket, roomId]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    await socket?.emit('debate:start', { roomId });
  }, [socket, roomId]);

  const handleNext = useCallback(async () => {
    if (!debate) return;
    if (debate.status !== 'active') {
      message.warning('辩论未开始');
      return;
    }
    setLoading(true);
    await socket?.emit('debate:next', { roomId });
  }, [socket, roomId, debate]);

  const handleScore = useCallback(async () => {
    await socket?.emit('debate:score', { roomId, scores });
    setShowScore(false);
  }, [socket, roomId, scores]);

  if (!debate) {
    return <div>加载中...</div>;
  }

  return (
    <div className="debate-room">
      {/* 头部 */}
      <Card className="debate-header">
        <h2>🎭 {debate.topic}</h2>
        <div className="status-bar">
          <Tag color={debate.status === 'active' ? 'green' : debate.status === 'completed' ? 'blue' : 'orange'}>
            {debate.status === 'preparing' ? '准备中' : debate.status === 'active' ? '进行中' : '已结束'}
          </Tag>
          <span>第 {debate.currentRound} / {debate.maxRounds} 轮</span>
        </div>
      </Card>

      {/* 辩论双方 */}
      <div className="debate-stage">
        <Card className="position-card A" title={`🤖 ${debate.positionA.name}`}>
          <div className="score-badge">📊 {debate.positionA.score}</div>
          <div className="messages">
            {messages.filter(m => m.position === 'A').map(m => (
              <div key={m.id} className="message A">
                {m.content}
              </div>
            ))}
          </div>
        </Card>

        <Card className="position-card B" title={`🤖 ${debate.positionB.name}`}>
          <div className="score-badge">📊 {debate.positionB.score}</div>
          <div className="messages">
            {messages.filter(m => m.position === 'B').map(m => (
              <div key={m.id} className="message B">
                {m.content}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 控制台 */}
      <div className="debate-controls">
        {debate.status === 'preparing' && (
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart} loading={loading}>
            开始辩论
          </Button>
        )}
        {debate.status === 'active' && (
          <>
            <Button icon={<MessageOutlined />} onClick={handleNext} loading={loading}>
              下一轮
            </Button>
            <Button icon={<TrophyOutlined />} onClick={() => setShowScore(true)}>
              结束评分
            </Button>
          </>
        )}
        {debate.status === 'completed' && (
          <Button type="primary" onClick={() => navigate('/rooms')}>
            返回房间列表
          </Button>
        )}
      </div>

      {/* 评分弹窗 */}
      <Modal
        title="🏆 评分"
        open={showScore}
        onOk={handleScore}
        onCancel={() => setShowScore(false)}
      >
        <div className="score-panel">
          <div className="score-item">
            <span>正方分数</span>
            <Slider min={0} max={10} value={scores.A} onChange={(v) => setScores(s => ({ ...s, A: v }))} />
            <span className="score-value">{scores.A}</span>
          </div>
          <div className="score-item">
            <span>反方分数</span>
            <Slider min={0} max={10} value={scores.B} onChange={(v) => setScores(s => ({ ...s, B: v }))} />
            <span className="score-value">{scores.B}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DebateRoom;
