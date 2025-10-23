#!/usr/bin/env node

/**
 * MCP Client for i18n-agent Translation Service
 * Integrates with Claude Code CLI to provide translation capabilities
 */

const MCP_CLIENT_VERSION = '1.8.19';

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
import { detectNamespaceFromPath, generateNamespaceSuggestions, getNamespaceSuggestionText } from './namespace-detector.js';

const server = new Server(
  {
    name: 'i18n-agent',
    version: MCP_CLIENT_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configuration
if (!process.env.MCP_SERVER_URL) {
  throw new Error('MCP_SERVER_URL environment variable is required');
}
if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
const API_KEY = process.env.API_KEY;

// Available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'translate_text',
        description: '⚠️ CRITICAL: For multi-language translation, use targetLanguages parameter (not targetLanguage). Translate text content with cultural adaptation using AI subagents. Supports both single and multi-language translation. For large requests (>100 texts or >50,000 characters), returns a jobId for async processing. Use check_translation_status to monitor progress and download results. Set pseudoTranslation=true for testing i18n implementations without AI cost.',
        inputSchema: {
          type: 'object',
          properties: {
            texts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of source texts to translate (any language)',
            },
            targetLanguages: {
              description: '⚠️ REQUIRED: Target language(s) - can be a single string (e.g., "es") OR an array of strings (e.g., ["es", "fr", "zh-CN"]) for multi-language translation',
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ]
            },
            sourceLanguage: {
              type: 'string',
              description: 'Source language code (auto-detected if not provided)',
            },
            targetAudience: {
              type: 'string',
              description: 'Target audience for the content (e.g., "software developers", "marketing professionals")',
            },
            industry: {
              type: 'string',
              description: 'Industry context (e.g., "technology", "healthcare", "finance")',
            },
            region: {
              type: 'string',
              description: 'Specific region for localization (e.g., "Spain", "Mexico", "Brazil")',
            },
            context: {
              type: 'string',
              description: 'Optional additional context or instructions for the translation (e.g., "Keep technical terms in English", "Use formal tone")',
            },
            pseudoTranslation: {
              type: 'boolean',
              description: 'Enable pseudo-translation mode for testing i18n implementations (bypasses AI translation, no credit cost)',
            },
            pseudoOptions: {
              type: 'object',
              properties: {
                addCJK: {
                  type: 'boolean',
                  description: 'Add CJK characters to test wide character support',
                },
                expansionRatio: {
                  type: 'number',
                  description: 'Length expansion ratio (1.0 = no expansion, 1.3 = 30% longer, 2.0 = double length)',
                },
                addSpecialChars: {
                  type: 'boolean',
                  description: 'Add special characters to test encoding/escaping',
                },
                addBrackets: {
                  type: 'boolean',
                  description: 'Wrap strings with brackets to identify untranslated content',
                },
                addAccents: {
                  type: 'boolean',
                  description: 'Replace Latin characters with accented equivalents',
                },
              },
              description: 'Configuration options for pseudo-translation',
            },
            namespace: {
              type: 'string',
              description: 'Optional namespace identifier for backend tracking and project organization (recommended for file-based workflows)',
            },
          },
          required: ['texts', 'targetLanguages'],
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
        description: '⚠️ CRITICAL: For multi-language translation, use targetLanguages parameter (not targetLanguage). Translate file content while preserving structure and format. Supports both single and multi-language translation. Supports JSON, YAML, XML, CSV, TXT, MD, and other text files. For large files (>100KB), returns a jobId for async processing. Use check_translation_status to monitor progress and download results. Set pseudoTranslation=true for testing i18n implementations without AI cost.',
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
              description: 'File type: json, yaml, yml, xml, csv, txt, md, html, properties (Java), pdf, docx, doc, po (gettext), pot (gettext), mo (gettext), auto',
              enum: ['json', 'yaml', 'yml', 'xml', 'csv', 'txt', 'md', 'html', 'properties', 'pdf', 'docx', 'doc', 'po', 'pot', 'mo', 'auto'],
              default: 'auto',
            },
            targetLanguages: {
              description: '⚠️ REQUIRED: Target language(s) - can be a single string (e.g., "es") OR an array of strings (e.g., ["es", "fr", "zh-CN"]) for multi-language translation',
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ]
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
            context: {
              type: 'string',
              description: 'Optional additional context or instructions for the translation (e.g., "Keep technical terms in English", "Use formal tone")',
            },
            pseudoTranslation: {
              type: 'boolean',
              description: 'Enable pseudo-translation mode for testing i18n implementations (bypasses AI translation, no credit cost)',
            },
            pseudoOptions: {
              type: 'object',
              properties: {
                addCJK: {
                  type: 'boolean',
                  description: 'Add CJK characters to test wide character support',
                },
                expansionRatio: {
                  type: 'number',
                  description: 'Length expansion ratio (1.0 = no expansion, 1.3 = 30% longer, 2.0 = double length)',
                },
                addSpecialChars: {
                  type: 'boolean',
                  description: 'Add special characters to test encoding/escaping',
                },
                addBrackets: {
                  type: 'boolean',
                  description: 'Wrap strings with brackets to identify untranslated content',
                },
                addAccents: {
                  type: 'boolean',
                  description: 'Replace Latin characters with accented equivalents',
                },
              },
              description: 'Configuration options for pseudo-translation',
            },
            namespace: {
              type: 'string',
              description: 'Unique namespace identifier for backend tracking and project organization (required for production use)',
            },
          },
          required: ['targetLanguages', 'namespace'],
        },
      },
      {
        name: 'analyze_content',
        description: 'Analyze content for translation readiness and get improvement suggestions. Returns detailed analysis including content type, quality score, and specific recommendations. Costs the same credits as translation.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: ['string', 'array', 'object'],
              description: 'Content to analyze (text string, array of texts, or structured object)',
            },
            fileType: {
              type: 'string',
              description: 'Optional file type if content is from a file (json, yaml, xml, etc.)',
            },
            sourceLanguage: {
              type: 'string',
              description: 'Source language code (auto-detected if not provided)',
            },
            targetLanguage: {
              type: 'string',
              description: 'Target language code for translation',
            },
            industry: {
              type: 'string',
              description: 'Industry context (e.g., "technology", "healthcare", "finance")',
              default: 'general',
            },
            targetAudience: {
              type: 'string',
              description: 'Target audience (e.g., "general", "technical", "professional")',
              default: 'general',
            },
            region: {
              type: 'string',
              description: 'Specific region for localization (e.g., "Spain", "Mexico", "Brazil")',
            },
          },
          required: ['content', 'targetLanguage'],
        },
      },
      {
        name: 'get_credits',
        description: 'Get remaining credits for the user and approximate word count available at 0.001 credits per word',
        inputSchema: {
          type: 'object',
          properties: {
            apiKey: {
              type: 'string',
              description: 'API key to get credits for (optional, will use environment variable if not provided)',
            },
          },
          required: [],
        },
      },
      /*
       * ====================================================================
       * TOKEN USAGE TOOLS - RESTRICTED FROM MCP CLIENT ACCESS
       * ====================================================================
       * 
       * HARD LIMIT POLICY: Token usage analytics tools are NOT available 
       * through MCP client interfaces for security and privacy reasons.
       * 
       * Restricted Tools:
       * - get_token_usage_stats
       * - get_token_usage_by_translation  
       * - get_token_usage_by_api_key
       * 
       * These tools contain sensitive usage data and billing information
       * that should only be accessible through authenticated web interfaces,
       * not through programmatic MCP access.
       * 
       * If you need token usage data, please use:
       * - Web dashboard at https://app.i18nagent.ai
       * - Direct API calls with proper authentication
       * - Admin interfaces (for internal use only)
       * 
       * This restriction is enforced at the service level and cannot be
       * bypassed through client modifications.
       * ====================================================================
       */
      {
        name: 'check_translation_status',
        description: 'Check the status and progress of an async translation job. Returns progress percentage, elapsed time, and downloads completed translation results when finished.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'The job ID returned from translate_text (>100 texts or >50,000 chars) or translate_file (>100KB) for async processing',
            },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'resume_translation',
        description: 'Resume a failed or interrupted async translation job from its last checkpoint. This allows you to continue processing from where it stopped instead of starting over.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'The job ID of the translation job to resume',
            },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'download_translations',
        description: 'Download completed translations by writing them to /tmp/i18n-translations-{jobId}/. Returns metadata with file paths instead of large translation content to avoid token bloat. Consumer can then read or copy files as needed.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'The job ID of the completed translation',
            },
          },
          required: ['jobId'],
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
      
      case 'analyze_content':
        return await handleAnalyzeContent(args);

      case 'get_credits':
        return await handleGetCredits(args);

      /*
       * TOKEN USAGE TOOLS - BLOCKED FOR SECURITY
       * These cases are intentionally removed to prevent access to sensitive analytics data
       * through MCP interfaces. See tool definition comments above for details.
       */

      case 'check_translation_status':
        return await handleCheckTranslationStatus(args);

      case 'resume_translation':
        return await handleResumeTranslation(args);

      case 'download_translations':
        return await handleDownloadTranslations(args);

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);

    // Check if error is about API key or credit issues
    const errorMsg = error.message || '';
    const isAuthError = errorMsg.toLowerCase().includes('api key') ||
                       errorMsg.toLowerCase().includes('api_key') ||
                       errorMsg.toLowerCase().includes('unauthorized') ||
                       errorMsg.includes('(401)');
    const isCreditError = errorMsg.toLowerCase().includes('credit') ||
                         errorMsg.toLowerCase().includes('quota') ||
                         errorMsg.toLowerCase().includes('limit exceeded') ||
                         errorMsg.includes('(402)');

    // Check if error is already descriptive (validation errors, specific errors with clear messages)
    const hasDescriptiveError = errorMsg.includes('Invalid language code') ||
                               errorMsg.includes('is a multilingual region') ||
                               errorMsg.includes('not found') ||
                               errorMsg.includes('timed out') ||
                               errorMsg.includes('Timeout') ||
                               errorMsg.includes('Required') ||
                               errorMsg.includes('must be') ||
                               errorMsg.includes('is required') ||
                               errorMsg.length > 200; // Long errors are likely already detailed

    let finalErrorMsg = error.message;

    // Only add retry guidance if:
    // 1. It's not an auth/credit error
    // 2. It's a content-based tool
    // 3. The error is NOT already descriptive
    const contentBasedTools = ['translate_text', 'translate_file'];
    if (!isAuthError && !isCreditError && !hasDescriptiveError && contentBasedTools.includes(name)) {
      finalErrorMsg = `${error.message}. Please retry with smaller chunks or split the content into multiple requests.`;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${finalErrorMsg}`
    );
  }
});

async function handleTranslateText(args) {
  const { texts, targetLanguages: rawTargetLanguages, sourceLanguage, targetAudience = 'general', industry = 'technology', region, context, pseudoTranslation, pseudoOptions, namespace } = args;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error('texts must be a non-empty array');
  }

  // Namespace is optional for text translation, but recommended for organizational tracking

  // Normalize targetLanguages - accept both string and array
  let targetLanguages = rawTargetLanguages;
  let targetLanguage = undefined;

  if (typeof rawTargetLanguages === 'string') {
    // Single language provided as string - convert to array for internal processing
    targetLanguages = [rawTargetLanguages];
    targetLanguage = rawTargetLanguages;
  } else if (Array.isArray(rawTargetLanguages) && rawTargetLanguages.length === 1) {
    // Single language provided as array - extract for backward compatibility
    targetLanguage = rawTargetLanguages[0];
  }

  if (!targetLanguages?.length) {
    throw new Error('targetLanguages parameter is required (can be a string for single language or array for multiple languages)');
  }

  // Check if this is a large translation request
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
  const isLargeRequest = texts.length > 100 || totalChars > 50000;

  // Use MCP JSON-RPC protocol for translate_text
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'translate_text',
      arguments: {
        apiKey: API_KEY,
        texts: texts,
        targetLanguage: targetLanguage,
        targetLanguages: targetLanguages,
        sourceLanguage: sourceLanguage && sourceLanguage !== 'auto' ? sourceLanguage : undefined,
        targetAudience: targetAudience,
        industry: industry,
        region: region,
        context: context,
        pseudoTranslation: pseudoTranslation,
        pseudoOptions: pseudoOptions,
        namespace: namespace,
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
      const errorMsg = response.data.error.message || response.data.error;
      const isAuthError = errorMsg.toString().toLowerCase().includes('api key') || 
                         errorMsg.toString().toLowerCase().includes('api_key') ||
                         errorMsg.toString().toLowerCase().includes('unauthorized');
      const isCreditError = errorMsg.toString().toLowerCase().includes('credit') || 
                           errorMsg.toString().toLowerCase().includes('quota') ||
                           errorMsg.toString().toLowerCase().includes('limit exceeded');
      
      let finalErrorMsg = `Translation service error: ${errorMsg}`;
      if (!isAuthError && !isCreditError) {
        finalErrorMsg += `. Please retry with a smaller text chunk or split the content into multiple smaller requests.`;
      }
      throw new Error(finalErrorMsg);
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
    
    // Handle 401 unauthorized - invalid API key
    if (error.response?.status === 401) {
      const authErrorDetails = error.response.data?.message || error.response.data?.result?.content?.[0]?.text || error.message;
      throw new Error(`❌ Invalid API key (401)\nDetails: ${authErrorDetails}\nPlease check your API key at https://app.i18nagent.ai\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_text]`);
    }
    
    // Handle 402 payment required with user-friendly message
    if (error.response?.status === 402) {
      const creditErrorDetails = error.response.data?.message || error.response.data?.result?.content?.[0]?.text || error.message;
      throw new Error(`⚠️ Insufficient credits (402)\nDetails: ${creditErrorDetails}\nPlease top up at https://app.i18nagent.ai\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_text]`);
    }
    
    // Check if it's a large content issue
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    if (error.response?.status === 413 || 
        (error.response?.status === 503 && totalChars > 50000)) {
      const sizeErrorDetails = error.response?.data?.message || error.response?.data?.result?.content?.[0]?.text || error.message;
      const errorMsg = `Content too large (${totalChars} characters, ${texts.length} texts)\nStatus: ${error.response?.status}\nDetails: ${sizeErrorDetails}\n\nPlease break into smaller batches:\n• Split into batches of 50-100 texts\n• Keep total size under 50KB per request\n• Process sequentially to avoid overload\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_text]`;
      throw new Error(errorMsg);
    }
    
    // Check if it's actually a service unavailable error (only for real infrastructure issues)
    if (error.response?.status === 503) {
      throw new Error(`i18n-agent encountered unexpected problem, and we are working on it, try again later.`);
    }
    
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.response?.status === 502 ||
        error.response?.status === 504) {
      const serviceErrorDetails = error.response?.data?.result?.content?.[0]?.text || 
                                  error.response?.data?.error?.message || 
                                  error.message;
      const debugInfo = `Code: ${error.code || 'N/A'}\nStatus: ${error.response?.status || 'N/A'}\nStatusText: ${error.response?.statusText || 'N/A'}\nDetails: ${serviceErrorDetails}\nURL: ${error.config?.url || 'N/A'}\nTimestamp: ${new Date().toISOString()}`;
      throw new Error(`Translation service error\n${debugInfo}\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_text]`);
    }
    
    // For other errors, include all debug info in the error message
    const generalErrorDetails = error.response?.data?.result?.content?.[0]?.text || 
                               error.response?.data?.error?.message || 
                               error.message;
    const debugInfo = `Status: ${error.response?.status || 'N/A'}\nStatusText: ${error.response?.statusText || 'N/A'}\nDetails: ${generalErrorDetails}\nTimestamp: ${new Date().toISOString()}`;
    throw new Error(`Error\n${debugInfo}\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_text]`);
  }
}

