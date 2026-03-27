---
id: skill-creator
name: 技能创建器
version: 1.0.0
description: 根据自然语言描述自动生成符合规范的 Skill 文件
author: 系统管理员
tags: [技能, 创建, 自动生成]
createdAt: 2024-01-01
updatedAt: 2024-01-15
---

# 技能创建器

根据用户用自然语言描述的需求，自动生成符合 Markdown YAML frontmatter 格式的 Skill 文件。

## 参数定义

```json
{
  "description": {
    "type": "string",
    "description": "用自然语言描述你想要的技能功能",
    "required": true
  },
  "skillName": {
    "type": "string",
    "description": "技能名称（可选，不填则自动生成）",
    "required": false
  }
}
```

## 示例

```json
[
  {
    "input": {
      "description": "创建一个查询股票价格的技能"
    },
    "output": {
      "file": "skills/stock.md",
      "message": "已创建股票查询技能"
    },
    "description": "创建股票查询技能"
  }
]
```

## 实现代码

```typescript
async function execute(params, context) {
  const { description, skillName } = params;
  const startTime = Date.now();

  const id = skillName ? skillName.toLowerCase().replace(/\s+/g, '-') : 'skill-' + Date.now();
  const name = skillName || '新技能';
  const date = new Date().toISOString().split('T')[0];

  const lines = [];
  lines.push('---');
  lines.push('id: ' + id);
  lines.push('name: ' + name);
  lines.push('version: 1.0.0');
  lines.push('description: ' + description);
  lines.push('author: 系统管理员');
  lines.push('tags: [工具, 自动生成]');
  lines.push('createdAt: ' + date);
  lines.push('updatedAt: ' + date);
  lines.push('---');
  lines.push('');
  lines.push('# ' + name + '技能');
  lines.push('');
  lines.push(description);
  lines.push('');
  lines.push('## 参数定义');
  lines.push('');
  lines.push(String.fromCharCode(96, 96, 96) + 'json');
  lines.push('{');
  lines.push('  "input": { "type": "string", "description": "输入参数", "required": true }');
  lines.push('}');
  lines.push(String.fromCharCode(96, 96, 96));
  lines.push('');
  lines.push('## 示例');
  lines.push('');
  lines.push(String.fromCharCode(96, 96, 96) + 'json');
  lines.push('[{ "input": "示例输入", "output": "示例输出", "description": "示例" }]');
  lines.push(String.fromCharCode(96, 96, 96));
  lines.push('');
  lines.push('## 实现代码');
  lines.push('');
  lines.push(String.fromCharCode(96, 96, 96) + 'typescript');
  lines.push('async function execute(params, context) {');
  lines.push('  const startTime = Date.now();');
  lines.push('  try {');
  lines.push('    // TODO: 实现具体逻辑');
  lines.push('    return {');
  lines.push('      success: true,');
  lines.push('      data: {},');
  lines.push('      message: "执行成功",');
  lines.push('      executionTime: Date.now() - startTime');
  lines.push('    };');
  lines.push('  } catch (error) {');
  lines.push('    return {');
  lines.push('      success: false,');
  lines.push('      error: error instanceof Error ? error.message : "执行失败",');
  lines.push('      executionTime: Date.now() - startTime');
  lines.push('    };');
  lines.push('  }');
  lines.push('}');
  lines.push(String.fromCharCode(96, 96, 96));

  const skillContent = lines.join('\n');

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const skillsDir = path.join(process.cwd(), 'skills');
    const filePath = path.join(skillsDir, id + '.md');
    
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(filePath, skillContent, 'utf-8');
    
    return {
      success: true,
      data: {
        file: filePath,
        content: skillContent
      },
      message: '已创建技能文件: ' + filePath + '\n\n请编辑该文件完善参数定义和实现代码。',
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建技能失败',
      executionTime: Date.now() - startTime
    };
  }
}
```

## 使用说明

1. 用自然语言描述你想要的技能功能
2. 系统会自动生成符合规范的 Skill 模板文件
3. 生成的文件包含基础框架，需要进一步完善参数和实现代码
