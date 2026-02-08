import React, { useState } from 'react';
import { Card, Button, Input, Select, message } from 'antd';
import { generateMindMap } from '../services/api';
import MindMapViewer from '../components/mind-map/MindMapViewer';

const MindMapPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState('mindmap');
  const [mermaidCode, setMermaidCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!title.trim()) {
      message.warning('请输入主题');
      return;
    }

    setLoading(true);
    try {
      const result = await generateMindMap({
        title,
        layout,
        messages: [{ role: 'user', content: title }],
      });
      setMermaidCode(result.mermaidCode);
    } catch (error) {
      message.error('生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mindmap-page">
      <Card
        title="🧠 思维导图生成"
        extra={
          <Button type="primary" onClick={handleGenerate} loading={loading}>
            生成
          </Button>
        }
      >
        <div className="input-area" style={{ marginBottom: 16 }}>
          <Input
            placeholder="输入对话主题或内容..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onPressEnter={handleGenerate}
          />
          <Select value={layout} onChange={setLayout} style={{ width: 120, marginLeft: 8 }}>
            <Select.Option value="mindmap">脑图</Select.Option>
            <Select.Option value="flowchart">流程图</Select.Option>
            <Select.Option value="timeline">时间线</Select.Option>
            <Select.Option value="tree">树状图</Select.Option>
          </Select>
        </div>

        {mermaidCode && (
          <MindMapViewer mermaidCode={mermaidCode} title={title} />
        )}
      </Card>
    </div>
  );
};

export default MindMapPage;
