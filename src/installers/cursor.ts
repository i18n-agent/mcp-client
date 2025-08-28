import { BaseInstaller, InstallConfig, InstallStatus } from './base';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class CursorInstaller extends BaseInstaller {
  private getConfigPath(): string {
    const homeDir = os.homedir();
    
    if (process.platform === 'win32') {
      return path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'settings.json');
    } else if (process.platform === 'darwin') {
      return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
    } else {
      return path.join(homeDir, '.config', 'Cursor', 'User', 'settings.json');
    }
  }

  private getExtensionsPath(): string {
    const homeDir = os.homedir();
    
    if (process.platform === 'win32') {
      return path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'extensions', 'i18n-agent');
    } else if (process.platform === 'darwin') {
      return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'extensions', 'i18n-agent');
    } else {
      return path.join(homeDir, '.config', 'Cursor', 'extensions', 'i18n-agent');
    }
  }

  async install(config: InstallConfig): Promise<void> {
    const configPath = this.getConfigPath();
    const extensionsPath = this.getExtensionsPath();
    
    // Ensure directories exist
    await fs.ensureDir(path.dirname(configPath));
    await fs.ensureDir(extensionsPath);

    // Create extension manifest
    const extensionManifest = {
      name: 'i18n-agent',
      displayName: 'i18n Agent Translation',
      description: 'AI-powered translation service with context awareness',
      version: '1.0.0',
      publisher: 'i18n-agent',
      categories: ['Other', 'AI'],
      main: './extension.js',
      contributes: {
        commands: [
          {
            command: 'i18n-agent.translateText',
            title: 'Translate Text',
            category: 'i18n Agent'
          },
          {
            command: 'i18n-agent.translateFile',
            title: 'Translate File',
            category: 'i18n Agent'
          },
          {
            command: 'i18n-agent.listLanguages',
            title: 'List Supported Languages',
            category: 'i18n Agent'
          }
        ],
        configuration: {
          title: 'i18n Agent',
          properties: {
            'i18n-agent.apiKey': {
              type: 'string',
              default: config.apiKey,
              description: 'API key for i18n-agent service'
            },
            'i18n-agent.serverUrl': {
              type: 'string',
              default: config.serverUrl,
              description: 'Server URL for i18n-agent service'
            }
          }
        }
      }
    };

    // Create extension entry point
    const extensionCode = \`
const vscode = require('vscode');
const axios = require('axios');

function activate(context) {
    const config = vscode.workspace.getConfiguration('i18n-agent');
    const apiKey = config.get('apiKey');
    const serverUrl = config.get('serverUrl');

    // Register translate text command
    let translateTextCommand = vscode.commands.registerCommand('i18n-agent.translateText', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (!selectedText) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }

        const targetLanguage = await vscode.window.showInputBox({
            prompt: 'Enter target language (e.g., "es", "fr", "de")',
            placeHolder: 'es'
        });

        if (!targetLanguage) return;

        try {
            const response = await axios.post(\\\`\\\${serverUrl}/translate/text\\\`, {
                texts: [selectedText],
                targetLanguage: targetLanguage
            }, {
                headers: {
                    'Authorization': \\\`Bearer \\\${apiKey}\\\`,
                    'Content-Type': 'application/json'
                }
            });

            const translatedText = response.data.translations[0];
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, translatedText);
            });

            vscode.window.showInformationMessage('Text translated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(\\\`Translation failed: \\\${error.message}\\\`);
        }
    });

    // Register translate file command
    let translateFileCommand = vscode.commands.registerCommand('i18n-agent.translateFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const fileContent = editor.document.getText();
        const targetLanguage = await vscode.window.showInputBox({
            prompt: 'Enter target language (e.g., "es", "fr", "de")',
            placeHolder: 'es'
        });

        if (!targetLanguage) return;

        try {
            const response = await axios.post(\\\`\\\${serverUrl}/translate/file\\\`, {
                fileContent: fileContent,
                targetLanguage: targetLanguage,
                fileType: 'auto'
            }, {
                headers: {
                    'Authorization': \\\`Bearer \\\${apiKey}\\\`,
                    'Content-Type': 'application/json'
                }
            });

            // Create new document with translated content
            const translatedDoc = await vscode.workspace.openTextDocument({
                content: response.data.translatedContent,
                language: editor.document.languageId
            });
            
            await vscode.window.showTextDocument(translatedDoc);
            vscode.window.showInformationMessage('File translated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(\\\`File translation failed: \\\${error.message}\\\`);
        }
    });

    // Register list languages command
    let listLanguagesCommand = vscode.commands.registerCommand('i18n-agent.listLanguages', async () => {
        try {
            const response = await axios.get(\\\`\\\${serverUrl}/languages\\\`, {
                headers: {
                    'Authorization': \\\`Bearer \\\${apiKey}\\\`
                }
            });

            const languages = response.data.languages;
            const languageList = languages.map(lang => \\\`\\\${lang.code}: \\\${lang.name}\\\`).join('\\\\n');
            
            vscode.window.showInformationMessage(\\\`Supported Languages:\\\\n\\\${languageList}\\\`, { modal: true });
        } catch (error) {
            vscode.window.showErrorMessage(\\\`Failed to fetch languages: \\\${error.message}\\\`);
        }
    });

    context.subscriptions.push(translateTextCommand);
    context.subscriptions.push(translateFileCommand);
    context.subscriptions.push(listLanguagesCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
\`;

    // Write extension files
    await fs.writeFile(path.join(extensionsPath, 'package.json'), JSON.stringify(extensionManifest, null, 2));
    await fs.writeFile(path.join(extensionsPath, 'extension.js'), extensionCode);

    // Update Cursor settings to enable the extension
    let cursorSettings: any = {};
    try {
      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        cursorSettings = JSON.parse(content);
      }
    } catch (error) {
      cursorSettings = {};
    }

    // Add i18n-agent configuration
    cursorSettings['i18n-agent.apiKey'] = config.apiKey;
    cursorSettings['i18n-agent.serverUrl'] = config.serverUrl;

    await fs.writeFile(configPath, JSON.stringify(cursorSettings, null, 2));
  }

  async checkStatus(): Promise<InstallStatus> {
    const configPath = this.getConfigPath();
    const extensionsPath = this.getExtensionsPath();
    
    try {
      const configExists = await fs.pathExists(configPath);
      const extensionExists = await fs.pathExists(path.join(extensionsPath, 'package.json'));
      
      if (!configExists) {
        return {
          installed: false,
          configPath,
          details: 'Cursor settings not found',
        };
      }

      if (!extensionExists) {
        return {
          installed: false,
          configPath,
          details: 'i18n-agent extension not installed',
        };
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      const hasApiKey = config['i18n-agent.apiKey'] !== undefined;

      return {
        installed: hasApiKey,
        configPath,
        details: hasApiKey 
          ? 'i18n-agent extension configured in Cursor' 
          : 'Extension installed but not configured',
      };
    } catch (error) {
      return {
        installed: false,
        configPath,
        details: \`Error reading Cursor config: \${error instanceof Error ? error.message : String(error)}\`,
      };
    }
  }

  async uninstall(): Promise<void> {
    const configPath = this.getConfigPath();
    const extensionsPath = this.getExtensionsPath();
    
    // Remove extension directory
    if (await fs.pathExists(extensionsPath)) {
      await fs.remove(extensionsPath);
    }

    // Remove settings
    if (await fs.pathExists(configPath)) {
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      delete config['i18n-agent.apiKey'];
      delete config['i18n-agent.serverUrl'];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
  }
}