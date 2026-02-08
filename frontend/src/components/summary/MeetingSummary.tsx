import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Typography,
  Spin,
  Empty,
  Button,
  Tag,
  Space,
  List,
  Tooltip,
  Divider,
  Progress,
  Collapse,
  message,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import MarkdownRenderer from '../chat/MarkdownRenderer';

const { Title, Text, Paragraph } = Typography;

interface ActionItem {
  id: string;
  content: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface MeetingSummaryData {
  id: string;
  summaryType: 'brief' | 'detailed' | 'executive';
  content: string;
  keyTopics: string[];
  decisions: string[];
  generatedAt: string;
}

interface MeetingSummaryProps {
  meetingId: string;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
}

const MeetingSummary: React.FC<MeetingSummaryProps> = ({
  meetingId,
  onExportMarkdown,
  onExportPdf,
}) => {
  const [summary, setSummary] = useState<MeetingSummaryData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 获取摘要和行动项
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const meeting = await api.getMeeting(meetingId);
      setSummary(meeting.summary || null);
      setActionItems(meeting.actionItems || []);
    } catch (error) {
      console.error('获取摘要失败:', error);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 生成摘要
  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      await api.generateSummary(meetingId);
      message.success('摘要生成成功');
      fetchData();
    } catch (error) {
      message.error('生成摘要失败');
    } finally {
      setGenerating(false);
    }
  };

  // 提取行动项
  const handleExtractActionItems = async () => {
    setGenerating(true);
    try {
      await api.extractActionItems(meetingId);
      message.success('行动项提取成功');
      fetchData();
    } catch (error) {
      message.error('提取行动项失败');
    } finally {
      setGenerating(false);
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'red',
      medium: 'orange',
      low: 'green',
    };
    return colors[priority] || 'default';
  };

  // 获取优先级文本
  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return texts[priority] || priority;
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'in_progress':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  // 获取摘要类型标签
  const getSummaryTypeLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      brief: { text: '简要', color: 'blue' },
      detailed: { text: '详细', color: 'green' },
      executive: { text: '高管', color: 'purple' },
    };
    return labels[type] || { text: type, color: 'default' };
  };

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <span>会议摘要</span>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="导出Markdown">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={onExportMarkdown}
            >
              MD
            </Button>
          </Tooltip>
          <Tooltip title="导出PDF">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={onExportPdf}
            >
              PDF
            </Button>
          </Tooltip>
        </Space>
      }
      bodyStyle={{ padding: 16, height: 'calc(100vh - 180px)', overflow: 'auto' }}
    >
      <Spin spinning={loading || generating}>
        {/* 操作按钮 */}
        {!summary && (
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={handleGenerateSummary}
              loading={generating}
            >
              生成摘要
            </Button>
          </div>
        )}

        {summary && (
          <>
            {/* 摘要元信息 */}
            <div style={{ marginBottom: 16 }}>
              <Space split={<Divider type="vertical" />}>
                <Tag color={getSummaryTypeLabel(summary.summaryType).color}>
                  {getSummaryTypeLabel(summary.summaryType).text}摘要
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  生成时间:{' '}
                  {new Date(summary.generatedAt).toLocaleString('zh-CN')}
                </Text>
              </Space>
            </div>

            {/* 摘要内容 */}
            <Collapse
              defaultActiveKey={['summary']}
              style={{ marginBottom: 16 }}
              items={[
                {
                  key: 'summary',
                  label: (
                    <Space>
                      <BulbOutlined />
                      <Text strong>摘要内容</Text>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: '8px 0' }}>
                      <MarkdownRenderer content={summary.content} />
                    </div>
                  ),
                },
              ]}
            />

            {/* 关键话题 */}
            {summary.keyTopics.length > 0 && (
              <Collapse
                style={{ marginBottom: 16 }}
                items={[
                  {
                    key: 'topics',
                    label: (
                      <Space>
                        <BulbOutlined />
                        <Text strong>关键话题</Text>
                        <Tag>{summary.keyTopics.length}</Tag>
                      </Space>
                    ),
                    children: (
                      <List
                        size="small"
                        dataSource={summary.keyTopics}
                        renderItem={(topic) => (
                          <List.Item>
                            <Text>{topic}</Text>
                          </List.Item>
                        )}
                      />
                    ),
                  },
                ]}
              />
            )}

            {/* 已达成的决策 */}
            {summary.decisions.length > 0 && (
              <Collapse
                style={{ marginBottom: 16 }}
                items={[
                  {
                    key: 'decisions',
                    label: (
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text strong>决策</Text>
                        <Tag color="green">{summary.decisions.length}</Tag>
                      </Space>
                    ),
                    children: (
                      <List
                        size="small"
                        dataSource={summary.decisions}
                        renderItem={(decision) => (
                          <List.Item>
                            <Space>
                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              <Text>{decision}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ),
                  },
                ]}
              />
            )}

            <Divider />
          </>
        )}

        {/* 行动项 */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Space>
              <Text strong>
                <CheckCircleOutlined style={{ color: '#1890ff' }} /> 行动项
              </Text>
              <Tag>{actionItems.length}</Tag>
            </Space>
          </div>

          {actionItems.length === 0 ? (
            <Empty
              description="暂无行动项"
              style={{ margin: '16px 0' }}
            >
              <Button
                size="small"
                onClick={handleExtractActionItems}
                loading={generating}
              >
                从转录中提取
              </Button>
            </Empty>
          ) : (
            <List
              size="small"
              dataSource={actionItems}
              renderItem={(item) => (
                <List.Item>
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <div style={{ marginTop: 2 }}>
                      {getStatusIcon(item.status)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Tag color={getPriorityColor(item.priority)} style={{ margin: 0 }}>
                          {getPriorityText(item.priority)}
                        </Tag>
                        {item.assignee && (
                          <Tag icon={<UserOutlined />} style={{ margin: 0 }}>
                            {item.assignee}
                          </Tag>
                        )}
                      </div>
                      <Text style={{ textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>
                        {item.content}
                      </Text>
                      {item.dueDate && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                          <ClockCircleOutlined /> 截止:{' '}
                          {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                        </Text>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </Spin>
    </Card>
  );
};

export default MeetingSummary;
