import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography, Alert } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      await api.forgotPassword(values.email);
      setSubmitted(true);
      message.success('重置密码邮件已发送，请查收');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message || '发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>找回密码</Title>
          <Text type="secondary">输入您的邮箱地址，我们将发送重置密码链接</Text>
        </div>

        {submitted ? (
          <>
            <Alert
              message="邮件已发送"
              description="请检查您的邮箱（包括垃圾邮件文件夹），点击邮件中的链接重置密码。"
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <div style={{ textAlign: 'center' }}>
              <Text>想起密码了？</Text> <Link to="/login">返回登录</Link>
            </div>
          </>
        ) : (
          <Form
            name="forgot-password"
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入注册邮箱" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                发送重置邮件
              </Button>
            </Form.Item>
          </Form>
        )}

        {!submitted && (
          <div style={{ textAlign: 'center' }}>
            <Text>想起密码了？</Text> <Link to="/login">返回登录</Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
