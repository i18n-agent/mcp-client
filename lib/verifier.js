/**
 * @fileoverview MCP server verification module
 * Provides protocol-level and API-level verification for MCP servers
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Verify that an MCP server can start and respond to protocol messages
 * @param {string} serverPath - Path to the MCP server executable
 * @param {Object} env - Environment variables to pass to the server
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function verifyMCPProtocol(serverPath, env = {}, timeout = 10000) {
  // Check if server file exists
  if (!fs.existsSync(serverPath)) {
    return {
      success: false,
      message: `Server file not found at: ${serverPath}`
    };
  }

  return new Promise((resolve) => {
    let processCompleted = false;
    let stderr = '';
    let stdout = '';

    // Spawn the MCP server process
    const serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      if (!processCompleted) {
        processCompleted = true;
        serverProcess.kill('SIGTERM');

        // If we got here without errors, the server started successfully
        if (stderr.trim() === '' || !stderr.includes('Error')) {
          resolve({
            success: true,
            message: 'MCP server started successfully and is responding'
          });
        } else {
          resolve({
            success: false,
            message: `Server startup failed: ${stderr.trim()}`
          });
        }
      }
    }, timeout);

    // Capture stderr for error messages
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Capture stdout for protocol messages
    serverProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Handle process errors
    serverProcess.on('error', (error) => {
      if (!processCompleted) {
        processCompleted = true;
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          message: `Failed to start server: ${error.message}`
        });
      }
    });

    // Handle early exit with error
    serverProcess.on('exit', (code, signal) => {
      if (!processCompleted && code !== 0 && code !== null) {
        processCompleted = true;
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          message: `Server exited with code ${code}: ${stderr.trim()}`
        });
      }
    });

    // Wait a short time to see if server starts without immediate errors
    setTimeout(() => {
      if (!processCompleted && stderr.includes('Error')) {
        processCompleted = true;
        clearTimeout(timeoutHandle);
        serverProcess.kill('SIGTERM');
        resolve({
          success: false,
          message: `Server startup error: ${stderr.trim()}`
        });
      }
    }, 2000);
  });
}

/**
 * Verify API connection by testing the get_credits endpoint
 * @param {string} apiKey - API key to test
 * @param {string} serverUrl - Base URL of the API server
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function verifyAPIConnection(apiKey, serverUrl) {
  // Validate input
  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      message: 'API key is required for verification'
    };
  }

  if (!serverUrl || serverUrl.trim() === '') {
    return {
      success: false,
      message: 'Server URL is required for verification'
    };
  }

  try {
    // Try to import fetch (Node 18+ has native fetch)
    let fetchImpl;
    try {
      fetchImpl = fetch;
    } catch {
      // Fallback to node-fetch if native fetch not available
      fetchImpl = require('node-fetch');
    }

    // Make request to get_credits endpoint
    const response = await fetchImpl(`${serverUrl}/mcp/get_credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ apiKey })
    });

    const data = await response.json();

    if (response.ok && data.success !== false) {
      return {
        success: true,
        message: `API connection successful. Credits: ${data.credits || 'N/A'}`
      };
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: 'Authentication failed: Invalid or unauthorized API key'
      };
    }

    // Handle other errors
    return {
      success: false,
      message: `API request failed: ${data.error || response.statusText}`
    };
  } catch (error) {
    // Handle network or other errors
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: 'Cannot connect to API server. Please check the server URL.'
      };
    }

    return {
      success: false,
      message: `API connection error: ${error.message}`
    };
  }
}

/**
 * Perform comprehensive two-level verification of MCP server
 * @param {string} serverPath - Path to the MCP server executable
 * @param {Object} env - Environment variables (should include I18N_AGENT_API_KEY)
 * @returns {Promise<{protocol: Object, api: Object, overall: boolean}>}
 */
async function verifyMCPServer(serverPath, env = {}) {
  // First, verify protocol level
  const protocolResult = await verifyMCPProtocol(serverPath, env, 10000);

  // If protocol verification fails, skip API verification
  if (!protocolResult.success) {
    return {
      protocol: protocolResult,
      api: {
        success: false,
        message: 'Skipped due to protocol verification failure'
      },
      overall: false
    };
  }

  // Extract API credentials from environment
  const apiKey = env.I18N_AGENT_API_KEY || process.env.I18N_AGENT_API_KEY;
  const serverUrl = env.I18N_AGENT_SERVER_URL || process.env.I18N_AGENT_SERVER_URL || 'https://api.i18n-agent.com';

  if (!apiKey) {
    return {
      protocol: protocolResult,
      api: {
        success: false,
        message: 'No API key found in environment (I18N_AGENT_API_KEY)'
      },
      overall: false
    };
  }

  // Verify API connection
  const apiResult = await verifyAPIConnection(apiKey, serverUrl);

  return {
    protocol: protocolResult,
    api: apiResult,
    overall: protocolResult.success && apiResult.success
  };
}

/**
 * Create a user-friendly verification report
 * @param {Object} result - Result from verifyMCPServer
 * @returns {string} Formatted report string
 */
function createVerificationReport(result) {
  const lines = [];

  lines.push('\n=== MCP Server Verification Report ===\n');

  // Protocol verification section
  lines.push('Protocol Verification:');
  if (result.protocol.success) {
    lines.push(`  ✓ ${result.protocol.message}`);
  } else {
    lines.push(`  ✗ ${result.protocol.message}`);
  }

  // API verification section
  lines.push('\nAPI Verification:');
  if (result.api.success) {
    lines.push(`  ✓ ${result.api.message}`);
  } else {
    lines.push(`  ✗ ${result.api.message}`);
  }

  // Overall status
  lines.push('\n' + '='.repeat(40));
  if (result.overall) {
    lines.push('✓ Overall Status: ALL CHECKS PASSED');
    lines.push('\nYour MCP server is ready to use!');
  } else {
    lines.push('✗ Overall Status: VERIFICATION FAILED');
    lines.push('\nTroubleshooting:');

    if (!result.protocol.success) {
      lines.push('  • Protocol verification failed. Check that:');
      lines.push('    - The server file exists and is executable');
      lines.push('    - All required dependencies are installed');
      lines.push('    - The server can start without errors');
    }

    if (!result.api.success && result.protocol.success) {
      lines.push('  • API verification failed. Check that:');
      lines.push('    - Your API key is valid and active');
      lines.push('    - The I18N_AGENT_API_KEY environment variable is set');
      lines.push('    - You have network connectivity to the API server');
      lines.push('    - Your API key has available credits');
    }

    lines.push('\nFor more help, visit: https://docs.i18n-agent.com/troubleshooting');
  }

  lines.push('='.repeat(40) + '\n');

  return lines.join('\n');
}

module.exports = {
  verifyMCPProtocol,
  verifyAPIConnection,
  verifyMCPServer,
  createVerificationReport
};
