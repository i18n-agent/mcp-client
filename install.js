#!/usr/bin/env node

/**
 * i18n-agent MCP Client Installer
 * Installs the MCP client to work with Claude, Cursor, VS Code and other AI IDEs
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

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

// Supported IDE configurations
const claudePaths = getClaudeDesktopPath();
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

🔑 IMPORTANT: Get your API key at https://app.i18nagent.ai
   (Required for the MCP client to work)
`);

const getMcpClientPaths = () => {
  const mcpClientPath = path.resolve(__dirname, 'mcp-client.js');
  const packageDir = path.dirname(mcpClientPath);
  return { mcpClientPath, packageDir };
};

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
          API_KEY: ""
        }
      }
    }
  };
}

function detectNodeEnvironment() {
  // Check if using nvm or other version managers
  const nvmDir = process.env.NVM_DIR || path.join(os.homedir(), '.nvm');
  const nodeVersion = process.version;
  const nodePath = process.execPath;
  
  return {
    isNvm: nodePath.includes('.nvm') || nodePath.includes('nvm'),
    nodePath,
    nodeVersion
  };
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

function updateClaudeConfig(configPath) {
  let config = {};
  
  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not parse existing config at ${configPath}`);
    }
  }
  
  // Ensure mcpServers exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  
  // Detect if we need a wrapper script (for nvm users)
  const nodeEnv = detectNodeEnvironment();
  const claudeDir = path.join(os.homedir(), '.claude');
  
  if (nodeEnv.isNvm) {
    // Create wrapper script for nvm users
    console.log('   🔧 Detected nvm environment, creating wrapper script...');
    const wrapperPath = createWrapperScript(claudeDir);

    config.mcpServers["i18n-agent"] = {
      command: wrapperPath,
      env: {
        MCP_SERVER_URL: "https://mcp.i18nagent.ai",
        API_KEY: ""
      }
    };
  } else {
    // Standard configuration for system node
    const baseConfig = createMCPConfig();
    config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];
  }
  
  // Write updated config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  return config;
}

function updateGenericMCPConfig(configPath) {
  let config = {};

  if (fs.existsSync(configPath)) {
    try {
      const existing = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(existing);
    } catch (error) {
      console.warn(`Warning: Could not parse existing config at ${configPath}`);
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const baseConfig = createMCPConfig();
  config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];

  // Write config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return config;
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

Manual setup:
1. Create the configuration file for your IDE
2. Add the i18n-agent MCP server configuration
3. Set your API_KEY environment variable

For manual setup instructions, visit: https://docs.i18nagent.ai/setup
`);
      process.exit(1);
    }
    
    console.log('✅ Available AI IDEs:');
    availableIDEs.forEach((ide, index) => {
      console.log(`${index + 1}. ${ide.name}`);
    });
    
    console.log('\n📝 Installing for all available IDEs...\n');

    let installCount = 0;
    const installedIDEs = [];

    for (const ide of availableIDEs) {
      try {
        console.log(`⚙️  Configuring ${ide.name}...`);

        if (ide.key === 'claude' || ide.key === 'claude-code') {
          updateClaudeConfig(ide.configPath);
        } else {
          updateGenericMCPConfig(ide.configPath);
        }

        console.log(`✅ ${ide.name} configured successfully!`);
        console.log(`   Config: ${ide.displayPath}\n`);
        installCount++;
        installedIDEs.push(ide);

      } catch (error) {
        console.error(`❌ Failed to configure ${ide.name}: ${error.message}\n`);
      }
    }

    if (installCount > 0) {
      // Show config file paths for ONLY installed IDEs
      const configPaths = installedIDEs.map(ide => `   - ${ide.name}: ${ide.displayPath}`).join('\n');

      // Platform-specific environment variable instructions
      const isWindows = process.platform === 'win32';
      const envVarInstructions = isWindows
        ? `   Windows PowerShell:
   $env:API_KEY="your-api-key-here"

   Or set permanently via System Environment Variables:
   1. Search "Environment Variables" in Windows
   2. Click "New" under User variables
   3. Variable name: API_KEY
   4. Variable value: your-api-key-here`
        : `   macOS/Linux:
   export API_KEY=your-api-key-here

   Add to shell profile for persistence (~/.bashrc, ~/.zshrc):
   echo 'export API_KEY=your-api-key-here' >> ~/.zshrc`;

      console.log(`🎉 Installation complete! Configured ${installCount} IDE(s).

🔑 NEXT STEP: Add your API key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Get your API key from: https://app.i18nagent.ai

2. Add it to your config file(s):
${configPaths}

   Open the file and add your API key to the "env" section:
   "env": {
     "MCP_SERVER_URL": "https://mcp.i18nagent.ai",
     "API_KEY": "your-api-key-here"  ← Add your key here
   }

   OR set as environment variable:
${envVarInstructions}

3. Restart your IDE to load the configuration

🧪 Test the installation
Try these commands in your AI IDE:
- "Translate 'Hello world' to Spanish"
- "Check my translation credits"
- "List supported languages"

📚 Documentation: https://docs.i18nagent.ai
🐛 Issues: https://github.com/i18n-agent/mcp-client/issues
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
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, IDE_CONFIGS, createMCPConfig };
