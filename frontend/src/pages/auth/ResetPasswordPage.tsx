import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, App } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

const ResetPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { message } = App.useApp();

  useEffect(() => {
    console.log('[ResetPasswordPage] URL:', window.location.href);
    console.log('[ResetPasswordPage] Token from URL:', token);
    console.log('[ResetPasswordPage] Token length:', token?.length);
    if (!token) {
      message.error('无效的重置链接');
    }
  }, [token, message]);

  const onFinish = async (values: { password: string; confirmPassword: string }) => {
    console.log('[ResetPasswordPage] Submitting with token:', token?.substring(0, 20) + '...');
    if (!token) {
      message.error('无效的重置令牌');
      return;
    }

    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, values.password);
      setSubmitted(true);
      message.success('密码重置成功！');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message || '重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      }}>
        <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <Alert
            message="无效链接"
            description="重置密码链接无效或已过期，请重新申请。"
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <div style={{ textAlign: 'center' }}>
            <Link to="/forgot-password">重新申请</Link> | <Link to="/login">返回登录</Link>
          </div>
        </Card>
      </div>
    );
  }

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
          <Title level={2}>重置密码</Title>
          <Text type="secondary">设置您的新密码</Text>
        </div>

        {submitted ? (
          <>
            <Alert
              message="重置成功"
              description="您的密码已重置成功，正在跳转到登录页面..."
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <div style={{ textAlign: 'center' }}>
              <Link to="/login">立即登录</Link>
            </div>
          </>
        ) : (
          <Form
            name="reset-password"
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 8, message: '密码至少8个字符' },
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="新密码（至少8位，包含大小写）" 
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[
                { required: true, message: '请确认密码' },
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="确认密码" 
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                重置密码
              </Button>
            </Form.Item>
          </Form>
        )}

        {!submitted && (
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">返回登录</Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
