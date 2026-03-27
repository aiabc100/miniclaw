import * as fs from 'fs/promises';
import * as path from 'path';
import type { Tool, SkillMeta, SkillParameter, SkillDefinition, ExecutionContext, SkillResult } from './types';

const SKILLS_DIR = path.join(__dirname, 'skills');

function parseYamlFrontmatter(content: string): { meta: SkillMeta; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Invalid skill file: missing YAML frontmatter');
  }
  
  const yamlContent = match[1];
  const body = match[2];
  
  const meta: any = {};
  const lines = yamlContent?.split('\n') ?? [];
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    let value: any = line.slice(colonIndex + 1).trim();
    
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/['"]/g, ''));
    }
    
    meta[key] = value;
  }
  
  return { meta: meta as SkillMeta, body: body ?? '' };
}

function extractCodeBlock(content: string, language: string): string {
  const regex = new RegExp(`\`\`\`${language}\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'g');
  const matches = [...content.matchAll(regex)];
  return matches.map(m => m[1]).join('\n');
}

function extractJsonBlock(content: string, sectionTitle: string): any {
  const sectionRegex = new RegExp(`## ${sectionTitle}[\\s\\S]*?\`\`\`json\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
  const match = content.match(sectionRegex);
  
  if (!match) return null;
  
  try {
    const matchContent = match[1];
    if (!matchContent) {
      return null;
    }
    return JSON.parse(matchContent);
  } catch {
    return null;
  }
}

function parseParameters(paramsJson: Record<string, any>): Record<string, SkillParameter> {
  const parameters: Record<string, SkillParameter> = {};
  
  for (const [key, value] of Object.entries(paramsJson)) {
    parameters[key] = value as SkillParameter;
  }
  
  return parameters;
}

function convertToToolParameters(skillParams: Record<string, SkillParameter>): Tool['parameters'] {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];
  
  for (const [key, param] of Object.entries(skillParams)) {
    properties[key] = {
      type: param.type,
      description: param.description
    };
    if (param.required) {
      required.push(key);
    }
  }
  
  return {
    type: 'object',
    properties,
    required
  };
}

async function loadSkill(filePath: string): Promise<Tool> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { meta, body } = parseYamlFrontmatter(content);
  
  const parametersJson = extractJsonBlock(body, '参数定义');
  const examplesJson = extractJsonBlock(body, '示例');
  const executeCode = extractCodeBlock(body, 'typescript');
  
  const parameters = parametersJson ? parseParameters(parametersJson) : {};
  const examples = examplesJson || [];
  
  const skillDef: SkillDefinition = {
    meta,
    parameters,
    examples,
    executeCode
  };
  
  const execute = createExecuteFunction(skillDef);
  
  const tool: Tool = {
    name: meta.id,
    description: meta.description,
    parameters: convertToToolParameters(parameters),
    execute
  };
  
  console.log(`Loaded skill: ${meta.name} (${meta.id})`);
  return tool;
}

function createExecuteFunction(skillDef: SkillDefinition): (args: Record<string, any>) => Promise<string> {
  return async (args: Record<string, any>) => {
    const context: ExecutionContext = {
      timestamp: Date.now()
    };
    
    const startTime = Date.now();
    
    try {
      let executeCode = skillDef.executeCode;
      
      executeCode = executeCode
        .replace(/export\s+async\s+function\s+execute/g, 'async function execute')
        .replace(/export\s+function\s+execute/g, 'function execute')
        .replace(/:\s*\{[^}]+\}/g, '')
        .replace(/:\s*ExecutionContext/g, '')
        .replace(/:\s*SkillResult/g, '')
        .replace(/:\s*any/g, '')
        .replace(/:\s*number/g, '')
        .replace(/:\s*string/g, '')
        .replace(/:\s*boolean/g, '')
        .replace(/:\s*Record<string,\s*any>/g, '');
      
      const wrappedCode = `
        ${executeCode}
        return execute(${JSON.stringify(args)}, ${JSON.stringify(context)});
      `;
      
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const executeFunc = new AsyncFunction(wrappedCode);
      const result: SkillResult = await executeFunc();
      
      if (result.success) {
        return result.message || JSON.stringify(result.data, null, 2);
      } else {
        return `执行失败: ${result.error}`;
      }
    } catch (error: any) {
      return `执行错误: ${error.message}`;
    }
  };
}

export async function loadSkills(): Promise<Tool[]> {
  const tools: Tool[] = [];
  
  try {
    const files = await fs.readdir(SKILLS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(SKILLS_DIR, file);
      try {
        const tool = await loadSkill(filePath);
        tools.push(tool);
      } catch (error: any) {
        console.error(`Failed to load skill ${file}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.log(`Skills directory not found or empty: ${error.message}`);
  }
  
  return tools;
}

export { parseYamlFrontmatter, extractCodeBlock, extractJsonBlock };
