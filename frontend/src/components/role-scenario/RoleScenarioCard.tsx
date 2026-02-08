import React from 'react';

export const RoleScenarioCard: React.FC<{
  scenario: {
    id: string;
    name: string;
    description: string;
    category: string;
    difficulty: string;
  };
  onSelect: (id: string) => void;
}> = ({ scenario, onSelect }) => {
  const difficultyColors = {
    beginner: 'green',
    intermediate: 'blue',
    advanced: 'orange',
    expert: 'red',
  };

  return (
    <div className="role-scenario-card" onClick={() => onSelect(scenario.id)}>
      <h3>{scenario.name}</h3>
      <p>{scenario.description}</p>
      <div className="tags">
        <span className="category">{scenario.category}</span>
        <span className={`difficulty ${difficultyColors[scenario.difficulty]}`}>
          {scenario.difficulty}
        </span>
      </div>
    </div>
  );
};

export default RoleScenarioCard;