async function handleListLanguages(args) {
  const { includeQuality = true } = args;
  
  // Use MCP JSON-RPC protocol for list_supported_languages
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'list_supported_languages',
      arguments: { includeQuality }
    }
  };
  
  try {
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.data.error) {
      const errorMsg = response.data.error.message || response.data.error;
      throw new Error(`Languages service error: ${errorMsg}`);
    }

    const result = response.data.result;
    if (result && result.content && result.content[0]) {
      const textContent = result.content[0].text;
      
      // Try to parse as JSON for structured data
      try {
        const parsed = JSON.parse(textContent);
        
        // Format the language data nicely
        let content = '🌍 Supported Languages\n';
        content += '===================\n\n';
        
        if (parsed.languages && Array.isArray(parsed.languages)) {
          if (includeQuality) {
            // Group by quality levels
            const highQuality = parsed.languages.filter(lang => lang.quality === 'high');
            const mediumQuality = parsed.languages.filter(lang => lang.quality === 'medium');
            
            if (highQuality.length > 0) {
              content += '## High Quality (Recommended for Production)\n';
              highQuality.forEach(lang => {
                content += `- \`${lang.code}\`: ${lang.name}\n`;
              });
              content += '\n';
            }
            
            if (mediumQuality.length > 0) {
              content += '## Medium Quality (Good with Review)\n';
              mediumQuality.forEach(lang => {
                content += `- \`${lang.code}\`: ${lang.name}\n`;
              });
              content += '\n';
            }
          } else {
            parsed.languages.forEach(lang => {
              content += `- \`${lang.code}\`: ${lang.name}\n`;
            });
            content += '\n';
          }
          
          content += `📊 **Total Languages**: ${parsed.total || parsed.languages.length}\n\n`;
          
          if (parsed.qualityLevels) {
            content += `Quality Breakdown:\n`;
            content += `• High Quality: ${parsed.qualityLevels.high} languages\n`;
            content += `• Medium Quality: ${parsed.qualityLevels.medium} languages\n\n`;
          }
        }
        
        content += '💡 Usage Tips:\n';
        content += '- Use language codes (e.g., "es") or full names (e.g., "Spanish")\n';
        content += '- High quality languages are recommended for production use\n';
        content += '- Medium quality languages work well with human review\n';
        
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch {
        // Return raw text if not JSON
        return result;
      }
    }
    
    return result;
  } catch (error) {
    console.error('List languages error:', error);
    
    // Fallback to basic language list if service is unavailable
    const fallbackContent = `🌍 Supported Languages (Fallback)\n` +
      `==================================\n\n` +
      `Service temporarily unavailable. Here are the main supported languages:\n\n` +
      `• \`es\`: Spanish\n• \`fr\`: French\n• \`de\`: German\n• \`it\`: Italian\n` +
      `• \`pt\`: Portuguese\n• \`ja\`: Japanese\n• \`ko\`: Korean\n• \`zh\`: Chinese\n` +
      `• \`ru\`: Russian\n• \`ar\`: Arabic\n• \`hi\`: Hindi\n• \`nl\`: Dutch\n\n` +
      `Error: ${error.message}`;
    
    return {
      content: [
        {
          type: 'text',
          text: fallbackContent,
        },
      ],
    };
  }
}

