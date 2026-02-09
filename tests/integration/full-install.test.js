/**
 * Integration test for full install flow
 * Tests that all modules work together correctly
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import modules
import { detectEnvironment } from '../../lib/environment-detector.js';
import { extractExistingApiKey, preserveExistingConfig } from '../../lib/config-writer.js';
import { createInteractiveSession } from '../../lib/interactive-setup.js';

console.log('\n=== Full Install Integration Test ===\n');

// Test 1: Environment Detection
console.log('Test 1: Environment Detection');
try {
  const env = detectEnvironment();

  assert(env.nodePath, 'nodePath should be detected');
  assert(env.nodeVersionManager, 'nodeVersionManager should be detected');
  assert(env.shell, 'shell should be detected');
  assert(env.platform, 'platform should be detected');
  assert(env.arch, 'arch should be detected');

  console.log(`  ✓ Environment detected:`);
  console.log(`    - Node: ${env.nodePath}`);
  console.log(`    - Version Manager: ${env.nodeVersionManager}`);
  console.log(`    - Shell: ${env.shell}`);
  console.log(`    - Platform: ${env.platform} (${env.arch})`);

  if (env.isAppleSilicon) {
    console.log(`    - Apple Silicon detected`);
  }
} catch (error) {
  console.error(`  ✗ Environment detection failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Config Preservation
console.log('\nTest 2: Config File Preservation');
try {
  const testConfigDir = path.join(os.tmpdir(), 'i18n-test-' + Date.now());
  const testConfigPath = path.join(testConfigDir, 'test_config.json');

  // Create test directory
  fs.mkdirSync(testConfigDir, { recursive: true });

  // Create initial config with existing data
  const initialConfig = {
    mcpServers: {
      'existing-server': {
        command: 'node',
        args: ['/path/to/existing-server.js'],
        env: {
          EXISTING_KEY: 'existing_value'
        }
      },
      'i18n-agent': {
        command: 'node',
        args: ['/old/path/i18n-agent.js'],
        env: {
          I18N_AGENT_API_KEY: 'old_api_key_12345'
        }
      }
    },
    otherSettings: {
      foo: 'bar'
    }
  };

  fs.writeFileSync(testConfigPath, JSON.stringify(initialConfig, null, 2));

  // Extract existing API key
  const existingKey = extractExistingApiKey(testConfigPath, 'i18n-agent');
  assert.strictEqual(existingKey, 'old_api_key_12345', 'Should extract existing API key');
  console.log(`  ✓ Extracted existing API key: ${existingKey}`);

  // Create new config while preserving other servers
  const newServerConfig = {
    command: 'node',
    args: ['/new/path/i18n-agent.js'],
    env: {
      MCP_SERVER_URL: 'https://mcp.i18nagent.ai',
      I18N_AGENT_API_KEY: existingKey // Preserve the existing key
    }
  };

  const mergedConfig = preserveExistingConfig(testConfigPath, 'i18n-agent', newServerConfig);

  // Verify preservation
  assert(mergedConfig.mcpServers['existing-server'], 'Existing server should be preserved');
  assert(mergedConfig.otherSettings, 'Other settings should be preserved');
  assert.strictEqual(mergedConfig.mcpServers['i18n-agent'].env.I18N_AGENT_API_KEY, existingKey, 'API key should be preserved');
  assert.strictEqual(mergedConfig.mcpServers['i18n-agent'].args[0], '/new/path/i18n-agent.js', 'Path should be updated');

  console.log(`  ✓ Config preservation verified:`);
  console.log(`    - Existing servers preserved: ${Object.keys(mergedConfig.mcpServers).length} total`);
  console.log(`    - API key preserved: ${mergedConfig.mcpServers['i18n-agent'].env.I18N_AGENT_API_KEY}`);
  console.log(`    - Other settings preserved: ${JSON.stringify(mergedConfig.otherSettings)}`);

  // Cleanup
  fs.rmSync(testConfigDir, { recursive: true, force: true });
} catch (error) {
  console.error(`  ✗ Config preservation failed: ${error.message}`);
  process.exit(1);
}

// Test 3: Interactive Session Creation
console.log('\nTest 3: Interactive Session Creation');
try {
  const session = createInteractiveSession();

  assert(typeof session.promptForAPIKey === 'function', 'Should have promptForAPIKey method');
  assert(typeof session.promptForVerification === 'function', 'Should have promptForVerification method');
  assert(typeof session.close === 'function', 'Should have close method');

  console.log(`  ✓ Interactive session created with methods:`);
  console.log(`    - promptForAPIKey`);
  console.log(`    - promptForVerification`);
  console.log(`    - close`);

  // Close the session immediately (don't wait for input in tests)
  session.close();
} catch (error) {
  console.error(`  ✗ Interactive session creation failed: ${error.message}`);
  process.exit(1);
}

// Test 4: Module Integration (install.js uses modules correctly)
console.log('\nTest 4: Module Integration with install.js');
try {
  // Check that install.js imports the modules
  const installPath = path.join(__dirname, '../../install.js');
  const installContent = fs.readFileSync(installPath, 'utf8');

  assert(installContent.includes("import { detectEnvironment } from './lib/environment-detector.js'"),
    'install.js should import detectEnvironment');
  assert(installContent.includes("import { extractExistingApiKey } from './lib/config-writer.js'"),
    'install.js should import extractExistingApiKey');
  assert(installContent.includes("import { createInteractiveSession } from './lib/interactive-setup.js'"),
    'install.js should import createInteractiveSession');

  // Check that detectNodeEnvironment uses detectEnvironment
  assert(installContent.includes('detectEnvironment()'),
    'detectNodeEnvironment should call detectEnvironment()');

  // Check that extractApiKeyFromConfig uses extractExistingApiKey
  assert(installContent.includes("extractExistingApiKey(configPath, 'i18n-agent')"),
    'extractApiKeyFromConfig should call extractExistingApiKey');

  console.log(`  ✓ install.js correctly integrates modules:`);
  console.log(`    - Imports detectEnvironment`);
  console.log(`    - Imports extractExistingApiKey`);
  console.log(`    - Imports createInteractiveSession`);
  console.log(`    - Uses detectEnvironment() in detectNodeEnvironment`);
  console.log(`    - Uses extractExistingApiKey() in extractApiKeyFromConfig`);
} catch (error) {
  console.error(`  ✗ Module integration check failed: ${error.message}`);
  process.exit(1);
}

// Test 5: Verify No Breaking Changes
console.log('\nTest 5: Backward Compatibility Check');
try {
  // Dynamically import install.js to check exports
  const installModule = await import('../../install.js');

  assert(typeof installModule.main === 'function', 'main function should be exported');
  assert(typeof installModule.IDE_CONFIGS === 'object', 'IDE_CONFIGS should be exported');
  assert(typeof installModule.createMCPConfig === 'function', 'createMCPConfig should be exported');

  // Check IDE_CONFIGS structure
  const ideKeys = Object.keys(installModule.IDE_CONFIGS);
  assert(ideKeys.includes('claude'), 'Should have claude IDE config');
  assert(ideKeys.includes('claude-code'), 'Should have claude-code IDE config');
  assert(ideKeys.includes('cursor'), 'Should have cursor IDE config');
  assert(ideKeys.includes('vscode'), 'Should have vscode IDE config');

  // Check createMCPConfig creates valid config
  const mcpConfig = installModule.createMCPConfig();
  assert(mcpConfig.mcpServers, 'Should have mcpServers');
  assert(mcpConfig.mcpServers['i18n-agent'], 'Should have i18n-agent server config');
  assert(mcpConfig.mcpServers['i18n-agent'].command === 'node', 'Should use node command');
  assert(Array.isArray(mcpConfig.mcpServers['i18n-agent'].args), 'Should have args array');
  assert(mcpConfig.mcpServers['i18n-agent'].env.MCP_SERVER_URL, 'Should have MCP_SERVER_URL');

  console.log(`  ✓ Backward compatibility maintained:`);
  console.log(`    - main() function exported`);
  console.log(`    - IDE_CONFIGS exported with ${ideKeys.length} IDEs`);
  console.log(`    - createMCPConfig() creates valid config`);
  console.log(`    - All existing functionality preserved`);
} catch (error) {
  console.error(`  ✗ Backward compatibility check failed: ${error.message}`);
  process.exit(1);
}

console.log('\n=== All Integration Tests Passed ===\n');
console.log('✓ Environment detection working');
console.log('✓ Config preservation working');
console.log('✓ Interactive session working');
console.log('✓ Module integration correct');
console.log('✓ Backward compatibility maintained');
console.log('\nRefactoring successful! 🎉\n');
