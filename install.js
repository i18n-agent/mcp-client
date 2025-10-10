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
    configPath: path.join(os.homedir(), '.config/claude/claude_code_config.json'),
    displayPath: '~/.config/claude/claude_code_config.json'
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
  // Instead of using ephemeral npx cache, install to stable location
  const stableDir = path.join(os.homedir(), '.claude', 'mcp-servers', 'i18n-agent');
  const mcpClientPath = path.join(stableDir, 'mcp-client.js');
  const packageDir = stableDir;
  return { mcpClientPath, packageDir, sourceFile: path.resolve(__dirname, 'mcp-client.js') };
};

function copyMcpClientToStableLocation() {
  const paths = getMcpClientPaths();

  // Create stable directory
  fs.mkdirSync(paths.packageDir, { recursive: true });

  // Copy mcp-client.js to stable location
  fs.copyFileSync(paths.sourceFile, paths.mcpClientPath);

  // Copy package.json to stable location
  const packageJsonSource = path.resolve(__dirname, 'package.json');
  const packageJsonDest = path.join(paths.packageDir, 'package.json');
  fs.copyFileSync(packageJsonSource, packageJsonDest);

  // Install dependencies
  console.log(`   📦 Installing dependencies...`);
  try {
    execSync('npm install --production --silent', {
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

function updateClaudeConfig(configPath, ideKey = 'claude') {
  let config = {};
  let existingApiKey = "";

  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(content);

      // Preserve existing API key if present
      if (config.mcpServers?.["i18n-agent"]?.env?.API_KEY) {
        existingApiKey = config.mcpServers["i18n-agent"].env.API_KEY;
        console.log('   🔑 Preserving existing API key');
      }
    } catch (error) {
      console.warn(`Warning: Could not parse existing config at ${configPath}`);
    }
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
          API_KEY: existingApiKey || ""
        }
      };
    } else {
      // For system node, use 'node' with args
      const baseConfig = createMCPConfig();
      config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];
      if (existingApiKey) {
        config.mcpServers["i18n-agent"].env.API_KEY = existingApiKey;
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
          API_KEY: existingApiKey || ""
        }
      };
    } else {
      const baseConfig = createMCPConfig();
      config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];
      if (existingApiKey) {
        config.mcpServers["i18n-agent"].env.API_KEY = existingApiKey;
      }
    }
  }

  // Write updated config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return config;
}

function updateGenericMCPConfig(configPath) {
  let config = {};
  let existingApiKey = "";

  if (fs.existsSync(configPath)) {
    try {
      const existing = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(existing);

      // Preserve existing API key if present
      if (config.mcpServers?.["i18n-agent"]?.env?.API_KEY) {
        existingApiKey = config.mcpServers["i18n-agent"].env.API_KEY;
        console.log('   🔑 Preserving existing API key');
      }
    } catch (error) {
      console.warn(`Warning: Could not parse existing config at ${configPath}`);
    }
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
        API_KEY: existingApiKey || ""
      }
    };
  } else {
    const baseConfig = createMCPConfig();
    config.mcpServers["i18n-agent"] = baseConfig.mcpServers["i18n-agent"];
    if (existingApiKey) {
      config.mcpServers["i18n-agent"].env.API_KEY = existingApiKey;
    }
  }

  // Write config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return config;
}

async function main() {
  try {
    console.log('🔍 Detecting available AI IDEs...\n');

    // First, copy MCP client to stable location
    console.log('📦 Installing MCP client files...');
    copyMcpClientToStableLocation();
    console.log('');

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
          updateClaudeConfig(ide.configPath, ide.key);
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

🔑 CRITICAL: Add your API key (required for MCP client to work)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Get your API key
   👉 Visit: https://app.i18nagent.ai
   👉 Sign up or log in
   👉 Copy your API key (starts with "i18n_")

Step 2: Add API key to config file(s)
${configPaths}

   Option A - Edit config file directly (RECOMMENDED):
   ────────────────────────────────────────────
   Open the config file and find the "env" section:

   "mcpServers": {
     "i18n-agent": {
       "command": "...",
       "env": {
         "MCP_SERVER_URL": "https://mcp.i18nagent.ai",
         "API_KEY": ""  ← Paste your API key here (between the quotes)
       }
     }
   }

   Example with actual key:
   "API_KEY": "i18n_1234567890abcdef"

   Option B - Use environment variable:
   ────────────────────────────────────
${envVarInstructions}

Step 3: Restart your IDE
   Close and reopen your IDE to load the new configuration

🧪 Test the installation
━━━━━━━━━━━━━━━━━━━━━━
Try these commands in your AI IDE:
✓ "Translate 'Hello world' to Spanish"
✓ "Check my translation credits"
✓ "List supported languages"

If you get "Invalid API key" errors, double-check:
- API key is correctly pasted in the config file
- No extra spaces or quotes around the key
- Config file is saved
- IDE has been restarted

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
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, IDE_CONFIGS, createMCPConfig };
