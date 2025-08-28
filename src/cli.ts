#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ClaudeCodeInstaller } from './installers/claude-code';
import { GeminiInstaller } from './installers/gemini';
import { CursorInstaller } from './installers/cursor';

const program = new Command();

program
  .name('i18n-agent-mcp')
  .description('Install i18n-agent MCP client for AI development environments')
  .version('1.0.0');

program
  .command('install')
  .description('Install MCP client for specified IDE')
  .option('--claude-code', 'Install for Claude Code CLI')
  .option('--gemini', 'Install for Gemini IDE')
  .option('--cursor', 'Install for Cursor IDE')
  .option('--api-key <key>', 'Set API key for i18n-agent service')
  .option('--server-url <url>', 'Set custom server URL (default: production)')
  .action(async (options) => {
    console.log(chalk.blue.bold('🌐 i18n Agent MCP Client Installer'));
    console.log(chalk.gray('Setting up translation capabilities for your AI development environment\\n'));

    try {
      // Determine which installer to use
      let installer;
      let ideName;

      if (options.claudeCode) {
        installer = new ClaudeCodeInstaller();
        ideName = 'Claude Code';
      } else if (options.gemini) {
        installer = new GeminiInstaller();
        ideName = 'Gemini IDE';
      } else if (options.cursor) {
        installer = new CursorInstaller();
        ideName = 'Cursor';
      } else {
        // Interactive mode - ask user to choose
        const { ide } = await inquirer.prompt([
          {
            type: 'list',
            name: 'ide',
            message: 'Which AI development environment would you like to install for?',
            choices: [
              { name: 'Claude Code (Anthropic)', value: 'claude-code' },
              { name: 'Gemini IDE (Google)', value: 'gemini' },
              { name: 'Cursor (Anysphere)', value: 'cursor' },
            ],
          },
        ]);

        switch (ide) {
          case 'claude-code':
            installer = new ClaudeCodeInstaller();
            ideName = 'Claude Code';
            break;
          case 'gemini':
            installer = new GeminiInstaller();
            ideName = 'Gemini IDE';
            break;
          case 'cursor':
            installer = new CursorInstaller();
            ideName = 'Cursor';
            break;
        }
      }

      if (!installer) {
        console.error(chalk.red('❌ No installer selected'));
        process.exit(1);
      }

      // Get API key if not provided
      let apiKey = options.apiKey;
      if (!apiKey) {
        console.log(chalk.yellow('🔑 API Key Setup'));
        console.log(chalk.gray('You need an API key to use i18n-agent translation services.'));
        console.log(chalk.blue('💡 Get your API key at: https://app.i18nagent.ai'));
        console.log(chalk.gray('   • Sign up to get your API key'));
        console.log(chalk.gray('   • Pay-per-use pricing - only pay for what you translate\\n'));

        const { keyChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'keyChoice',
            message: 'How would you like to proceed?',
            choices: [
              { name: 'I have an API key (paste it now)', value: 'enter' },
              { name: 'Use demo key for testing (limited functionality)', value: 'demo' },
              { name: 'Open browser to get API key first', value: 'browser' },
            ],
          },
        ]);

        if (keyChoice === 'browser') {
          console.log(chalk.blue('🌐 Opening https://app.i18nagent.ai...'));
          
          // Try to open browser (cross-platform)
          const { exec } = require('child_process');
          const url = 'https://app.i18nagent.ai';
          
          let openCommand;
          if (process.platform === 'darwin') openCommand = 'open';
          else if (process.platform === 'win32') openCommand = 'start';
          else openCommand = 'xdg-open';
          
          exec(`${openCommand} ${url}`, (error: any) => {
            if (error) {
              console.log(chalk.gray('Could not open browser automatically.'));
              console.log(chalk.blue(`Please visit: ${url}`));
            }
          });

          console.log(chalk.gray('\\nAfter getting your API key, run the installer again with:'));
          console.log(chalk.cyan(`npx i18n-agent-mcp-client install --${options.claudeCode ? 'claude-code' : options.gemini ? 'gemini' : options.cursor ? 'cursor' : 'claude-code'} --api-key YOUR_API_KEY`));
          process.exit(0);
        }

        if (keyChoice === 'enter') {
          const { key } = await inquirer.prompt([
            {
              type: 'password',
              name: 'key',
              message: 'Paste your API key:',
              mask: '*',
              validate: (input: string) => {
                if (!input || input.length < 10) {
                  return 'Please enter a valid API key (at least 10 characters)';
                }
                return true;
              },
            },
          ]);
          apiKey = key;
        } else {
          apiKey = 'demo-key-2025';
          console.log(chalk.yellow('⚠️  Using demo key - some features may be limited'));
        }
      }

      // Get server URL
      const serverUrl = options.serverUrl || 'http://i18n-agent-shared-alb-1223748939.eu-central-1.elb.amazonaws.com';

      console.log(chalk.cyan(`\\n🚀 Installing i18n-agent MCP client for ${ideName}...`));

      const spinner = ora('Setting up MCP configuration...').start();

      await installer.install({
        apiKey,
        serverUrl,
      });

      spinner.succeed(chalk.green('✅ Installation completed successfully!'));

      console.log(chalk.green.bold('\\n🎉 Setup Complete!'));
      console.log(chalk.white('\\nYour AI development environment now has access to:'));
      console.log(chalk.cyan('  • translate_text - Translate text with cultural context'));
      console.log(chalk.cyan('  • translate_file - Translate entire files (JSON, YAML, CSV, etc.)'));
      console.log(chalk.cyan('  • list_supported_languages - View available language pairs'));
      
      console.log(chalk.yellow('\\n💡 Quick Start:'));
      console.log(chalk.gray('  Ask your AI assistant: \"Translate this text to Spanish: Hello World\"'));
      console.log(chalk.gray('  Or: \"Translate my en.json file to French\"'));

      console.log(chalk.blue('\\n📚 Documentation: https://i18nagent.ai/docs/mcp-integration'));

    } catch (error) {
      console.error(chalk.red('❌ Installation failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check installation status')
  .action(async () => {
    console.log(chalk.blue.bold('🔍 Checking i18n-agent MCP installation status...\\n'));

    const installers = [
      { name: 'Claude Code', installer: new ClaudeCodeInstaller() },
      { name: 'Gemini IDE', installer: new GeminiInstaller() },
      { name: 'Cursor', installer: new CursorInstaller() },
    ];

    for (const { name, installer } of installers) {
      const status = await installer.checkStatus();
      const statusIcon = status.installed ? '✅' : '❌';
      const statusText = status.installed ? 'Installed' : 'Not installed';
      
      console.log(`${statusIcon} ${name}: ${chalk.cyan(statusText)}`);
      if (status.configPath) {
        console.log(chalk.gray(`   Config: ${status.configPath}`));
      }
      if (status.details) {
        console.log(chalk.gray(`   Details: ${status.details}`));
      }
      console.log();
    }
  });

program
  .command('uninstall')
  .description('Remove MCP client configuration')
  .option('--claude-code', 'Uninstall from Claude Code CLI')
  .option('--gemini', 'Uninstall from Gemini IDE')
  .option('--cursor', 'Uninstall from Cursor IDE')
  .action(async (options) => {
    console.log(chalk.yellow.bold('🗑️ i18n Agent MCP Client Uninstaller\\n'));

    // Implementation for uninstall
    console.log(chalk.gray('Uninstall functionality will be implemented in a future version.'));
    console.log(chalk.gray('For now, you can manually remove the MCP configuration from your IDE settings.'));
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command. Available commands: install, status, uninstall'));
  console.log(chalk.gray('Use --help for more information.'));
  process.exit(1);
});

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse();