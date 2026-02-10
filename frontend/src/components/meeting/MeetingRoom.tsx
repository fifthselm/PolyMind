import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  List,
  Tag,
  Modal,
  Form,
  DatePicker,
  Space,
  Typography,
  Spin,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getMeetings, createMeeting, getMeeting, addTranscript, generateSummary, exportMeetingMarkdown, exportMeetingPdf } from '../../services/api';
import MeetingSummary from '../summary/MeetingSummary';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  participants: string[];
  createdAt: string;
}

interface Transcript {
  id: string;
  content: string;
  speaker?: string;
  timestamp: string;
}

const MeetingRoom: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // 获取会议列表
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('获取会议列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // 创建会议
  const handleCreateMeeting = async (values: any) => {
    try {
      await createMeeting({
        title: values.title,
        description: values.description,
      });
      setShowCreateModal(false);
      fetchMeetings();
    } catch (error) {
      console.error('创建会议失败:', error);
    }
  };

  // 选择会议
  const handleSelectMeeting = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setLoading(true);
    try {
      const detail = await getMeeting(meeting.id);
      setTranscripts(detail.transcript || []);
    } catch (error) {
      console.error('获取会议详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 添加转录文本
  const handleAddTranscript = async () => {
    if (!selectedMeeting || !transcriptInput.trim()) return;

    try {
      await addTranscript(selectedMeeting.id, transcriptInput.trim());
      setTranscriptInput('');
      setShowTranscriptModal(false);
      // 刷新转录列表
      const detail = await getMeeting(selectedMeeting.id);
      setTranscripts(detail.transcript || []);
    } catch (error) {
      console.error('添加转录失败:', error);
    }
  };

  // 生成摘要
  const handleGenerateSummary = async () => {
    if (!selectedMeeting) return;
    setGeneratingSummary(true);
    try {
      await generateSummary(selectedMeeting.id);
      // 刷新会议详情
      const detail = await getMeeting(selectedMeeting.id);
      setSelectedMeeting(detail);
    } catch (error) {
      console.error('生成摘要失败:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // 导出Markdown
  const handleExportMarkdown = async () => {
    if (!selectedMeeting) return;
    try {
      const markdown = await exportMeetingMarkdown(selectedMeeting.id);
      // 下载文件
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-${selectedMeeting.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出Markdown失败:', error);
    }
  };

  // 导出PDF
  const handleExportPdf = async () => {
    if (!selectedMeeting) return;
    try {
      const pdfBuffer = await exportMeetingPdf(selectedMeeting.id);
      // 下载文件
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-${selectedMeeting.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出PDF失败:', error);
    }
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'blue',
      in_progress: 'green',
      completed: 'default',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      scheduled: '已安排',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return texts[status] || status;
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 16 }}>
      {/* 左侧会议列表 */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <Card
          title={
            <Space>
              <VideoCameraOutlined />
              <span>会议列表</span>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            >
              新建会议
            </Button>
          }
          bodyStyle={{ padding: 8, height: 'calc(100vh - 180px)', overflow: 'auto' }}
        >
          <Spin spinning={loading}>
            {meetings.length === 0 ? (
              <Empty description="暂无会议" />
            ) : (
              <List
                dataSource={meetings}
                renderItem={(meeting) => (
                  <List.Item
                    onClick={() => handleSelectMeeting(meeting)}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 8px',
                      background:
                        selectedMeeting?.id === meeting.id
                          ? '#e6f7ff'
                          : 'transparent',
                      borderRadius: 8,
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{meeting.title}</Text>
                          <Tag color={getStatusColor(meeting.status)}>
                            {getStatusText(meeting.status)}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <ClockCircleOutlined />{' '}
                            {dayjs(meeting.createdAt).format(
                              'YYYY-MM-DD HH:mm',
                            )}
                          </Text>
                          {meeting.participants.length > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <TeamOutlined /> {meeting.participants.length}人参与
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </Card>
      </div>

      {/* 中间转录区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>
                {selectedMeeting ? selectedMeeting.title : '选择会议查看转录'}
              </span>
            </Space>
          }
          extra={
            selectedMeeting && (
              <Space>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setShowTranscriptModal(true)}
                >
                  添加转录
                </Button>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  loading={generatingSummary}
                  onClick={handleGenerateSummary}
                >
                  生成摘要
                </Button>
              </Space>
            )
          }
          bodyStyle={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            overflow: 'auto',
          }}
        >
          {!selectedMeeting ? (
            <Empty description="请从左侧选择一个会议" />
          ) : (
            <Spin spinning={loading}>
              {transcripts.length === 0 ? (
                <Empty description="暂无转录文本">
                  <Button
                    type="primary"
                    onClick={() => setShowTranscriptModal(true)}
                  >
                    添加转录文本
                  </Button>
                </Empty>
              ) : (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {transcripts.map((transcript, index) => (
                    <div
                      key={transcript.id}
                      style={{
                        marginBottom: 16,
                        padding: 12,
                        background: '#f5f5f5',
                        borderRadius: 8,
                      }}
                    >
                      <Space>
                        <Text strong style={{ color: '#1890ff' }}>
                          {transcript.speaker || `发言人 ${index + 1}`}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(transcript.timestamp).format('HH:mm:ss')}
                        </Text>
                      </Space>
                      <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                        {transcript.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Spin>
          )}
        </Card>
      </div>

      {/* 右侧摘要区 */}
      <div style={{ width: 400, flexShrink: 0 }}>
        {selectedMeeting && (
          <MeetingSummary
            meetingId={selectedMeeting.id}
            onExportMarkdown={handleExportMarkdown}
            onExportPdf={handleExportPdf}
          />
        )}
      </div>

      {/* 创建会议弹窗 */}
      <Modal
        title="创建会议"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleCreateMeeting}>
          <Form.Item
            name="title"
            label="会议标题"
            rules={[{ required: true, message: '请输入会议标题' }]}
          >
            <Input placeholder="请输入会议标题" />
          </Form.Item>

          <Form.Item name="description" label="会议描述">
            <TextArea rows={3} placeholder="请输入会议描述（可选）" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加转录弹窗 */}
      <Modal
        title="添加转录文本"
        open={showTranscriptModal}
        onCancel={() => setShowTranscriptModal(false)}
        onOk={handleAddTranscript}
        okText="添加"
      >
        <Form layout="vertical">
          <Form.Item label="发言人">
            <Input
              placeholder="发言人姓名（可选）"
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="转录内容">
            <TextArea
              rows={8}
              placeholder="请粘贴会议转录文本..."
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MeetingRoom;
