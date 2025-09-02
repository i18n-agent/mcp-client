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

// Supported IDE configurations
const IDE_CONFIGS = {
  claude: {
    name: 'Claude Desktop',
    configPath: path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
    displayPath: '~/Library/Application Support/Claude/claude_desktop_config.json'
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
🌐 30+ language support with quality tiers
`);

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
  const mcpClientPath = path.resolve(__dirname, 'mcp-client.js');
  
  return {
    mcpServers: {
      "i18n-agent": {
        command: "node",
        args: [mcpClientPath],
        env: {
          MCP_SERVER_URL: "https://mcp.i18nagent.ai",
          API_KEY: ""
        }
      }
    }
  };
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
  
  // Add i18n-agent configuration
  const mcpClientPath = path.resolve(__dirname, 'mcp-client.js');
  config.mcpServers["i18n-agent"] = {
    command: "node",
    args: [mcpClientPath],
    env: {
      MCP_SERVER_URL: "https://mcp.i18nagent.ai",
      API_KEY: ""
    }
  };
  
  // Write updated config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  return config;
}

function updateGenericMCPConfig(configPath) {
  const config = createMCPConfig();
  
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
- Cursor
- VS Code (with MCP extension)

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
    
    for (const ide of availableIDEs) {
      try {
        console.log(`⚙️  Configuring ${ide.name}...`);
        
        if (ide.key === 'claude') {
          updateClaudeConfig(ide.configPath);
        } else {
          updateGenericMCPConfig(ide.configPath);
        }
        
        console.log(`✅ ${ide.name} configured successfully!`);
        console.log(`   Config: ${ide.displayPath}\n`);
        installCount++;
        
      } catch (error) {
        console.error(`❌ Failed to configure ${ide.name}: ${error.message}\n`);
      }
    }
    
    if (installCount > 0) {
      console.log(`🎉 Installation complete! Configured ${installCount} IDE(s).

🔑 Important: Set your API key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You need to set your API key to use the translation service:

1. Get your API key from: https://app.i18nagent.ai
2. Set it as an environment variable:

   export API_KEY=your-api-key-here

   Or add it to your shell profile (~/.bashrc, ~/.zshrc):
   echo 'export API_KEY=your-api-key-here' >> ~/.zshrc

🔄 Restart your IDE
After setting the API key, restart your AI IDE to load the new configuration.

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