async function handleTranslateFile(args) {
  // DEBUG: Log ALL args received from Claude Code
  console.error('🔍 [MCP CLIENT] handleTranslateFile received args:', JSON.stringify(Object.keys(args)));
  console.error('🔍 [MCP CLIENT] targetLanguages value:', args.targetLanguages);
  console.error('🔍 [MCP CLIENT] Full args:', JSON.stringify(args).substring(0, 500));

  const {
    filePath,
    fileContent,
    fileType = 'auto',
    targetLanguages: rawTargetLanguages,
    targetAudience = 'general',
    industry = 'technology',
    preserveKeys = true,
    outputFormat = 'same',
    sourceLanguage,
    region,
    context,
    pseudoTranslation,
    pseudoOptions,
    namespace
  } = args;

  if (!filePath && !fileContent) {
    throw new Error('Either filePath or fileContent must be provided');
  }

  // Auto-detect namespace if not provided and filePath is available
  let finalNamespace = namespace;
  let detectionInfo = null;

  if (!namespace && filePath) {
    const detection = detectNamespaceFromPath(filePath);
    if (detection.suggestion && detection.confidence > 0.5) {
      finalNamespace = detection.suggestion;
      detectionInfo = detection;
      console.error(`🎯 [MCP CLIENT] Auto-detected namespace: "${finalNamespace}" (confidence: ${Math.round(detection.confidence * 100)}%, source: ${detection.source})`);
    }
  }

  if (!finalNamespace) {
    // Provide helpful suggestions when namespace is missing
    const suggestionText = filePath
      ? getNamespaceSuggestionText(filePath, path.basename(filePath))
      : getNamespaceSuggestionText(null, null);

    throw new Error(`namespace is required for translation tracking and project organization.\n\n${suggestionText}`);
  }

  // Normalize targetLanguages - accept both string and array
  let targetLanguages = rawTargetLanguages;
  let targetLanguage = undefined;

  if (typeof rawTargetLanguages === 'string') {
    // Single language provided as string - convert to array for internal processing
    targetLanguages = [rawTargetLanguages];
    targetLanguage = rawTargetLanguages;
  } else if (Array.isArray(rawTargetLanguages) && rawTargetLanguages.length === 1) {
    // Single language provided as array - extract for backward compatibility
    targetLanguage = rawTargetLanguages[0];
  }

  if (!targetLanguages?.length) {
    throw new Error('targetLanguages parameter is required (can be a string for single language or array for multiple languages)');
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

  // Build arguments object, filtering out undefined values (they get stripped by JSON.stringify)
  const requestArgs = {
    apiKey: API_KEY,
    filePath,
    fileContent: content,
    fileType,
    sourceLanguage,
    targetAudience,
    industry,
    preserveKeys,
    outputFormat,
    namespace: finalNamespace
  };

  // Add optional parameters only if defined
  if (targetLanguage !== undefined) requestArgs.targetLanguage = targetLanguage;
  if (targetLanguages !== undefined) requestArgs.targetLanguages = targetLanguages;
  if (region !== undefined) requestArgs.region = region;
  if (context !== undefined) requestArgs.context = context;
  if (pseudoTranslation !== undefined) requestArgs.pseudoTranslation = pseudoTranslation;
  if (pseudoOptions !== undefined) requestArgs.pseudoOptions = pseudoOptions;

  // Use MCP JSON-RPC protocol for translate_file
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'translate_file',
      arguments: requestArgs
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
      const errorMsg = response.data.error.message || response.data.error;
      const isAuthError = errorMsg.toString().toLowerCase().includes('api key') || 
                         errorMsg.toString().toLowerCase().includes('api_key') ||
                         errorMsg.toString().toLowerCase().includes('unauthorized');
      const isCreditError = errorMsg.toString().toLowerCase().includes('credit') || 
                           errorMsg.toString().toLowerCase().includes('quota') ||
                           errorMsg.toString().toLowerCase().includes('limit exceeded');
      
      let finalErrorMsg = `Translation service error: ${errorMsg}`;
      if (!isAuthError && !isCreditError) {
        finalErrorMsg += `. Please retry with a smaller text chunk or split the content into multiple smaller requests.`;
      }
      throw new Error(finalErrorMsg);
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
    // Debug info will be included in error messages for visibility
    
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
    
    // Handle 401 unauthorized - invalid API key
    if (error.response?.status === 401) {
      const fileAuthErrorDetails = error.response.data?.message || error.response.data?.result?.content?.[0]?.text || error.message;
      throw new Error(`❌ Invalid API key (401)\nDetails: ${fileAuthErrorDetails}\nPlease check your API key at https://app.i18nagent.ai\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_file]`);
    }
    
    // Handle 402 payment required with user-friendly message
    if (error.response?.status === 402) {
      const fileCreditErrorDetails = error.response.data?.message || error.response.data?.result?.content?.[0]?.text || error.message;
      throw new Error(`⚠️ Insufficient credits (402)\nDetails: ${fileCreditErrorDetails}\nPlease top up at https://app.i18nagent.ai\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_file]`);
    }
    
    // Check if it's a timeout issue (45-second server timeout) or large file issue
    const timeoutErrorDetails = error.response?.data?.result?.content?.[0]?.text || 
                               error.response?.data?.error?.message || 
                               error.message;
    
    if (error.response?.status === 413 || 
        (error.response?.status === 503 && content.length > 50000) ||
        (error.response?.status === 503 && timeoutErrorDetails.includes('timeout after 45 seconds'))) {
      const errorMsg = `File too large or complex (${content.length} characters)\n\nThe server has a 45-second timeout. Your file requires more processing time.\n\nPlease break into smaller chunks:\n• Split files over 50KB into multiple parts\n• Translate sections separately (e.g., split by top-level keys for JSON)\n• Use translate_text for batches of 50-100 strings\n• Each chunk should process in under 45 seconds\n\nAlternatively, wait for async job support (coming soon).\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_file]`;
      throw new Error(errorMsg);
    }
    
    // Check if it's actually a service unavailable error (only for real infrastructure issues)
    if (error.response?.status === 503 && content.length <= 50000) {
      throw new Error(`i18n-agent encountered unexpected problem, and we are working on it, try again later.`);
    }
    
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.response?.status === 502 ||
        error.response?.status === 504) {
      const serviceErrorDetails = error.response?.data?.result?.content?.[0]?.text || 
                                  error.response?.data?.error?.message || 
                                  error.message;
      const debugInfo = `Code: ${error.code || 'N/A'}\nStatus: ${error.response?.status || 'N/A'}\nStatusText: ${error.response?.statusText || 'N/A'}\nDetails: ${serviceErrorDetails}\nURL: ${error.config?.url || 'N/A'}\nTimestamp: ${new Date().toISOString()}`;
      throw new Error(`Translation service error\n${debugInfo}\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_file]`);
    }
    
    // For other errors, include all debug info in the error message
    const finalErrorDetails = error.response?.data?.result?.content?.[0]?.text || 
                              error.response?.data?.error?.message || 
                              error.message;
    const debugInfo = `Status: ${error.response?.status || 'N/A'}\nStatusText: ${error.response?.statusText || 'N/A'}\nDetails: ${finalErrorDetails}\nTimestamp: ${new Date().toISOString()}`;
    throw new Error(`Error\n${debugInfo}\n[MCP v${MCP_CLIENT_VERSION}/STDIO/translate_file]`);
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
        timeout: 30000
      });
      
      if (response.data.error) {
        const errorMsg = response.data.error.message || response.data.error;
        const isAuthError = errorMsg.toString().toLowerCase().includes('api key') || 
                           errorMsg.toString().toLowerCase().includes('api_key') ||
                           errorMsg.toString().toLowerCase().includes('unauthorized');
        const isCreditError = errorMsg.toString().toLowerCase().includes('credit') || 
                             errorMsg.toString().toLowerCase().includes('quota') ||
                             errorMsg.toString().toLowerCase().includes('limit exceeded');
        
        let finalErrorMsg = `Status check error: ${errorMsg}`;
        if (!isAuthError && !isCreditError) {
          finalErrorMsg += `. Please retry with a smaller chunk or split the content into multiple requests.`;
        }
        throw new Error(finalErrorMsg);
      }
      
      const result = response.data.result;
      if (result && result.content && result.content[0]) {
        const status = JSON.parse(result.content[0].text);
        
        if (status.status === 'completed') {
          return status.result;
        } else if (status.status === 'failed') {
          const errorMsg = status.error;
          const isAuthError = errorMsg.toString().toLowerCase().includes('api key') || 
                             errorMsg.toString().toLowerCase().includes('api_key') ||
                             errorMsg.toString().toLowerCase().includes('unauthorized');
          const isCreditError = errorMsg.toString().toLowerCase().includes('credit') || 
                               errorMsg.toString().toLowerCase().includes('quota') ||
                               errorMsg.toString().toLowerCase().includes('limit exceeded');
          
          let finalErrorMsg = `Translation failed: ${errorMsg}`;
          if (!isAuthError && !isCreditError) {
            finalErrorMsg += `. Please retry with a smaller chunk or split the content into multiple requests.`;
          }
          throw new Error(finalErrorMsg);
        }
        
        // Still processing - continue polling
        console.error(`Translation progress: ${status.progress}% (${status.message})`);
      }
    } catch (error) {
      console.error(`Error polling job status: ${error.message}`);
      // Continue polling even if status check fails
    }
  }
  
  throw new Error(`Translation job ${jobId} timed out after ${maxPolls * pollInterval / 1000} seconds. Please retry with a smaller chunk or split the content into multiple requests.`);
}

