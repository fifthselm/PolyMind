import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button, Modal, message } from 'antd';
import { getRoleScenarios, getScenarioPrompt } from '../services/api';
import RoleScenarioCard from '../components/role-scenario/RoleScenarioCard';
import RolePlayRoom from '../components/role-play/RolePlayRoom';

const RoleScenariosPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await getRoleScenarios();
      setScenarios(data);
    } catch (error) {
      message.error('加载场景失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    const scenario = scenarios.find((s) => s.id === id);
    if (scenario) {
      setSelectedScenario(scenario);
    }
  };

  if (selectedScenario) {
    return <RolePlayRoom scenario={selectedScenario} />;
  }

  return (
    <div className="role-scenarios-page">
      <Card title="🎭 角色扮演场景" extra={<Button onClick={loadScenarios}>刷新</Button>}>
        <List
          grid={{ gutter: 16, column: 3 }}
          dataSource={scenarios}
          loading={loading}
          renderItem={(item) => (
            <List.Item>
              <RoleScenarioCard scenario={item} onSelect={handleSelect} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default RoleScenariosPage;
