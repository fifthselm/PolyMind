import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TestOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface AIModel {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: Date;
}

const { Option } = Select;

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI (GPT-4/3.5)' },
  { value: 'claude', label: 'Anthropic (Claude)' },
  { value: 'gemini', label: 'Google (Gemini)' },
  { value: 'qwen', label: '阿里云 (通义千问)' },
  { value: 'wenxin', label: '百度 (文心一言)' },
  { value: 'glm', label: '智谱AI (GLM)' },
  { value: 'kimi', label: 'Moonshot (Kimi)' },
  { value: 'deepseek', label: 'DeepSeek (深度求索)' },
];

const ModelsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<AIModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await api.getModels();
      setModels(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingModel(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (model: AIModel) => {
    setEditingModel(model);
    form.setFieldsValue({
      displayName: model.displayName,
      provider: model.provider,
      modelName: model.modelName,
      systemPrompt: model.systemPrompt,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.deleteModel(id);
          message.success('删除成功');
          loadModels();
        } catch (error: any) {
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handleTest = async (id: string) => {
    try {
      const result = await api.testModel(id);
      if (result.success) {
        message.success('模型连接测试成功');
      } else {
        message.error('模型连接测试失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '测试失败');
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingModel) {
        await api.updateModel(editingModel.id, values);
        message.success('更新成功');
      } else {
        await api.createModel(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadModels();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '模型名称',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: AIModel) => (
        <Space>
          <span>{text}</span>
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? '启用' : '禁用'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: string) => {
        const option = PROVIDER_OPTIONS.find(o => o.value === provider);
        return option?.label || provider;
      },
    },
    {
      title: '模型',
      dataIndex: 'modelName',
      key: 'modelName',
    },
    {
      title: '温度',
      dataIndex: 'temperature',
      key: 'temperature',
    },
    {
      title: '最大Token',
      dataIndex: 'maxTokens',
      key: 'maxTokens',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: AIModel) => (
        <Space>
          <Button
            type="text"
            icon={<TestOutlined />}
            onClick={() => handleTest(record.id)}
          >
            测试
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>AI模型管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          添加模型
        </Button>
      </div>

      <Card>
        <Table
          loading={loading}
          columns={columns}
          dataSource={models}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingModel ? '编辑模型' : '添加模型'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="displayName"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="给模型起个名字" />
          </Form.Item>

          <Form.Item
            name="provider"
            label="提供商"
            rules={[{ required: true, message: '请选择提供商' }]}
          >
            <Select placeholder="选择AI提供商">
              {PROVIDER_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="modelName"
            label="模型名称"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="如：gpt-4、claude-3-opus" />
          </Form.Item>

          <Form.Item
            name="systemPrompt"
            label="系统提示词"
          >
            <Input.TextArea
              placeholder="设置模型的角色和行为（如：你是我的AI助手）"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="temperature"
            label="温度 (0-2)"
            rules={[{ required: true, message: '请输入温度值' }]}
          >
            <Input type="number" min={0} max={2} step={0.1} placeholder="值越高回复越随机" />
          </Form.Item>

          <Form.Item
            name="maxTokens"
            label="最大Token"
            rules={[{ required: true, message: '请输入最大Token数' }]}
          >
            <Input type="number" min={1} max={32768} placeholder="单次回复的最大长度" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingModel ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelsPage;
