// 辩论提示词模板

export const debatePrompts = {
  // 正方开场
  openingA: (topic: string) => `
你代表【${topic}】的正方立场。

任务：清晰阐述支持该观点的核心理由，用1-2个有力论据支撑。
风格：专业、有说服力、简洁（200字内）
`,

  // 反方开场
  openingB: (topic: string) => `
你代表【${topic}】的反方立场。

任务：清晰阐述反对该观点的核心理由，用1-2个有力论据支撑。
风格：专业、有说服力、简洁（200字内）
`,

  // 正方论点
  argumentA: (topic: string, context: string) => `
作为正方，针对以下讨论继续阐述：

上下文：${context}

请提出新的论点或深化已有论点，回应反方的质疑。
`,

  // 反方论点
  argumentB: (topic: string, context: string) => `
作为反方，针对以下讨论继续阐述：

上下文：${context}

请提出新的论点或深化已有论点，回应正方的质疑。
`,

  // 总结陈词
  closing: (topic: string, context: string, position: 'A' | 'B') => {
    const stance = position === 'A' ? '支持' : '反对';
    return `
作为${stance}方，做最后总结陈词。

讨论回顾：${context.slice(0, 500)}

请总结你的核心观点，重申立场，并对反方观点进行简要反驳。
`;
  },

  // 客观总结
  summary: (topic: string, debateHistory: string) => `
作为中立主持人，客观总结以下辩论：

主题：${topic}

辩论过程：
${debateHistory.slice(0, 1000)}

请总结：
1. 正方核心观点
2. 反方核心观点
3. 双方共识（如果有）
4. 主要分歧
5. 客观评价
`,
};