async function handleAnalyzeContent(args) {
  const {
    content,
    fileType,
    sourceLanguage,
    targetLanguage,
    industry = 'general',
    targetAudience = 'general',
    region
  } = args;

  if (!content) {
    throw new Error('content is required');
  }

  if (!targetLanguage) {
    throw new Error('targetLanguage is required');
  }

  // Use MCP JSON-RPC protocol for analyze_content
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'analyze_content',
      arguments: {
        apiKey: API_KEY,
        content,
        fileType,
        sourceLanguage,
        targetLanguage,
        industry,
        targetAudience,
        region
      }
    }
  };

  try {
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 1 minute timeout for analysis
    });

    if (response.data.error) {
      const errorMsg = response.data.error.message || response.data.error;
      throw new Error(`Content analysis error: ${errorMsg}`);
    }

    return response.data.result;
  } catch (error) {
    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      const authErrorDetails = error.response.data?.message || error.response.data?.result?.content?.[0]?.text || error.message;
      throw new Error(`❌ Invalid API key (401)\nDetails: ${authErrorDetails}\nPlease check your API key at https://app.i18nagent.ai\n[MCP v${MCP_CLIENT_VERSION}/STDIO/analyze_content]`);
    }

    // Handle 402 payment required
    if (error.response?.status === 402) {
      const creditErrorDetails = error.response.data?.message || error.response.data?.result?.content?.[0]?.text || error.message;
      throw new Error(`⚠️ Insufficient credits (402)\nDetails: ${creditErrorDetails}\nPlease top up at https://app.i18nagent.ai\n[MCP v${MCP_CLIENT_VERSION}/STDIO/analyze_content]`);
    }

    // Handle 503 service unavailable
    if (error.response?.status === 503) {
      throw new Error(`i18n-agent encountered unexpected problem, and we are working on it, try again later.`);
    }

    console.error('Content analysis error:', error);
    throw new Error(`Unable to analyze content: ${error.message}`);
  }
}

