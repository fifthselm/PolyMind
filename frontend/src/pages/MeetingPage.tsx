import React, { useState, useEffect } from 'react';
import { Card, List, Button, message } from 'antd';
import { getMeetings, createMeeting } from '../services/api';
import MeetingSummary from '../components/summary/MeetingSummary';

const MeetingPage: React.FC = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch (error) {
      message.error('加载会议失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const meeting = await createMeeting({
        title: `会议 ${new Date().toLocaleString()}`,
      });
      setMeetings((prev) => [meeting, ...prev]);
      message.success('创建成功');
    } catch (error) {
      message.error('创建失败');
    }
  };

  if (selectedMeeting) {
    return <MeetingSummary meetingId={selectedMeeting.id} />;
  }

  return (
    <div className="meeting-page">
      <Card
        title="📅 会议纪要"
        extra={<Button type="primary" onClick={handleCreate}>新建会议</Button>}
      >
        <List
          dataSource={meetings}
          loading={loading}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button onClick={() => setSelectedMeeting(item)}>查看</Button>,
              ]}
            >
              <List.Item.Meta title={item.title} description={item.status} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default MeetingPage;
