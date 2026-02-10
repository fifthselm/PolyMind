import React, { useState } from 'react';
import { Card, Button, message } from 'antd';
import { api } from '../../services/api';

export const RolePlayRoom: React.FC<{
  scenario: {
    id: string;
    name: string;
    systemPrompt: string;
  };
}> = ({ scenario }) => {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'system', content: scenario.systemPrompt },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.sendMessage(scenario.id, { content: input });
      setMessages((prev) => [...prev, { role: 'assistant', content: response.content }]);
    } catch (error) {
      message.error('发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-play-room">
      <Card title={`🎭 ${scenario.name}`} className="chat-container">
        <div className="messages">
          {messages.slice(1).map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <strong>{msg.role === 'user' ? '你' : 'AI'}:</strong>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>

        <div className="input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`与${scenario.name}对话...`}
            onKeyDown={(e: React.KeyboardEvent) => !e.shiftKey && e.key === 'Enter' && (e.preventDefault(), handleSend())}
          />
          <Button type="primary" onClick={handleSend} loading={loading}>
            发送
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RolePlayRoom;