async function handleGetCredits(args) {
  const { apiKey } = args;
  const creditsApiKey = apiKey || API_KEY;

  // Use MCP JSON-RPC protocol for get_credits
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'get_credits',
      arguments: {
        apiKey: creditsApiKey
      }
    }
  };

  try {
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.data.error) {
      const errorMsg = response.data.error.message || response.data.error;
      const isAuthError = errorMsg.toString().toLowerCase().includes('api key') ||
                         errorMsg.toString().toLowerCase().includes('api_key') ||
                         errorMsg.toString().toLowerCase().includes('unauthorized');
      const isCreditError = errorMsg.toString().toLowerCase().includes('credit') ||
                           errorMsg.toString().toLowerCase().includes('quota') ||
                           errorMsg.toString().toLowerCase().includes('limit exceeded');

      let finalErrorMsg = `Credits service error: ${errorMsg}`;
      if (!isAuthError && !isCreditError) {
        finalErrorMsg += `. Please check the service status or contact support.`;
      }
      throw new Error(finalErrorMsg);
    }

    const result = response.data.result;
    if (result && result.content && result.content[0]) {
      const textContent = result.content[0].text;

      // Try to parse as JSON for structured data
      try {
        const parsed = JSON.parse(textContent);
        const approximateWordsAvailable = parsed.credits ? Math.floor(parsed.credits * 1000) : 0;

        return {
          content: [
            {
              type: 'text',
              text: `💰 **Credits Information**\n\n` +
                    `💳 **Credits Remaining**: ${parsed.credits || 'N/A'}\n` +
                    `📝 **Approximate Words Available**: ${approximateWordsAvailable.toLocaleString()}\n` +
                    `💵 **Cost per Word**: 0.001 credits\n` +
                    `⏰ **Last Updated**: ${new Date().toLocaleString()}\n\n` +
                    `Note: Word count is approximate and may vary based on actual content complexity and translation requirements.`,
            },
          ],
        };
      } catch {
        // Return raw text if not JSON
        return result;
      }
    }

    return result;
  } catch (error) {
    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      const creditsAuthErrorDetails = error.response.data?.message || error.response.data?.result?.content?.[0]?.text || error.message;
      throw new Error(`❌ Invalid API key (401)\nDetails: ${creditsAuthErrorDetails}\nPlease check your API key at https://app.i18nagent.ai\n[MCP v${MCP_CLIENT_VERSION}/STDIO/get_credits]`);
    }

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

