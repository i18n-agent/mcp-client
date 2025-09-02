#!/usr/bin/env node

/**
 * MCP Client for i18n-agent Translation Service
 * Integrates with Claude Code CLI to provide translation capabilities
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const server = new Server(
  {
    name: 'i18n-agent',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://mcp.i18nagent.ai';
const API_KEY = process.env.API_KEY || 'sk-prod-fa6e528114c6136c12fcfcee08bb0f5f0ef7a262cfeb8b151bc44b8996336d53';

// Available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'translate_text',
        description: 'Translate text from one language to another with cultural context',
        inputSchema: {
          type: 'object',
          properties: {
            texts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of texts to translate',
            },
            targetLanguage: {
              type: 'string',
              description: 'Target language code (e.g., "es", "fr", "ja", "de") or full name (e.g., "Spanish", "French")',
            },
            sourceLanguage: {
              type: 'string',
              description: 'Source language code (optional, auto-detected if not provided)',
              default: 'auto',
            },
            targetAudience: {
              type: 'string',
              description: 'Target audience (e.g., "general", "technical", "casual", "formal")',
              default: 'general',
            },
            industry: {
              type: 'string',
              description: 'Industry context (e.g., "technology", "healthcare", "finance", "education")',
              default: 'technology',
            },
            region: {
              type: 'string',
              description: 'Specific region for localization (e.g., "Spain", "Mexico", "Brazil")',
            },
            notes: {
              type: 'string',
              description: 'Optional additional context or instructions for the translation (e.g., "Keep technical terms in English", "Use formal tone")',
            },
          },
          required: ['texts', 'targetLanguage'],
        },
      },
      {
        name: 'list_supported_languages',
        description: 'Get list of supported languages with quality ratings',
        inputSchema: {
          type: 'object',
          properties: {
            includeQuality: {
              type: 'boolean',
              description: 'Include quality ratings for each language',
              default: true,
            },
          },
        },
      },
      {
        name: 'translate_file',
        description: 'Translate file content while preserving structure and format. Supports JSON, YAML, XML, CSV, TXT, MD, and other text files',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file to translate (required if fileContent is not provided)',
            },
            fileContent: {
              type: 'string',
              description: 'File content as string (required if filePath is not provided)',
            },
            fileType: {
              type: 'string',
              description: 'File type: json, yaml, yml, xml, csv, txt, md, html, properties',
              enum: ['json', 'yaml', 'yml', 'xml', 'csv', 'txt', 'md', 'html', 'properties', 'auto'],
              default: 'auto',
            },
            targetLanguage: {
              type: 'string',
              description: 'Target language code or name',
            },
            targetAudience: {
              type: 'string',
              description: 'Target audience',
              default: 'general',
            },
            industry: {
              type: 'string',
              description: 'Industry context',
              default: 'technology',
            },
            preserveKeys: {
              type: 'boolean',
              description: 'Whether to preserve keys/structure (for structured files)',
              default: true,
            },
            outputFormat: {
              type: 'string',
              description: 'Output format: same, json, yaml, txt',
              default: 'same',
            },
            sourceLanguage: {
              type: 'string',
              description: 'Source language code (auto-detected if not provided)',
            },
            region: {
              type: 'string',
              description: 'Specific region for localization (e.g., "Spain", "Mexico", "Brazil")',
            },
            notes: {
              type: 'string',
              description: 'Optional additional context or instructions for the translation (e.g., "Keep technical terms in English", "Use formal tone")',
            },
          },
          required: ['targetLanguage'],
        },
      },
      {
        name: 'get_credits',
        description: 'Get remaining credits for the user and approximate word count available at 0.001 credits per word',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'translate_text':
        return await handleTranslateText(args);
      
      case 'list_supported_languages':
        return await handleListLanguages(args);
      
      case 'translate_file':
        return await handleTranslateFile(args);
      
      case 'get_credits':
        return await handleGetCredits(args);
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

async function handleTranslateText(args) {
  const { texts, targetLanguage, sourceLanguage, targetAudience = 'general', industry = 'technology', region, notes } = args;
  
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error('texts must be a non-empty array');
  }
  
  if (!targetLanguage) {
    throw new Error('targetLanguage is required');
  }

  // Check if this is a large translation request
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
  const isLargeRequest = texts.length > 100 || totalChars > 50000;

  // Use MCP JSON-RPC protocol for translate_content
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'translate_content',
      arguments: {
        apiKey: API_KEY,
        texts: texts,
        targetLanguage: targetLanguage,
        sourceLanguage: sourceLanguage && sourceLanguage !== 'auto' ? sourceLanguage : undefined,
        targetAudience: targetAudience,
        industry: industry,
        region: region,
        notes: notes,
      }
    }
  };

  try {
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: isLargeRequest ? 600000 : 300000, // 10 minutes for large requests, 5 minutes for normal
    });

    if (response.data.error) {
      throw new Error(`Translation service error: ${response.data.error.message || response.data.error}`);
    }

    // Check if we got an async job response
    const result = response.data.result;
    
    if (result && result.content && result.content[0]) {
      const textContent = result.content[0].text;
      
      // Try to parse as JSON to check for job ID
      try {
        const parsed = JSON.parse(textContent);
        if (parsed.status === 'processing' && parsed.jobId) {
          // Async job started - poll for status
          const jobResult = await pollTranslationJob(parsed.jobId, parsed.estimatedTime);
          
          // Extract the actual translation result from the job result
          if (jobResult && jobResult.content && jobResult.content[0]) {
            const translationData = JSON.parse(jobResult.content[0].text);
            return formatTranslationResult(translationData, texts, targetLanguage, sourceLanguage, targetAudience, industry, region);
          }
          return jobResult;
        } else {
          // Regular synchronous result
          return formatTranslationResult(parsed, texts, targetLanguage, sourceLanguage, targetAudience, industry, region);
        }
      } catch {
        // Not JSON or error parsing - return as-is
        return result;
      }
    }
    
    return result;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Translation Timeout\n\n` +
                  `The translation is taking longer than expected.\n` +
                  `This is normal for requests with 100+ texts or over 50KB of content.\n\n` +
                  `What's happening:\n` +
                  `• The translation is still processing on the server\n` +
                  `• Large requests are processed with optimized pipeline\n` +
                  `• Each batch ensures quality and consistency\n\n` +
                  `Recommendations:\n` +
                  `1. Try splitting into smaller batches (50-100 texts)\n` +
                  `2. Use shorter texts when possible\n` +
                  `3. Contact support if this persists\n\n` +
                  `Request size: ${texts.length} texts, ${totalChars} characters`
          }
        ]
      };
    }
    throw new Error(`Translation service unavailable: ${error.message}`);
  }
}

async function handleListLanguages(args) {
  const { includeQuality = true } = args;
  
  // Language support matrix based on GPT-OSS analysis
  const languages = {
    'Tier 1 - Production Ready (Excellent Quality 80-90%)': {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'nl': 'Dutch',
    },
    'Tier 2 - Production Viable (Good Quality 50-75%)': {
      'ru': 'Russian',
      'zh-CN': 'Chinese (Simplified)',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'he': 'Hebrew',
      'hi': 'Hindi',
      'pl': 'Polish',
      'cs': 'Czech',
    },
    'Tier 3 - Basic Support (Use with Caution 20-50%)': {
      'zh-TW': 'Chinese (Traditional)',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'tr': 'Turkish',
      'hu': 'Hungarian',
    },
  };

  let content = '🌍 Supported Languages\n';
  content += '===================\n\n';
  
  if (includeQuality) {
    for (const [tier, langs] of Object.entries(languages)) {
      content += `## ${tier}\n`;
      for (const [code, name] of Object.entries(langs)) {
        content += `- \`${code}\`: ${name}\n`;
      }
      content += '\n';
    }
  } else {
    const allLanguages = Object.values(languages).reduce((acc, tier) => ({ ...acc, ...tier }), {});
    for (const [code, name] of Object.entries(allLanguages)) {
      content += `- \`${code}\`: ${name}\n`;
    }
  }

  content += '\n💡 Usage Tips:\n';
  content += '- Use language codes (e.g., "es") or full names (e.g., "Spanish")\n';
  content += '- Tier 1 languages are recommended for production use\n';
  content += '- Tier 2 languages work well with human review\n';
  content += '- Tier 3 languages provide basic translation quality\n';

  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  };
}

async function handleTranslateFile(args) {
  const { 
    filePath, 
    fileContent, 
    fileType = 'auto', 
    targetLanguage, 
    targetAudience = 'general', 
    industry = 'technology',
    preserveKeys = true,
    outputFormat = 'same',
    sourceLanguage,
    region,
    notes
  } = args;
  
  if (!filePath && !fileContent) {
    throw new Error('Either filePath or fileContent must be provided');
  }
  
  if (!targetLanguage) {
    throw new Error('targetLanguage is required');
  }

  // Read file content if path provided and no content given
  let content = fileContent;
  
  if (filePath && !fileContent) {
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  // Check if this is a large file that might need async processing
  const isLargeFile = content.length > 50000; // > 50KB
  
  // Use MCP JSON-RPC protocol for translate_file
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'translate_file',
      arguments: {
        apiKey: API_KEY,
        filePath,
        fileContent: content,
        fileType,
        targetLanguage,
        sourceLanguage,
        targetAudience,
        industry,
        region,
        notes,
        preserveKeys,
        outputFormat
      }
    }
  };

  try {
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: isLargeFile ? 600000 : 300000, // 10 minutes for large files, 5 minutes for normal
    });

    if (response.data.error) {
      throw new Error(`Translation service error: ${response.data.error.message || response.data.error}`);
    }

    // Check if we got an async job response
    const result = response.data.result;
    
    if (result && result.content && result.content[0]) {
      const textContent = result.content[0].text;
      
      // Try to parse as JSON to check for job ID
      try {
        const parsed = JSON.parse(textContent);
        if (parsed.status === 'processing' && parsed.jobId) {
          // Async job started - poll for status
          return await pollTranslationJob(parsed.jobId, parsed.estimatedTime);
        }
      } catch {
        // Not JSON or not an async response, return as-is
      }
    }
    
    return result;
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Translation Timeout\n\n` +
                  `The file is large and taking longer than expected to translate.\n` +
                  `This is normal for files over 50KB or with 100+ strings.\n\n` +
                  `What's happening:\n` +
                  `• The translation is still processing on the server\n` +
                  `• Large files are chunked and processed with full 8-step pipeline\n` +
                  `• Each chunk ensures terminology consistency\n\n` +
                  `Recommendations:\n` +
                  `1. Try splitting the file into smaller parts\n` +
                  `2. Use the translate_text tool for smaller batches\n` +
                  `3. Contact support if this persists\n\n` +
                  `File size: ${content.length} characters`
          }
        ]
      };
    }
    throw new Error(`Translation service unavailable: ${error.message}`);
  }
}

// Format translation result for consistent output
function formatTranslationResult(parsedResult, texts, targetLanguage, sourceLanguage, targetAudience, industry, region) {
  return {
    translatedTexts: parsedResult?.translatedTexts || [],
    content: [
      {
        type: 'text',
        text: `Translation Results:\n\n` +
              `🌍 ${parsedResult?.sourceLanguage || sourceLanguage || 'Auto-detected'} → ${parsedResult?.targetLanguage || targetLanguage}\n` +
              `👥 Audience: ${parsedResult?.targetAudience || targetAudience}\n` +
              `🏭 Industry: ${parsedResult?.industry || industry}\n` +
              `${parsedResult?.region || region ? `📍 Region: ${parsedResult?.region || region}\n` : ''}` +
              `⏱️ Processing Time: ${parsedResult?.processingTimeMs || 'N/A'}ms\n` +
              `✅ Valid: ${parsedResult?.isValid !== undefined ? parsedResult.isValid : 'N/A'}\n\n` +
              `📝 Translations:\n` +
              (parsedResult?.translatedTexts || []).map((text, index) => 
                `${index + 1}. "${(parsedResult?.originalTexts || texts)[index]}" → "${text}"`
              ).join('\n'),
      },
    ],
  };
}

// Poll for async translation job status
async function pollTranslationJob(jobId, estimatedTime) {
  const maxPolls = 60; // Max 10 minutes of polling
  const pollInterval = 10000; // Poll every 10 seconds
  
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    try {
      const statusRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'check_translation_status',
          arguments: { jobId }
        }
      };
      
      const response = await axios.post(MCP_SERVER_URL, statusRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      if (response.data.error) {
        throw new Error(`Status check error: ${response.data.error.message || response.data.error}`);
      }
      
      const result = response.data.result;
      if (result && result.content && result.content[0]) {
        const status = JSON.parse(result.content[0].text);
        
        if (status.status === 'completed') {
          return status.result;
        } else if (status.status === 'failed') {
          throw new Error(`Translation failed: ${status.error}`);
        }
        
        // Still processing - continue polling
        console.error(`Translation progress: ${status.progress}% (${status.message})`);
      }
    } catch (error) {
      console.error(`Error polling job status: ${error.message}`);
      // Continue polling even if status check fails
    }
  }
  
  throw new Error(`Translation job ${jobId} timed out after ${maxPolls * pollInterval / 1000} seconds`);
}

async function handleGetCredits(args) {
  try {
    const response = await axios.post(`${MCP_SERVER_URL}/api/mcp`, {
      name: 'get_credits',
      arguments: {
        apiKey: API_KEY,
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const result = response.data;
    
    if (result.isError) {
      throw new Error(result.content[0].text);
    }

    const creditsInfo = JSON.parse(result.content[0].text);
    
    return {
      content: [
        {
          type: 'text',
          text: `💰 **Credits Information**

🏢 **Team**: ${creditsInfo.teamName}
💳 **Credits Remaining**: ${creditsInfo.creditsRemaining}
📝 **Approximate Words Available**: ${creditsInfo.approximateWordsAvailable.toLocaleString()}
💵 **Cost per Word**: ${creditsInfo.costPerWord} credits
⏰ **Last Updated**: ${new Date(creditsInfo.timestamp).toLocaleString()}

Note: Word count is approximate and may vary based on actual content complexity and translation requirements.`,
        },
      ],
    };
  } catch (error) {
    console.error('Credits check error:', error);
    throw new Error(`Unable to check credits: ${error.message}`);
  }
}

function detectFileType(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.json': return 'json';
    case '.yaml': case '.yml': return 'yaml';
    case '.xml': case '.svg': return 'xml';
    case '.csv': return 'csv';
    case '.md': return 'md';
    case '.html': case '.htm': return 'html';
    case '.properties': return 'properties';
    case '.txt': return 'txt';
    default: return detectFileTypeFromContent(content);
  }
}

function detectFileTypeFromContent(content) {
  const trimmed = content.trim();
  
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { JSON.parse(trimmed); return 'json'; } catch {}
  }
  
  if (trimmed.match(/^---\s*$|^\s*\w+:\s*[|\->\s]|^\s*\w+:\s*.+$/m)) {
    return 'yaml';
  }
  
  if (trimmed.startsWith('<') && trimmed.includes('>')) {
    return 'xml';
  }
  
  if (trimmed.includes(',') && trimmed.split('\n').length > 1) {
    return 'csv';
  }
  
  if (trimmed.includes('#') || trimmed.includes('**') || trimmed.includes('`')) {
    return 'md';
  }
  
  if (trimmed.includes('=') && trimmed.split('\n').some(line => line.includes('='))) {
    return 'properties';
  }
  
  return 'txt';
}

async function extractTextsFromFile(content, fileType, preserveKeys) {
  const texts = [];
  let structure = {};

  switch (fileType) {
    case 'json':
      const jsonData = JSON.parse(content);
      structure = { type: 'json', keys: [] };
      extractFromJson(jsonData, texts, structure.keys);
      break;
      
    case 'yaml':
    case 'yml':
      // Simple YAML parsing - extract values after colons
      structure = { type: 'yaml', lines: content.split('\n') };
      const yamlLines = content.split('\n');
      yamlLines.forEach((line, index) => {
        const match = line.match(/^(\s*)([^:]+):\s*(.+)$/);
        if (match && match[3] && !match[3].match(/^[|\->]/)) {
          const value = match[3].replace(/^["']|["']$/g, '');
          if (value && !isNumericOrBoolean(value)) {
            texts.push(value);
            structure.lines[index] = { original: line, textIndex: texts.length - 1 };
          }
        }
      });
      break;
      
    case 'xml':
    case 'html':
      structure = { type: fileType, content: content };
      // Extract text content between tags
      const xmlMatches = content.matchAll(/>([^<]+)</g);
      for (const match of xmlMatches) {
        const text = match[1].trim();
        if (text && !isNumericOrBoolean(text)) {
          texts.push(text);
        }
      }
      break;
      
    case 'csv':
      structure = { type: 'csv', rows: [] };
      const csvLines = content.split('\n');
      csvLines.forEach((line, rowIndex) => {
        if (line.trim()) {
          const cells = parseCsvLine(line);
          structure.rows[rowIndex] = [];
          cells.forEach((cell, colIndex) => {
            if (cell && !isNumericOrBoolean(cell)) {
              texts.push(cell);
              structure.rows[rowIndex][colIndex] = texts.length - 1;
            } else {
              structure.rows[rowIndex][colIndex] = null;
            }
          });
        }
      });
      break;
      
    case 'properties':
      structure = { type: 'properties', lines: content.split('\n') };
      const propLines = content.split('\n');
      propLines.forEach((line, index) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match && match[2]) {
          texts.push(match[2]);
          structure.lines[index] = { key: match[1], textIndex: texts.length - 1 };
        }
      });
      break;
      
    case 'md':
      structure = { type: 'md', content: content };
      // Extract text content, avoiding code blocks
      const mdText = content
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]+`/g, '') // Remove inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
        .replace(/[#*_`]/g, '') // Remove markdown formatting
        .split('\n')
        .filter(line => line.trim())
        .join(' ');
      
      if (mdText.trim()) {
        texts.push(mdText.trim());
      }
      break;
      
    default: // txt and others
      structure = { type: 'txt', content: content };
      const cleanText = content.trim();
      if (cleanText) {
        texts.push(cleanText);
      }
      break;
  }

  return { texts, structure };
}

function extractFromJson(obj, texts, keys, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' && value.trim()) {
      texts.push(value);
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      extractFromJson(value, texts, keys, fullKey);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && item.trim()) {
          texts.push(item);
          keys.push(`${fullKey}[${index}]`);
        } else if (typeof item === 'object' && item !== null) {
          extractFromJson(item, texts, keys, `${fullKey}[${index}]`);
        }
      });
    }
  }
}

function extractTranslatedTexts(translationResult) {
  const translatedTexts = [];
  const lines = translationResult.split('\n');
  const translationSection = lines.findIndex(line => line.includes('📝 Translations:'));
  
  if (translationSection !== -1) {
    for (let i = translationSection + 1; i < lines.length; i++) {
      const match = lines[i].match(/\d+\. ".*?" → "(.*)"/);
      if (match) {
        translatedTexts.push(match[1]);
      }
    }
  }
  
  return translatedTexts;
}

async function reconstructFile(originalContent, translatedTexts, structure, fileType, outputFormat) {
  const format = outputFormat === 'same' ? fileType : outputFormat;
  let textIndex = 0;

  switch (format) {
    case 'json':
      if (structure.type === 'json') {
        const jsonData = JSON.parse(originalContent);
        replaceJsonStrings(jsonData, translatedTexts, textIndex);
        return JSON.stringify(jsonData, null, 2);
      } else {
        // Convert other formats to JSON
        const jsonObj = {};
        translatedTexts.forEach((text, i) => {
          jsonObj[`text_${i + 1}`] = text;
        });
        return JSON.stringify(jsonObj, null, 2);
      }
      
    case 'yaml':
      if (structure.type === 'yaml') {
        const lines = [...structure.lines];
        lines.forEach((lineInfo, index) => {
          if (typeof lineInfo === 'object' && lineInfo.textIndex !== undefined) {
            const match = lineInfo.original.match(/^(\s*)([^:]+):\s*(.+)$/);
            if (match) {
              lines[index] = `${match[1]}${match[2]}: "${translatedTexts[lineInfo.textIndex]}"`;
            }
          } else if (typeof lineInfo === 'string') {
            lines[index] = lineInfo;
          }
        });
        return lines.join('\n');
      }
      break;
      
    case 'csv':
      if (structure.type === 'csv') {
        return structure.rows.map(row => {
          return row.map(cellIndex => {
            return cellIndex !== null ? `"${translatedTexts[cellIndex]}"` : '';
          }).join(',');
        }).join('\n');
      }
      break;
      
    case 'properties':
      if (structure.type === 'properties') {
        const lines = structure.lines.map(lineInfo => {
          if (typeof lineInfo === 'object' && lineInfo.textIndex !== undefined) {
            return `${lineInfo.key}=${translatedTexts[lineInfo.textIndex]}`;
          }
          return lineInfo;
        });
        return lines.join('\n');
      }
      break;
      
    case 'txt':
      return translatedTexts.join('\n\n');
      
    default:
      return translatedTexts.join('\n');
  }

  // Fallback for unsupported combinations
  return translatedTexts.join('\n');
}

function replaceJsonStrings(obj, translatedTexts, startIndex = 0) {
  let currentIndex = startIndex;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.trim()) {
      if (currentIndex < translatedTexts.length) {
        obj[key] = translatedTexts[currentIndex];
        currentIndex++;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      currentIndex = replaceJsonStrings(value, translatedTexts, currentIndex);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && item.trim()) {
          if (currentIndex < translatedTexts.length) {
            value[index] = translatedTexts[currentIndex];
            currentIndex++;
          }
        } else if (typeof item === 'object' && item !== null) {
          currentIndex = replaceJsonStrings(item, translatedTexts, currentIndex);
        }
      });
    }
  }
  
  return currentIndex;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function isNumericOrBoolean(value) {
  return /^\d+$/.test(value) || 
         /^\d+\.\d+$/.test(value) || 
         value === 'true' || 
         value === 'false' ||
         value === 'null' ||
         value === 'undefined';
}

function getCodeBlockLanguage(fileType) {
  const languageMap = {
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml', 
    'xml': 'xml',
    'html': 'html',
    'csv': 'csv',
    'md': 'markdown',
    'properties': 'properties',
    'txt': 'text'
  };
  return languageMap[fileType] || 'text';
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('i18n-agent MCP server running...');
  console.error('MCP_SERVER_URL:', MCP_SERVER_URL);
  console.error('API_KEY:', API_KEY);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});