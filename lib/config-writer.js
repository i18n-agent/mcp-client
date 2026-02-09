const fs = require('fs');
const path = require('path');

/**
 * Extract existing API key from IDE config file
 * @param {string} configPath - Path to IDE config file
 * @param {string} serverName - MCP server name
 * @returns {string|null} - Existing API key or null
 */
function extractExistingApiKey(configPath, serverName) {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    if (!config.mcpServers || !config.mcpServers[serverName]) {
      return null;
    }

    const serverConfig = config.mcpServers[serverName];
    return serverConfig.env?.I18N_AGENT_API_KEY || null;
  } catch (error) {
    // Gracefully handle errors - don't throw
    return null;
  }
}

/**
 * Merge new server config into existing IDE config
 * @param {string} configPath - Path to IDE config file
 * @param {string} serverName - MCP server name
 * @param {object} newConfig - New server configuration
 * @returns {object} - Merged configuration
 */
function preserveExistingConfig(configPath, serverName, newConfig) {
  let existingConfig = { mcpServers: {} };

  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      existingConfig = JSON.parse(configContent);
    }
  } catch (error) {
    // If can't read or parse, start with empty config
    existingConfig = { mcpServers: {} };
  }

  // Ensure mcpServers exists
  if (!existingConfig.mcpServers) {
    existingConfig.mcpServers = {};
  }

  // Add or overwrite the server config
  existingConfig.mcpServers[serverName] = newConfig;

  return existingConfig;
}

/**
 * Write IDE configuration file
 * @param {string} configPath - Path to IDE config file
 * @param {string} ideKey - IDE server key (e.g., 'i18n-agent')
 * @param {object} env - Environment variables
 * @param {string} mcpPath - Path to MCP server script
 * @param {string} sharedKey - Shared key for authentication
 */
function writeIDEConfig(configPath, ideKey, env, mcpPath, sharedKey) {
  // Build server configuration
  const serverConfig = {
    command: "node",
    args: [mcpPath],
    env: {
      ...env,
      I18N_AGENT_SHARED_KEY: sharedKey
    }
  };

  // Merge with existing config
  const mergedConfig = preserveExistingConfig(configPath, ideKey, serverConfig);

  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write config file
  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2) + '\n', 'utf8');
}

module.exports = {
  extractExistingApiKey,
  preserveExistingConfig,
  writeIDEConfig
};
