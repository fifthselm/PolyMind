import React, { useState } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, message, Typography } from 'antd';
import { UserOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

const { Title } = Typography;

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useAuthStore();
  const [form] = Form.useForm();

  const handleSubmit = async (values: { username?: string; email?: string; avatarUrl?: string }) => {
    setLoading(true);
    try {
      const updatedUser = await api.updateUser(values);
      updateUser(updatedUser);
      message.success('保存成功');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={3}>账户设置</Title>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}>个人信息</Title>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Avatar size={64} icon={<UserOutlined />} src={user?.avatarUrl} />
          <div style={{ marginLeft: 16 }}>
            <Upload showUploadList={false}>
              <Button icon={<UploadOutlined />}>更换头像</Button>
            </Upload>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            username: user?.username,
            email: user?.email,
          }}
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
          >
            <Input placeholder="邮箱" disabled />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}>安全设置</Title>
        
        <Form layout="vertical">
          <Form.Item
            name="currentPassword"
            label="当前密码"
          >
            <Input.Password placeholder="输入当前密码" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
          >
            <Input.Password placeholder="输入新密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary">
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Title level={5}>通知设置</Title>
        
        <Form layout="vertical">
          <Form.Item name="emailNotification" label="邮件通知">
            <Form.Item name="newMessage" valuePropName="checked" noStyle>
              <Input type="checkbox" /> 新消息通知
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Button type="primary">
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;
