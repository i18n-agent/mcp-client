#!/usr/bin/env node

/**
 * i18n-agent MCP Client Installer
 * Installs the MCP client to work with Claude, Cursor, VS Code and other AI IDEs
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Import modular components
import { detectEnvironment } from './lib/environment-detector.js';
import { extractExistingApiKey } from './lib/config-writer.js';
import { createInteractiveSession } from './lib/interactive-setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to get platform-specific paths
function getClaudeDesktopPath() {
  const platform = process.platform;
  if (platform === 'darwin') {
    // macOS
    return {
      configPath: path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
      displayPath: '~/Library/Application Support/Claude/claude_desktop_config.json'
    };
  } else if (platform === 'win32') {
    // Windows
    return {
      configPath: path.join(os.homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json'),
      displayPath: '%APPDATA%\\Claude\\claude_desktop_config.json'
    };
  } else {
    // Linux
    return {
      configPath: path.join(os.homedir(), '.config/Claude/claude_desktop_config.json'),
      displayPath: '~/.config/Claude/claude_desktop_config.json'
    };
  }
}

function getAntigravityPath() {
  const platform = process.platform;
  if (platform === 'darwin') {
    // macOS
    return {
      configPath: path.join(os.homedir(), '.gemini/antigravity/mcp_config.json'),
      displayPath: '~/.gemini/antigravity/mcp_config.json'
    };
  } else if (platform === 'win32') {
    // Windows
    return {
      configPath: path.join(os.homedir(), '.gemini/antigravity/mcp_config.json'),
      displayPath: '%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json'
    };
  } else {
    // Linux
    return {
      configPath: path.join(os.homedir(), '.config/antigravity/mcp_config.json'),
      displayPath: '~/.config/antigravity/mcp_config.json'
    };
  }
}

// Supported IDE configurations
const claudePaths = getClaudeDesktopPath();
const antigravityPaths = getAntigravityPath();
const IDE_CONFIGS = {
  claude: {
    name: 'Claude Desktop',
    configPath: claudePaths.configPath,
    displayPath: claudePaths.displayPath
  },
  'claude-code': {
    name: 'Claude Code CLI',
    configPath: path.join(os.homedir(), '.claude.json'),
    displayPath: '~/.claude.json'
  },
  cursor: {
    name: 'Cursor',
    configPath: path.join(os.homedir(), '.cursor/mcp_settings.json'),
    displayPath: '~/.cursor/mcp_settings.json'
  },
  vscode: {
    name: 'VS Code (with MCP extension)',
    configPath: path.join(os.homedir(), '.vscode/mcp_settings.json'),
    displayPath: '~/.vscode/mcp_settings.json'
  },
  codex: {
    name: 'Codex (OpenAI)',
    configPath: path.join(os.homedir(), '.codex/mcp_settings.json'),
    displayPath: '~/.codex/mcp_settings.json'
  },
  antigravity: {
    name: 'Antigravity (Google)',
    configPath: antigravityPaths.configPath,
    displayPath: antigravityPaths.displayPath
  }
};

console.log(`
🌍 i18n-agent MCP Client Installer
===================================

This installer will set up the i18n-agent MCP client for your AI IDE.

Features:
✨ Text translation with cultural context
📁 File translation (JSON, YAML, CSV, MD, etc.)
💰 Credit balance checking
🌐 48 languages supported with regional variants
`);

const getMcpClientPaths = () => {
  // Instead of using ephemeral npx cache, install to stable location
  const stableDir = path.join(os.homedir(), '.claude', 'mcp-servers', 'i18n-agent');
  const mcpClientPath = path.join(stableDir, 'i18n-agent.js');
  const packageDir = stableDir;
  return { mcpClientPath, packageDir, sourceFile: path.resolve(__dirname, 'i18n-agent.js') };
};

function copyMcpClientToStableLocation() {
  const paths = getMcpClientPaths();

  // Create stable directory
  fs.mkdirSync(paths.packageDir, { recursive: true });

  // Copy i18n-agent.js to stable location
  fs.copyFileSync(paths.sourceFile, paths.mcpClientPath);

  // Copy package.json to stable location
  const packageJsonSource = path.resolve(__dirname, 'package.json');
  const packageJsonDest = path.join(paths.packageDir, 'package.json');
  fs.copyFileSync(packageJsonSource, packageJsonDest);

  // Copy namespace-detector.js to stable location (required dependency)
  const namespaceDetectorSource = path.resolve(__dirname, 'namespace-detector.js');
  const namespaceDetectorDest = path.join(paths.packageDir, 'namespace-detector.js');
  fs.copyFileSync(namespaceDetectorSource, namespaceDetectorDest);

  // Install dependencies
  console.log(`   📦 Installing dependencies...`);
  try {
    execSync('npm install --omit=dev --ignore-scripts --silent', {
      cwd: paths.packageDir,
      stdio: 'pipe'
    });
    console.log(`   ✅ Dependencies installed successfully`);
  } catch (error) {
    console.error(`   ⚠️  Warning: Failed to install dependencies automatically`);
    console.error(`   💡 Run manually: cd ${paths.packageDir} && npm install`);
  }

  console.log(`   📦 Installed MCP client to: ${paths.packageDir}`);

  return paths;
}

async function detectAvailableIDEs() {
  const available = [];

  for (const [key, config] of Object.entries(IDE_CONFIGS)) {
    const configDir = path.dirname(config.configPath);
    if (fs.existsSync(configDir)) {
      available.push({ key, ...config });
    }
  }

  return available;
}

function checkExistingApiKey(configPath) {
  if (!fs.existsSync(configPath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    const apiKey = config.mcpServers?.["i18n-agent"]?.env?.I18N_AGENT_API_KEY;
    return apiKey && apiKey.trim() !== '';
  } catch (error) {
    return false;
  }
}

// Extract actual API key value from a config file
function extractApiKeyFromConfig(configPath) {
  // Use the modular config writer's extractExistingApiKey function
  const apiKey = extractExistingApiKey(configPath, 'i18n-agent');
  return apiKey ? apiKey.trim() : '';
}

// Find any existing API key from all available IDEs
function findAnyExistingApiKey(availableIDEs, claudeCodeCLIAvailable = false, codexCLIAvailable = false) {
  // Check Claude Code CLI first
  if (claudeCodeCLIAvailable) {
    const cliKey = getClaudeCodeExistingApiKey('i18n-agent');
    if (cliKey) {
      console.log('   🔑 Found existing API key from Claude Code CLI');
      return cliKey;
    }
  }

  // Check Codex CLI
  if (codexCLIAvailable) {
    const cliKey = getCodexExistingApiKey('i18n-agent');
    if (cliKey) {
      console.log('   🔑 Found existing API key from Codex CLI');
      return cliKey;
    }
  }

  // Check all config files
  for (const ide of availableIDEs) {
    const apiKey = extractApiKeyFromConfig(ide.configPath);
    if (apiKey) {
      console.log(`   🔑 Found existing API key from ${ide.name}`);
      return apiKey;
    }
  }

  // Also check ~/.claude.json specifically
  const claudeJsonPath = path.join(os.homedir(), '.claude.json');
  const claudeJsonKey = extractApiKeyFromConfig(claudeJsonPath);
  if (claudeJsonKey) {
    console.log('   🔑 Found existing API key from ~/.claude.json');
    return claudeJsonKey;
  }

  return '';
}

async function checkExistingApiKeys(availableIDEs, claudeCodeCLIAvailable = false, codexCLIAvailable = false) {
  const withKeys = [];
  const withoutKeys = [];

  for (const ide of availableIDEs) {
    let hasKey = false;

    // Check CLI registrations first for native CLI tools
    if (ide.key === 'claude-code' && claudeCodeCLIAvailable) {
      const cliKey = getClaudeCodeExistingApiKey('i18n-agent');
      if (cliKey) {
        hasKey = true;
      }
    } else if (ide.key === 'codex' && codexCLIAvailable) {
      const cliKey = getCodexExistingApiKey('i18n-agent');
      if (cliKey) {
        hasKey = true;
      }
    }

    // Fall back to config file check
    if (!hasKey) {
      // Also check ~/.claude.json for Claude Code CLI
      if (ide.key === 'claude-code') {
        const claudeJsonPath = path.join(os.homedir(), '.claude.json');
        if (checkExistingApiKey(claudeJsonPath)) {
          hasKey = true;
        }
      } else if (checkExistingApiKey(ide.configPath)) {
        hasKey = true;
      }
    }

    if (hasKey) {
      withKeys.push(ide);
    } else {
      withoutKeys.push(ide);
    }
  }

  return { withKeys, withoutKeys };
}

function createMCPConfig() {
  const { mcpClientPath, packageDir } = getMcpClientPaths();

  return {
    mcpServers: {
      "i18n-agent": {
        command: "node",
        args: [mcpClientPath],
        cwd: packageDir,
        env: {
          MCP_SERVER_URL: "https://mcp.i18nagent.ai",
          I18N_AGENT_API_KEY: ""
        },
        disabled: false
      }
    }
  };
}

function detectNodeEnvironment() {
  // Use the modular environment detector
  const envInfo = detectEnvironment();

  return {
    isNvm: envInfo.nodeVersionManager === 'nvm',
    nodePath: envInfo.nodePath,
    nodeVersion: process.version
  };
}

// Detect if Codex CLI is available
function isCodexCLIAvailable() {
  try {
    execSync('codex --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Check if MCP server is already registered in Codex
function isCodexMCPRegistered(serverName) {
  try {
    const result = execSync(`codex mcp get ${serverName}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Install MCP server via Codex CLI native command
function installViaCodexCLI(existingApiKey = '') {
  const { mcpClientPath, packageDir } = getMcpClientPaths();
  const nodeEnv = detectNodeEnvironment();

  // Determine node command - use absolute path for nvm
  const nodeCmd = nodeEnv.isNvm ? nodeEnv.nodePath : 'node';

  // Get existing API key from CLI registration BEFORE removing
  if (!existingApiKey) {
    existingApiKey = getCodexExistingApiKey('i18n-agent');
    if (existingApiKey) {
      console.log('   🔑 Preserving existing API key from CLI registration');
    }
  }

  // Remove existing registration if present
  if (isCodexMCPRegistered('i18n-agent')) {
    try {
      execSync('codex mcp remove i18n-agent', { stdio: 'pipe' });
      console.log('   🔄 Removed existing i18n-agent registration');
    } catch {
      // Ignore if removal fails
    }
  }

  // Build the command with env vars
  const envArgs = [
    '--env', `MCP_SERVER_URL=https://mcp.i18nagent.ai`
  ];

  if (existingApiKey) {
    envArgs.push('--env', `I18N_AGENT_API_KEY=${existingApiKey}`);
  } else {
    envArgs.push('--env', 'I18N_AGENT_API_KEY=');
  }

  // Build the full command
  // codex mcp add [--env KEY=VALUE]... <name> <command> [args...]
  const cmdParts = [
    'codex', 'mcp', 'add',
    ...envArgs,
    'i18n-agent',
    nodeCmd,
    mcpClientPath
  ];

  // Execute the command
  execSync(cmdParts.join(' '), {
    cwd: packageDir,
    stdio: 'pipe'
  });

  return true;
}

// Detect if Claude Code CLI is available
function isClaudeCodeCLIAvailable() {
  try {
    execSync('claude mcp list', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Check if MCP server is already registered in Claude Code CLI
function isClaudeCodeMCPRegistered(serverName) {
  try {
    execSync(`claude mcp get ${serverName}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Get existing API key from Claude Code CLI registration
function getClaudeCodeExistingApiKey(serverName) {
  try {
    const output = execSync(`claude mcp get ${serverName}`, { stdio: 'pipe', encoding: 'utf8' });
    // Parse output like: I18N_AGENT_API_KEY=i18n_xxx
    const match = output.match(/I18N_AGENT_API_KEY=([^\s,\n]+)/);
    if (match && match[1] && match[1] !== '') {
      return match[1];
    }
  } catch {
    // Server not registered
  }
  return '';
}

// Get existing API key from Codex CLI registration
function getCodexExistingApiKey(serverName) {
  try {
    const output = execSync(`codex mcp list`, { stdio: 'pipe', encoding: 'utf8' });
    // Parse output - Codex shows: I18N_AGENT_API_KEY=i18n_xxx, MCP_SERVER_URL=...
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(serverName)) {
        const match = line.match(/I18N_AGENT_API_KEY=([^\s,]+)/);
        if (match && match[1] && match[1] !== '') {
          return match[1];
        }
      }
    }
  } catch {
    // Server not registered
  }
  return '';
}

// Install MCP server via Claude Code CLI native command
function installViaClaudeCodeCLI(existingApiKey = '', scope = 'user') {
  const { mcpClientPath } = getMcpClientPaths();
  const nodeEnv = detectNodeEnvironment();

  // Determine node command - use absolute path for nvm
  const nodeCmd = nodeEnv.isNvm ? nodeEnv.nodePath : 'node';

  // Get existing API key from CLI registration BEFORE removing
  if (!existingApiKey) {
    existingApiKey = getClaudeCodeExistingApiKey('i18n-agent');
    if (existingApiKey) {
      console.log('   🔑 Preserving existing API key from CLI registration');
    }
  }

  // Remove existing registration if present
  if (isClaudeCodeMCPRegistered('i18n-agent')) {
    try {
      execSync(`claude mcp remove --scope ${scope} i18n-agent`, { stdio: 'pipe' });
      console.log('   🔄 Removed existing i18n-agent registration');
    } catch {
      // Ignore if removal fails
    }
  }

  // Build env args using -e format (Claude uses -e, not --env)
  // Note: -e args must come AFTER the server name
  const envArgs = [
    '-e', `MCP_SERVER_URL=https://mcp.i18nagent.ai`
  ];

  if (existingApiKey) {
    envArgs.push('-e', `I18N_AGENT_API_KEY=${existingApiKey}`);
  } else {
    envArgs.push('-e', 'I18N_AGENT_API_KEY=');
  }

  // Build the full command
  // claude mcp add --transport stdio --scope user <name> -e KEY=VALUE -- <command> [args...]
  // Note: <name> must come BEFORE -e options
  const cmdParts = [
    'claude', 'mcp', 'add',
    '--transport', 'stdio',
    '--scope', scope,
    'i18n-agent',  // Name must come before -e options
    ...envArgs,
    '--',  // Separator for command arguments
    nodeCmd,
    mcpClientPath
  ];

  // Execute the command
  execSync(cmdParts.join(' '), { stdio: 'pipe' });

  return true;
}

function createWrapperScript(targetDir) {
  const nodeEnv = detectNodeEnvironment();
  const wrapperPath = path.join(targetDir, 'run-mcp.sh');
  const { mcpClientPath, packageDir } = getMcpClientPaths();

  fs.mkdirSync(targetDir, { recursive: true });

  let wrapperContent;

  if (nodeEnv.isNvm) {
    // For nvm users, we need to set up the PATH properly
    wrapperContent = `#!/bin/bash
# Wrapper script for i18n-agent MCP client (handles nvm environments)
export PATH="${path.dirname(nodeEnv.nodePath)}:$PATH"
cd "${packageDir}"
exec node "${mcpClientPath}"`;
  } else {
    // For system node installations
    wrapperContent = `#!/bin/bash
# Wrapper script for i18n-agent MCP client
cd "${packageDir}"
exec node "${mcpClientPath}"`;
  }

  fs.writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 });
  return wrapperPath;
}

function updateClaudeConfig(configPath, ideKey = 'claude', sharedApiKey = '') {
  let config = {};
  let existingApiKey = "";
  let hasApiKey = false;

  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(content);

      // Preserve existing API key if present
      if (config.mcpServers?.["i18n-agent"]?.env?.I18N_AGENT_API_KEY) {
        existingApiKey = config.mcpServers["i18n-agent"].env.I18N_AGENT_API_KEY;
        hasApiKey = !!existingApiKey;
        console.log('   🔑 Preserving existing API key');
      }
    } catch (error) {
      console.warn(`Warning: Could not parse existing config at ${configPath}`);
    }
  }

  // Use shared API key if no existing key found
  if (!existingApiKey && sharedApiKey) {
    existingApiKey = sharedApiKey;
    hasApiKey = true;
    console.log('   🔄 Using shared API key from another IDE');
  }

  // Ensure mcpServers exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const nodeEnv = detectNodeEnvironment();
  const { mcpClientPath } = getMcpClientPaths();

  // Claude Code CLI works better with command+args format (not wrapper)
  if (ideKey === 'claude-code') {
    if (nodeEnv.isNvm) {
      // For nvm, use absolute node path with args
      console.log('   🔧 Using direct node path for Claude Code CLI');
      config.mcpServers["i18n-agent"] = {
        command: nodeEnv.nodePath,
        args: [mcpClientPath],
        env: {
          MCP_SERVER_URL: "https://mcp.i18nagent.ai",
          I18N_AGENT_API_KEY: existingApiKey || ""
        },
        disabled: false
      };
    } else {
      // For system node, use 'node' with args
      const baseConfig = createMCPConfig();
      config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];
      if (existingApiKey) {
        config.mcpServers["i18n-agent"].env.I18N_AGENT_API_KEY = existingApiKey;
      }
    }
  } else {
    // Claude Desktop - use wrapper script for compatibility
    if (nodeEnv.isNvm) {
      const claudeDir = path.join(os.homedir(), '.claude');
      console.log('   🔧 Detected nvm environment, creating wrapper script...');
      const wrapperPath = createWrapperScript(claudeDir);

      config.mcpServers["i18n-agent"] = {
        command: wrapperPath,
        env: {
          MCP_SERVER_URL: "https://mcp.i18nagent.ai",
          I18N_AGENT_API_KEY: existingApiKey || ""
        },
        disabled: false
      };
    } else {
      const baseConfig = createMCPConfig();
      config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];
      if (existingApiKey) {
        config.mcpServers["i18n-agent"].env.I18N_AGENT_API_KEY = existingApiKey;
      }
    }
  }

  // Write updated config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return { config, hasApiKey };
}

function updateGenericMCPConfig(configPath, sharedApiKey = '') {
  let config = {};
  let existingApiKey = "";
  let hasApiKey = false;

  if (fs.existsSync(configPath)) {
    try {
      const existing = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(existing);

      // Preserve existing API key if present
      if (config.mcpServers?.["i18n-agent"]?.env?.I18N_AGENT_API_KEY) {
        existingApiKey = config.mcpServers["i18n-agent"].env.I18N_AGENT_API_KEY;
        hasApiKey = !!existingApiKey;
        console.log('   🔑 Preserving existing API key');
      }
    } catch (error) {
      console.warn(`Warning: Could not parse existing config at ${configPath}`);
    }
  }

  // Use shared API key if no existing key found
  if (!existingApiKey && sharedApiKey) {
    existingApiKey = sharedApiKey;
    hasApiKey = true;
    console.log('   🔄 Using shared API key from another IDE');
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const nodeEnv = detectNodeEnvironment();
  const { mcpClientPath, packageDir } = getMcpClientPaths();

  // Use absolute node path for nvm environments, 'node' for system installations
  if (nodeEnv.isNvm) {
    console.log('   🔧 Using absolute node path for nvm environment');
    config.mcpServers["i18n-agent"] = {
      command: nodeEnv.nodePath,
      args: [mcpClientPath],
      cwd: packageDir,
      env: {
        MCP_SERVER_URL: "https://mcp.i18nagent.ai",
        I18N_AGENT_API_KEY: existingApiKey || ""
      },
      disabled: false
    };
  } else {
    const baseConfig = createMCPConfig();
    config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];
    if (existingApiKey) {
      config.mcpServers["i18n-agent"].env.I18N_AGENT_API_KEY = existingApiKey;
    }
  }

  // Write config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return { config, hasApiKey };
}
async function main() {
  try {
    console.log('🔍 Detecting available AI IDEs...\n');

    const availableIDEs = await detectAvailableIDEs();

    if (availableIDEs.length === 0) {
      console.log(`❌ No supported AI IDEs detected.

Supported IDEs:
- Claude Desktop (macOS)
- Claude Code CLI
- Cursor
- VS Code (with MCP extension)
- Codex (OpenAI)
- Antigravity (Google)

Manual setup:
1. Create the configuration file for your IDE
2. Add the i18n-agent MCP server configuration
3. Set your I18N_AGENT_API_KEY environment variable

For manual setup instructions, visit: https://docs.i18nagent.ai/setup
`);
      process.exit(1);
    }

    console.log('✅ Available AI IDEs:');
    availableIDEs.forEach((ide, index) => {
      console.log(`${index + 1}. ${ide.name}`);
    });
    console.log('');

    // Check if native CLIs are available (needed for API key detection)
    const codexCLIAvailable = isCodexCLIAvailable();
    const claudeCodeCLIAvailable = isClaudeCodeCLIAvailable();

    // Check for existing API keys BEFORE installation
    const { withKeys, withoutKeys } = await checkExistingApiKeys(availableIDEs, claudeCodeCLIAvailable, codexCLIAvailable);

    // Find a shared API key from any IDE that has one - will be applied to all IDEs
    const sharedApiKey = findAnyExistingApiKey(availableIDEs, claudeCodeCLIAvailable, codexCLIAvailable);

    if (withKeys.length > 0 && withoutKeys.length === 0) {
      console.log(`✅ API Keys Already Configured:`);
      withKeys.forEach(ide => {
        console.log(`   - ${ide.name}`);
      });
      console.log(`\n💚 Your API keys are preserved. Updating MCP client files only...\n`);
    } else if (withKeys.length > 0 && withoutKeys.length > 0) {
      // Mixed case: some have keys, some don't - we'll share the key!
      console.log(`✅ API Keys Already Configured:`);
      withKeys.forEach(ide => {
        console.log(`   - ${ide.name}`);
      });
      if (sharedApiKey) {
        console.log(`\n🔄 Will apply existing API key to:`);
        withoutKeys.forEach(ide => {
          console.log(`   - ${ide.name}`);
        });
        console.log(`\n💚 API key will be shared across all IDEs.\n`);
      } else {
        console.log(`\n🔑 API Key Setup Required:`);
        withoutKeys.forEach(ide => {
          console.log(`   - ${ide.name}`);
        });
        console.log(`\n💡 Get your API key at: https://app.i18nagent.ai\n`);
      }
    } else if (withoutKeys.length > 0) {
      console.log(`🔑 API Key Setup Required:`);
      withoutKeys.forEach(ide => {
        console.log(`   - ${ide.name}`);
      });
      console.log(`\n💡 Get your API key at: https://app.i18nagent.ai\n`);
    }

    // Now copy MCP client to stable location
    console.log('📦 Installing MCP client files...');
    copyMcpClientToStableLocation();
    console.log('');

    console.log('📝 Updating configurations...\n');

    let installCount = 0;
    const installedIDEs = [];
    const idesWithApiKey = [];
    const idesNeedingApiKey = [];

    // Show native CLI detection message (CLIs already detected above)
    if (codexCLIAvailable || claudeCodeCLIAvailable) {
      console.log('🔧 Native CLI support detected:');
      if (claudeCodeCLIAvailable) {
        console.log('   - Claude Code CLI (`claude mcp add`)');
      }
      if (codexCLIAvailable) {
        console.log('   - Codex CLI (`codex mcp add`)');
      }
      console.log('');
    }

    for (const ide of availableIDEs) {
      try {
        console.log(`⚙️  Configuring ${ide.name}...`);

        let result;

        // Special handling for Claude Code CLI - use native CLI if available
        if (ide.key === 'claude-code' && claudeCodeCLIAvailable) {
          // Get existing API key - check CLI registration first, then config file, then use shared key
          let existingApiKey = getClaudeCodeExistingApiKey('i18n-agent');
          if (!existingApiKey && fs.existsSync(ide.configPath)) {
            try {
              const content = fs.readFileSync(ide.configPath, 'utf8');
              const config = JSON.parse(content);
              existingApiKey = config.mcpServers?.["i18n-agent"]?.env?.I18N_AGENT_API_KEY || '';
            } catch {
              // Ignore parse errors
            }
          }
          // Use shared API key if no IDE-specific key found
          if (!existingApiKey && sharedApiKey) {
            existingApiKey = sharedApiKey;
            console.log('   🔄 Using shared API key from another IDE');
          }

          try {
            installViaClaudeCodeCLI(existingApiKey);
            console.log(`✅ ${ide.name} configured via native CLI!`);
            console.log(`   Run 'claude mcp list' to verify\n`);
            installCount++;
            installedIDEs.push(ide);

            // Track API key status
            if (existingApiKey) {
              idesWithApiKey.push(ide);
            } else {
              idesNeedingApiKey.push(ide);
            }
            continue;
          } catch (cliError) {
            console.log(`   ⚠️  Native CLI failed, falling back to config file...`);
            // Fall through to config file method
          }
        }

        // Special handling for Codex - use native CLI if available
        if (ide.key === 'codex' && codexCLIAvailable) {
          // Get existing API key - check CLI registration first, then config file, then use shared key
          let existingApiKey = getCodexExistingApiKey('i18n-agent');
          if (!existingApiKey && fs.existsSync(ide.configPath)) {
            try {
              const content = fs.readFileSync(ide.configPath, 'utf8');
              const config = JSON.parse(content);
              existingApiKey = config.mcpServers?.["i18n-agent"]?.env?.I18N_AGENT_API_KEY || '';
            } catch {
              // Ignore parse errors
            }
          }
          // Use shared API key if no IDE-specific key found
          if (!existingApiKey && sharedApiKey) {
            existingApiKey = sharedApiKey;
            console.log('   🔄 Using shared API key from another IDE');
          }

          try {
            installViaCodexCLI(existingApiKey);
            console.log(`✅ ${ide.name} configured via native CLI!`);
            console.log(`   Run 'codex mcp list' to verify\n`);
            installCount++;
            installedIDEs.push(ide);

            // Track API key status
            if (existingApiKey) {
              idesWithApiKey.push(ide);
            } else {
              idesNeedingApiKey.push(ide);
            }
            continue;
          } catch (cliError) {
            console.log(`   ⚠️  Native CLI failed, falling back to config file...`);
            // Fall through to config file method
          }
        }

        if (ide.key === 'claude' || ide.key === 'claude-code') {
          result = updateClaudeConfig(ide.configPath, ide.key, sharedApiKey);
        } else {
          result = updateGenericMCPConfig(ide.configPath, sharedApiKey);
        }

        console.log(`✅ ${ide.name} configured successfully!`);
        console.log(`   Config: ${ide.displayPath}\n`);
        installCount++;
        installedIDEs.push(ide);

        // Track API key status
        if (result && result.hasApiKey) {
          idesWithApiKey.push(ide);
        } else {
          idesNeedingApiKey.push(ide);
        }

      } catch (error) {
        console.error(`❌ Failed to configure ${ide.name}: ${error.message}\n`);
      }
    }

    if (installCount > 0) {
      console.log(`🎉 Installation complete! Configured ${installCount} IDE(s).\n`);

      // Show API key status
      if (idesWithApiKey.length > 0) {
        console.log(`✅ API Key Already Configured:`);
        idesWithApiKey.forEach(ide => {
          console.log(`   - ${ide.name}`);
        });
        console.log('');
      }

      if (idesNeedingApiKey.length > 0) {
        console.log(`⚠️  API Key Required For:`);
        idesNeedingApiKey.forEach(ide => {
          console.log(`   - ${ide.name} (${ide.displayPath})`);
        });
        console.log('');

        // Check if CLIs need API key
        const codexNeedsKey = idesNeedingApiKey.some(ide => ide.key === 'codex');
        const claudeCodeNeedsKey = idesNeedingApiKey.some(ide => ide.key === 'claude-code');
        const showCodexInstructions = codexNeedsKey && codexCLIAvailable;
        const showClaudeCodeInstructions = claudeCodeNeedsKey && claudeCodeCLIAvailable;

        // Show setup instructions only for IDEs that need them
        console.log(`🔑 Setup Instructions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Get your API key
   👉 Visit: https://app.i18nagent.ai
   👉 Sign up or log in
   👉 Copy your API key (starts with "i18n_")

Step 2: Add API key to your IDE`);

        if (showClaudeCodeInstructions) {
          console.log(`
   For Claude Code CLI (recommended):
   claude mcp remove --scope user i18n-agent
   claude mcp add --transport stdio --scope user i18n-agent -e MCP_SERVER_URL=https://mcp.i18nagent.ai -e I18N_AGENT_API_KEY=your_key_here -- node ~/.claude/mcp-servers/i18n-agent/i18n-agent.js
`);
        }

        if (showCodexInstructions) {
          console.log(`
   For Codex CLI (recommended):
   codex mcp remove i18n-agent
   codex mcp add --env MCP_SERVER_URL=https://mcp.i18nagent.ai --env I18N_AGENT_API_KEY=your_key_here i18n-agent node ~/.claude/mcp-servers/i18n-agent/i18n-agent.js
`);
        }

        console.log(`   For config file method:
   Open the config file and edit the "I18N_AGENT_API_KEY" field:

   "mcpServers": {
     "i18n-agent": {
       "command": "...",
       "env": {
         "MCP_SERVER_URL": "https://mcp.i18nagent.ai",
         "I18N_AGENT_API_KEY": ""  ← Paste your API key here (between the quotes)
       }
     }
   }

   Example with actual key:
   "I18N_AGENT_API_KEY": "i18n_1234567890abcdef"

Step 3: Restart your IDE
   Close and reopen your IDE to load the new configuration
`);
      } else if (idesWithApiKey.length > 0 && idesNeedingApiKey.length === 0) {
        // All IDEs have API keys - no setup needed, just restart
        console.log(`💡 All IDEs have API keys configured. Just restart your IDE(s) to use the updated MCP client.`);
      }

      // Show test instructions (for all IDEs)
      console.log(`
🧪 Test the Installation
━━━━━━━━━━━━━━━━━━━━━━
Try these commands in your AI IDE:
✓ "Translate 'Hello world' to Spanish"
✓ "Check my translation credits"
✓ "List supported languages"

📚 Documentation: https://docs.i18nagent.ai
🐛 Issues: https://github.com/i18n-agent/mcp-client/issues
💬 Support: support@i18nagent.ai
`);
    } else {
      console.error('❌ Installation failed for all IDEs. Please check the error messages above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Installation failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line execution
// Check if this file is being run directly (not imported)
const isMainModule = process.argv[1] && (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1].includes('i18n-agent')
);

if (isMainModule) {
  main();
}

export { main, IDE_CONFIGS, createMCPConfig };
