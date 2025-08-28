import { BaseInstaller, InstallConfig, InstallStatus } from './base';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class GeminiInstaller extends BaseInstaller {
  private getConfigPath(): string {
    const homeDir = os.homedir();
    
    if (process.platform === 'win32') {
      return path.join(homeDir, 'AppData', 'Roaming', 'gemini-ide', 'extensions.json');
    } else if (process.platform === 'darwin') {
      return path.join(homeDir, 'Library', 'Application Support', 'gemini-ide', 'extensions.json');
    } else {
      return path.join(homeDir, '.config', 'gemini-ide', 'extensions.json');
    }
  }

  async install(config: InstallConfig): Promise<void> {
    const configPath = this.getConfigPath();
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(configPath));

    // Load existing config or create new one
    let extensions: any = {};
    try {
      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        extensions = JSON.parse(content);
      }
    } catch (error) {
      extensions = {};
    }

    // Add i18n-agent extension configuration
    extensions['i18n-agent'] = {
      name: 'i18n Agent Translation',
      version: '1.0.0',
      description: 'AI-powered translation service with context awareness',
      enabled: true,
      config: {
        apiKey: config.apiKey,
        serverUrl: config.serverUrl
      },
      commands: [
        'translate_text',
        'translate_file', 
        'list_supported_languages'
      ]
    };

    // Write the updated config
    await fs.writeFile(configPath, JSON.stringify(extensions, null, 2));
  }

  async checkStatus(): Promise<InstallStatus> {
    const configPath = this.getConfigPath();
    
    try {
      if (!(await fs.pathExists(configPath))) {
        return {
          installed: false,
          configPath,
          details: 'Gemini IDE extensions configuration not found',
        };
      }

      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      const hasI18nAgent = config['i18n-agent'] && config['i18n-agent'].enabled;

      return {
        installed: !!hasI18nAgent,
        configPath,
        details: hasI18nAgent 
          ? 'i18n-agent extension configured in Gemini IDE' 
          : 'Extension config exists but i18n-agent not enabled',
      };
    } catch (error) {
      return {
        installed: false,
        configPath,
        details: \`Error reading Gemini IDE config: \${error instanceof Error ? error.message : String(error)}\`,
      };
    }
  }

  async uninstall(): Promise<void> {
    const configPath = this.getConfigPath();
    
    if (!(await fs.pathExists(configPath))) {
      return;
    }

    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    if (config['i18n-agent']) {
      delete config['i18n-agent'];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
  }
}