/*
 * =====================================================================
 * TOKEN USAGE HANDLERS - INTENTIONALLY REMOVED FOR SECURITY
 * =====================================================================
 * 
 * The following handler functions have been permanently removed from 
 * the MCP client to prevent unauthorized access to sensitive analytics:
 * 
 * - handleGetTokenUsageStats()
 * - handleGetTokenUsageByTranslation() 
 * - handleGetTokenUsageByApiKey()
 * 
 * SECURITY RATIONALE:
 * Token usage data contains sensitive billing and usage information
 * that should not be accessible through programmatic MCP clients.
 * This data includes:
 * - Detailed usage patterns and costs
 * - API key performance metrics
 * - Translation volume analytics
 * - Billing-related information
 * 
 * ACCESS ALTERNATIVES:
 * - Use the web dashboard at https://app.i18nagent.ai
 * - Contact support for usage reports
 * - Use admin interfaces (internal only)
 * 
 * This restriction is enforced as a hard security boundary and 
 * cannot be bypassed through client modifications.
 * =====================================================================
 */

// Handler for checking translation status
async function handleCheckTranslationStatus(args) {
  const { jobId } = args;

  if (!jobId) {
    throw new Error('jobId is required');
  }

  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'check_translation_status',
      arguments: { jobId }
    }
  };

  try {
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data.error) {
      throw new Error(`Translation status error: ${response.data.error.message || response.data.error}`);
    }

    return response.data.result;
  } catch (error) {
    console.error('Check translation status error:', error);

    // Handle 503 service unavailable
    if (error.response?.status === 503) {
      throw new Error(`i18n-agent encountered unexpected problem, and we are working on it, try again later.`);
    }

    // Handle 404 not found
    if (error.response?.status === 404) {
      throw new Error(`Translation job ${jobId} not found. The job may have expired or the ID is incorrect.`);
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Status check timed out. The service may be experiencing high load. Please try again.`);
    }

    // Generic error
    throw new Error(`Unable to check translation status: ${error.message}`);
  }
}

// Handler for resuming translation jobs
async function handleResumeTranslation(args) {
  const { jobId } = args;

  if (!jobId) {
    throw new Error('jobId is required');
  }

  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'resume_translation',
      arguments: { jobId }
    }
  };

  try {
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data.error) {
      throw new Error(`Resume translation error: ${response.data.error.message || response.data.error}`);
    }

    return response.data.result;
  } catch (error) {
    console.error('Resume translation error:', error);

    // Handle 503 service unavailable
    if (error.response?.status === 503) {
      throw new Error(`i18n-agent encountered unexpected problem, and we are working on it, try again later.`);
    }

    // Handle 404 not found
    if (error.response?.status === 404) {
      throw new Error(`Translation job ${jobId} not found. The job may have expired or the ID is incorrect.`);
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Resume request timed out. The service may be experiencing high load. Please try again.`);
    }

    // Generic error
    throw new Error(`Unable to resume translation: ${error.message}`);
  }
}

