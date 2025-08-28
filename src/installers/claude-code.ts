import { BaseInstaller, InstallConfig, InstallStatus } from './base';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class ClaudeCodeInstaller extends BaseInstaller {
  private getConfigPath(): string {
    const homeDir = os.homedir();
    
    if (process.platform === 'win32') {
      return path.join(homeDir, 'AppData', 'Roaming', 'claude-code', 'mcp_servers.json');
    } else if (process.platform === 'darwin') {
      return path.join(homeDir, 'Library', 'Application Support', 'claude-code', 'mcp_servers.json');
    } else {
      return path.join(homeDir, '.config', 'claude-code', 'mcp_servers.json');
    }
  }

  async install(config: InstallConfig): Promise<void> {
    const configPath = this.getConfigPath();
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(configPath));

    // Load existing config or create new one
    let mcpConfig: any = {};
    try {
      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        mcpConfig = JSON.parse(content);
      }
    } catch (error) {
      mcpConfig = {};
    }

    // Ensure mcpServers object exists
    if (!mcpConfig.mcpServers) {
      mcpConfig.mcpServers = {};
    }

    // Add i18n-agent MCP server configuration
    mcpConfig.mcpServers['i18n-agent'] = {
      command: 'node',
      args: [
        '-e',
        `
const axios = require('axios');

class I18nAgentMCP {
  constructor() {
    this.apiKey = '${config.apiKey}';
    this.serverUrl = '${config.serverUrl}';
    this.setupMCP();
  }

  setupMCP() {
    process.stdin.on('data', async (data) => {
      try {
        const request = JSON.parse(data.toString());
        const response = await this.handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\\n');
      } catch (error) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' }
        }) + '\\n');
      }
    });

    // Send initialization
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    }) + '\\n');
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'i18n-agent',
                version: '1.0.0'
              }
            }
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'translate_text',
                  description: 'Translate text with cultural context and industry-specific terminology',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      texts: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of texts to translate'
                      },
                      targetLanguage: {
                        type: 'string',
                        description: 'Target language code (e.g., "es", "fr", "de")'
                      },
                      sourceLanguage: {
                        type: 'string',
                        description: 'Source language code (optional, auto-detected if not provided)'
                      },
                      industry: {
                        type: 'string',
                        description: 'Industry context (e.g., "technology", "healthcare", "finance")'
                      },
                      region: {
                        type: 'string',
                        description: 'Specific region for localization (e.g., "Spain", "Mexico")'
                      }
                    },
                    required: ['texts', 'targetLanguage']
                  }
                },
                {
                  name: 'translate_file',
                  description: 'Translate entire files while preserving structure (JSON, YAML, CSV, XML, Markdown, etc.)',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      fileContent: {
                        type: 'string',
                        description: 'Content of the file to translate'
                      },
                      targetLanguage: {
                        type: 'string',
                        description: 'Target language code'
                      },
                      fileType: {
                        type: 'string',
                        description: 'File type: json, yaml, xml, csv, txt, md, html, properties, or auto'
                      },
                      preserveKeys: {
                        type: 'boolean',
                        description: 'Whether to preserve keys/structure (for structured files)'
                      }
                    },
                    required: ['fileContent', 'targetLanguage']
                  }
                },
                {
                  name: 'list_supported_languages',
                  description: 'View available language pairs with quality ratings',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      includeQuality: {
                        type: 'boolean',
                        description: 'Include quality ratings for each language'
                      }
                    }
                  }
                }
              ]
            }
          };

        case 'tools/call':
          const { name: toolName, arguments: toolArgs } = params;
          
          if (toolName === 'translate_text') {
            const response = await axios.post(\`\${this.serverUrl}/translate/text\`, {
              ...toolArgs,
              targetLanguage: toolArgs.targetLanguage,
              texts: toolArgs.texts
            }, {
              headers: {
                'Authorization': \`Bearer \${this.apiKey}\`,
                'Content-Type': 'application/json'
              }
            });
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: \`Translated \${toolArgs.texts.length} text(s) to \${toolArgs.targetLanguage}:\\n\\n\${response.data.translations.join('\\n')}\`
                  }
                ]
              }
            };
          }
          
          if (toolName === 'translate_file') {
            const response = await axios.post(\`\${this.serverUrl}/translate/file\`, {
              fileContent: toolArgs.fileContent,
              targetLanguage: toolArgs.targetLanguage,
              fileType: toolArgs.fileType || 'auto',
              preserveKeys: toolArgs.preserveKeys !== false
            }, {
              headers: {
                'Authorization': \`Bearer \${this.apiKey}\`,
                'Content-Type': 'application/json'
              }
            });
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: \`File translated to \${toolArgs.targetLanguage}:\\n\\n\${response.data.translatedContent}\`
                  }
                ]
              }
            };
          }
          
          if (toolName === 'list_supported_languages') {
            const response = await axios.get(\`\${this.serverUrl}/languages\`, {
              headers: {
                'Authorization': \`Bearer \${this.apiKey}\`
              }
            });
            
            const languages = response.data.languages;
            const languageList = languages.map(lang => \`\${lang.code}: \${lang.name}\`).join('\\n');
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: \`Supported Languages:\\n\${languageList}\`
                  }
                ]
              }
            };
          }
          
          throw new Error(\`Unknown tool: \${toolName}\`);

        default:
          throw new Error(\`Unknown method: \${method}\`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message || 'Internal error'
        }
      };
    }
  }
}

new I18nAgentMCP();
        `
      ],
      env: {}
    };

    // Write the updated config
    await fs.writeFile(configPath, JSON.stringify(mcpConfig, null, 2));
  }

  async checkStatus(): Promise<InstallStatus> {
    const configPath = this.getConfigPath();
    
    try {
      if (!(await fs.pathExists(configPath))) {
        return {
          installed: false,
          configPath,
          details: 'Claude Code MCP configuration file not found',
        };
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      const hasI18nAgent = config.mcpServers && config.mcpServers['i18n-agent'];

      return {
        installed: !!hasI18nAgent,
        configPath,
        details: hasI18nAgent 
          ? 'i18n-agent MCP server configured in Claude Code' 
          : 'MCP config exists but i18n-agent not configured',
      };
    } catch (error) {
      return {
        installed: false,
        configPath,
        details: \`Error reading Claude Code config: \${error instanceof Error ? error.message : String(error)}\`,
      };
    }
  }

  async uninstall(): Promise<void> {
    const configPath = this.getConfigPath();
    
    if (!(await fs.pathExists(configPath))) {
      return;
    }

    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    if (config.mcpServers && config.mcpServers['i18n-agent']) {
      delete config.mcpServers['i18n-agent'];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
  }
}