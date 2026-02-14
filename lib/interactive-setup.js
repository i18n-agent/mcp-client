import readline from 'readline';

/**
 * Format installation instructions based on IDE and CLI availability
 * @param {string} ideKey - IDE identifier (e.g., 'desktop', 'vscode', 'cursor')
 * @param {string} configPath - Path to MCP config file
 * @param {boolean} hasCLI - Whether Claude CLI is available
 * @param {string|null} apiKey - Optional API key to substitute in instructions
 * @returns {string} Formatted instructions
 */
export function formatInstructions(ideKey, configPath, hasCLI, apiKey = null) {
  const placeholder = 'YOUR_API_KEY';
  const keyToUse = apiKey || placeholder;

  if (hasCLI) {
    return `
To install with Claude CLI:

  claude mcp add i18n-agent \\
    --api-key ${keyToUse} \\
    --transport http \\
    https://mcp.i18nagent.com

Then restart Claude Desktop for changes to take effect.
`;
  } else {
    return `
Claude CLI not found. To install manually:

1. Manually edit your MCP config file: ${configPath}

2. Add the i18n-agent server with your API key:

   {
     "mcpServers": {
       "i18n-agent": {
         "command": "npx",
         "args": ["-y", "@i18n-agent/mcp-client"],
         "env": {
           "I18N_AGENT_API_KEY": "${keyToUse}"
         }
       }
     }
   }

3. Restart Claude Desktop for changes to take effect.
`;
  }
}

/**
 * Create an interactive readline session for prompting the user
 * @returns {Object} Session object with prompt methods
 */
export function createInteractiveSession() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  /**
   * Prompt for API key with validation
   * @returns {Promise<string|null>} API key or null if skipped
   */
  async function promptForAPIKey() {
    return new Promise((resolve) => {
      rl.question('\nEnter your i18n-agent API key (or press Enter to skip): ', (answer) => {
        const trimmed = answer.trim();

        // Allow skip
        if (!trimmed) {
          resolve(null);
          return;
        }

        // Validate format
        if (!trimmed.startsWith('i18n_') || trimmed.length <= 5) {
          console.log('\n⚠️  Invalid API key format. API keys should start with "i18n_"');
          console.log('   Get your API key at: https://app.i18nagent.ai\n');
          console.log('Continuing without API key...\n');
          resolve(null);
          return;
        }

        resolve(trimmed);
      });
    });
  }

  /**
   * Prompt for yes/no verification
   * @param {string} question - Question to ask
   * @returns {Promise<boolean>} True if yes, false if no
   */
  async function promptForVerification(question) {
    return new Promise((resolve) => {
      rl.question(`${question} (y/n): `, (answer) => {
        const normalized = answer.trim().toLowerCase();
        resolve(normalized === 'y' || normalized === 'yes');
      });
    });
  }

  /**
   * Close the readline interface
   */
  function close() {
    rl.close();
  }

  return {
    promptForAPIKey,
    promptForVerification,
    close
  };
}
