/**
 * Mermaid 模板生成器
 * 支持 mindmap、flowchart、timeline 三种布局
 */

interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
}

export class MermaidTemplates {
  /**
   * 思维导图布局
   */
  mindmap(node: MindMapNode): string {
    let result = 'mindmap\n';
    result += `  root(( ${this.escapeText(node.text)} ))\n`;
    result += this.buildMindmapChildren(node.children, 2);
    return result;
  }

  /**
   * 构建思维导图子节点
   */
  private buildMindmapChildren(
    children: MindMapNode[] | undefined,
    indent: number,
  ): string {
    if (!children || children.length === 0) {
      return '';
    }

    let result = '';
    const spaces = ' '.repeat(indent);

    for (const child of children) {
      const text = this.escapeText(child.text);
      
      if (child.children && child.children.length > 0) {
        result += `${spaces}  ${text}\n`;
        result += this.buildMindmapChildren(child.children, indent + 2);
      } else {
        result += `${spaces}  ${text}\n`;
      }
    }

    return result;
  }

  /**
   * 流程图布局
   */
  flowchart(node: MindMapNode): string {
    let result = 'graph TD\n';
    
    // 添加样式定义
    result += '  classDef root fill:#ff6b6b,stroke:#333,stroke-width:2px;\n';
    result += '  classDef topic fill:#4ecdc4,stroke:#333,stroke-width:1px;\n';
    result += '  classDef sub fill:#f7f7f7,stroke:#333,stroke-width:1px;\n\n';

    // 添加节点定义
    result += this.buildFlowchartNodes(node, 'root');

    // 添加节点关系
    result += this.buildFlowchartEdges(node);

    return result;
  }

  /**
   * 构建流程图节点
   */
  private buildFlowchartNodes(node: MindMapNode, className: string): string {
    let result = `  ${node.id}["${this.escapeText(node.text)}"]\n`;
    result += `  class ${node.id} ${className}\n`;

    if (node.children) {
      for (const child of node.children) {
        result += this.buildFlowchartNodes(child, 'topic');
      }
    }

    return result;
  }

  /**
   * 构建流程图边
   */
  private buildFlowchartEdges(node: MindMapNode): string {
    let result = '';

    if (node.children) {
      for (const child of node.children) {
        result += `  ${node.id} --> ${child.id}\n`;
        
        if (child.children) {
          for (const sub of child.children) {
            result += `  ${child.id} -.-> ${sub.id}\n`;
            result += this.buildFlowchartEdges(sub);
          }
        }
      }
    }

    return result;
  }

  /**
   * 时间线布局
   */
  timeline(node: MindMapNode): string {
    let result = 'timeline\n';
    result += `    title ${this.escapeText(node.text)}\n`;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        result += `    ${this.escapeText(child.text)}\n`;
        
        if (child.children) {
          for (const sub of child.children) {
            result += `      : ${this.escapeText(sub.text)}\n`;
          }
        }
      }
    }

    return result;
  }

  /**
   * 特殊流程图布局（带阶段）
   */
  process(node: MindMapNode): string {
    let result = 'graph LR\n';
    
    // 样式定义
    result += '  classDef phase fill:#667eea,stroke:#333,stroke-width:2px,color:white;\n';
    result += '  classDef item fill:#f8b739,stroke:#333,stroke-width:1px;\n\n';

    // 构建阶段节点
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const phaseNode = `phase${i}`;
        result += `  ${phaseNode}("${this.escapeText(child.text)}")\n`;
        result += `  class ${phaseNode} phase\n`;
        
        // 阶段内的子节点
        if (child.children) {
          for (let j = 0; j < child.children.length; j++) {
            const sub = child.children[j];
            const itemNode = `${phaseNode}_item${j}`;
            result += `  ${itemNode}["${this.escapeText(sub.text)}"]\n`;
            result += `  class ${itemNode} item\n`;
            result += `  ${phaseNode} --> ${itemNode}\n`;
          }
        }

        // 连接下一个阶段
        if (i < node.children.length - 1) {
          result += `  phase${i} --> phase${i + 1}\n`;
        }
      }
    }

    return result;
  }

  /**
   * 组织结构图布局
   */
  orgChart(node: MindMapNode): string {
    let result = 'graph TB\n\n';
    
    // 样式定义
    result += '  classDef leader fill:#ff6b6b,stroke:#333,stroke-width:3px,color:white;\n';
    result += '  classDef manager fill:#4ecdc4,stroke:#333,stroke-width:2px;\n';
    result += '  classDef employee fill:#f7f7f7,stroke:#333,stroke-width:1px;\n\n';

    // 构建组织结构
    result += this.buildOrgChartNodes(node, 0);

    return result;
  }

  /**
   * 构建组织结构图节点
   */
  private buildOrgChartNodes(node: MindMapNode, level: number): string {
    let result = '';
    let className: string;

    switch (level) {
      case 0:
        className = 'leader';
        break;
      case 1:
        className = 'manager';
        break;
      default:
        className = 'employee';
    }

    result += `  ${node.id}("${this.escapeText(node.text)}")\n`;
    result += `  class ${node.id} ${className}\n`;

    if (node.children) {
      for (const child of node.children) {
        result += this.buildOrgChartNodes(child, level + 1);
        result += `  ${node.id} --> ${child.id}\n`;
      }
    }

    return result;
  }

  /**
   * 转义特殊字符
   */
  private escapeText(text: string): string {
    return text
      .replace(/"/g, '\\"')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/</g, '\\<')
      .replace(/>/g, '\\>')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 获取所有可用模板
   */
  getTemplates(): string[] {
    return ['mindmap', 'flowchart', 'timeline', 'process', 'orgChart'];
  }
}