// Handler for downloading completed translations
async function handleDownloadTranslations(args) {
  const { jobId } = args;

  if (!jobId) {
    throw new Error('jobId is required');
  }

  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'download_translations',
      arguments: {
        apiKey: API_KEY,
        jobId
      }
    }
  };

  try {
    // Step 1: Get download URLs from MCP server
    const response = await axios.post(MCP_SERVER_URL, mcpRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data.error) {
      throw new Error(`Download translations error: ${response.data.error.message || response.data.error}`);
    }

    const result = response.data.result;

    // Parse the MCP response
    let parsedResult;
    if (result && result.content && result.content[0]) {
      parsedResult = JSON.parse(result.content[0].text);
    } else {
      parsedResult = result;
    }

    // Detect storage type and handle accordingly
    const storageType = parsedResult.storageType || 'local';
    const outputDir = `/tmp/i18n-translations-${jobId}`;

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filesWritten = [];

    if (storageType === 's3' && parsedResult.downloadUrls) {
      // Case 1: S3 Storage - download files from presigned URLs
      console.error(`📥 Downloading ${Object.keys(parsedResult.downloadUrls).length} translation files from S3...`);

      for (const [language, downloadUrl] of Object.entries(parsedResult.downloadUrls)) {
        try {
          console.error(`📥 Downloading ${language}...`);

          const fileResponse = await axios.get(downloadUrl, {
            responseType: 'text',
            timeout: 60000, // 1 minute per file
            headers: {
              'Authorization': `Bearer ${API_KEY}`
            }
          });

          // Determine file extension from file name or metadata
          const fileType = parsedResult.fileName?.split('.').pop() || 'json';
          const fileName = `${language}.${fileType}`;
          const filePath = path.join(outputDir, fileName);

          // Write file to disk
          fs.writeFileSync(filePath, fileResponse.data, 'utf8');
          filesWritten.push(filePath);

          console.error(`✅ Downloaded ${fileName}`);
        } catch (downloadError) {
          console.error(`❌ Failed to download ${language}:`, downloadError.message);
          throw new Error(`Failed to download ${language}: ${downloadError.message}`);
        }
      }
    } else if (parsedResult.translations) {
      // Case 2: Raw Translations - write directly from response
      console.error(`💾 Writing ${Object.keys(parsedResult.translations).length} translation files from raw content...`);

      for (const [language, content] of Object.entries(parsedResult.translations)) {
        try {
          console.error(`💾 Writing ${language}...`);

          // Determine file extension from file name or default to json
          const fileType = parsedResult.fileName?.split('.').pop() || 'json';
          const fileName = `${language}.${fileType}`;
          const filePath = path.join(outputDir, fileName);

          // Write file to disk
          fs.writeFileSync(filePath, content, 'utf8');
          filesWritten.push(filePath);

          console.error(`✅ Wrote ${fileName}`);
        } catch (writeError) {
          console.error(`❌ Failed to write ${language}:`, writeError.message);
          throw new Error(`Failed to write ${language}: ${writeError.message}`);
        }
      }
    } else {
      // No valid download method found
      throw new Error(`No translations available. Storage type: ${storageType}. Expected either downloadUrls (S3) or translations (raw content).`);
    }

    // Return success with file paths
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          jobId,
          outputDirectory: outputDir,
          filesWritten,
          storageType,
          fileName: parsedResult.fileName,
          targetLanguages: parsedResult.targetLanguages,
          message: `✅ ${storageType === 's3' ? 'Downloaded' : 'Wrote'} ${filesWritten.length} translation files to ${outputDir}`
        }, null, 2)
      }]
    };

  } catch (error) {
    console.error('Download translations error:', error);

    // Handle 503 service unavailable
    if (error.response?.status === 503) {
      throw new Error(`i18n-agent encountered unexpected problem, and we are working on it, try again later.`);
    }

    // Handle 404 not found
    if (error.response?.status === 404) {
      throw new Error(`Translation job ${jobId} not found. The job may have expired or the ID is incorrect.`);
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Download request timed out. The service may be experiencing high load. Please try again.`);
    }

    // Generic error
    throw new Error(`Unable to download translations: ${error.message}`);
  }
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