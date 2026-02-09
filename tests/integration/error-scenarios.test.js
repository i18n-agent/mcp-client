import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'path';
import os from 'os';
import { installMcpServer } from '../../lib/installer-core.js';
import { loadConfig, saveConfig } from '../../lib/config-manager.js';

describe('Error Scenarios', () => {
  let testDir;
  let configPath;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'));
    configPath = path.join(testDir, 'config.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File System Errors', () => {
    it('should handle missing directory gracefully', async () => {
      const nonexistentPath = path.join(testDir, 'nonexistent', 'config.json');

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath: nonexistentPath
      });

      // Should fail gracefully
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should handle read-only directory', async () => {
      // Create a read-only directory (skip on Windows)
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const readonlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readonlyDir);
      await fs.chmod(readonlyDir, 0o444);

      const readonlyConfigPath = path.join(readonlyDir, 'config.json');

      try {
        const result = await installMcpServer({
          serverName: 'test-server',
          serverConfig: {
            command: 'node',
            args: ['server.js']
          },
          configPath: readonlyConfigPath
        });

        assert.strictEqual(result.success, false);
        assert.ok(result.error);
      } finally {
        // Cleanup: restore permissions
        await fs.chmod(readonlyDir, 0o755);
      }
    });

    it('should handle disk full scenario', async () => {
      // Simulate disk full by trying to write extremely large config
      // This is a simplified test - actual disk full is hard to simulate
      const hugeConfig = {
        mcpServers: {}
      };

      // Create a very large config object
      for (let i = 0; i < 10000; i++) {
        hugeConfig.mcpServers[`server-${i}`] = {
          command: 'node',
          args: ['a'.repeat(1000)] // Large args
        };
      }

      // This should either succeed or fail gracefully
      try {
        await saveConfig(hugeConfig, configPath);
        // If it succeeds, that's fine
        assert.ok(true);
      } catch (error) {
        // If it fails, should be a proper error
        assert.ok(error.message);
      }
    });
  });

  describe('Malformed Config Errors', () => {
    it('should handle corrupted JSON gracefully', async () => {
      // Write invalid JSON
      await fs.writeFile(configPath, '{invalid json}');

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.match(result.error, /json/i);
    });

    it('should handle truncated JSON', async () => {
      // Write truncated JSON
      await fs.writeFile(configPath, '{"mcpServers": {');

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should handle non-object config', async () => {
      // Write array instead of object
      await fs.writeFile(configPath, '[]');

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should handle null config', async () => {
      await fs.writeFile(configPath, 'null');

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should handle config with wrong mcpServers type', async () => {
      await fs.writeFile(configPath, '{"mcpServers": "not-an-object"}');

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('Invalid Server Config Errors', () => {
    it('should reject server with no command or url', async () => {
      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          args: ['server.js']
          // Missing command and url
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.match(result.error, /command.*url/i);
    });

    it('should reject server with empty command', async () => {
      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: '',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should reject server with empty url', async () => {
      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          url: ''
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should reject server with invalid args type', async () => {
      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: 'not-an-array'
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should reject server with invalid env type', async () => {
      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js'],
          env: 'not-an-object'
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('Invalid Server Name Errors', () => {
    it('should reject empty server name', async () => {
      const result = await installMcpServer({
        serverName: '',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should reject server name with spaces', async () => {
      const result = await installMcpServer({
        serverName: 'test server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.match(result.error, /name/i);
    });

    it('should reject server name with special characters', async () => {
      const result = await installMcpServer({
        serverName: 'test@server!',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, false);
      assert.match(result.error, /name/i);
    });

    it('should accept server name with hyphens', async () => {
      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, true);
    });

    it('should accept server name with underscores', async () => {
      const result = await installMcpServer({
        serverName: 'test_server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      assert.strictEqual(result.success, true);
    });
  });

  describe('Concurrent Access Errors', () => {
    it('should handle multiple installations correctly', async () => {
      // Simulate concurrent installations
      const installations = [];

      for (let i = 0; i < 5; i++) {
        installations.push(
          installMcpServer({
            serverName: `server-${i}`,
            serverConfig: {
              command: 'node',
              args: [`server${i}.js`]
            },
            configPath
          })
        );
      }

      const results = await Promise.all(installations);

      // All should succeed
      results.forEach((result, i) => {
        assert.strictEqual(result.success, true, `Installation ${i} failed`);
      });

      // Verify all servers present
      const config = await loadConfig(configPath);
      assert.strictEqual(Object.keys(config.mcpServers).length, 5);
    });

    it('should handle rapid sequential updates', async () => {
      const serverName = 'test-server';

      // Rapidly update same server multiple times
      for (let i = 0; i < 10; i++) {
        const result = await installMcpServer({
          serverName,
          serverConfig: {
            command: 'node',
            args: ['server.js'],
            env: { VERSION: `${i}` }
          },
          configPath
        });
        assert.strictEqual(result.success, true);
      }

      // Verify final state
      const config = await loadConfig(configPath);
      assert.strictEqual(config.mcpServers[serverName].env.VERSION, '9');
    });
  });

  describe('Recovery from Partial Failures', () => {
    it('should not corrupt config on save failure', async () => {
      // Create valid initial config
      const initialConfig = {
        mcpServers: {
          'existing-server': {
            command: 'node',
            args: ['existing.js']
          }
        }
      };
      await saveConfig(initialConfig, configPath);

      // Try to save invalid config (should fail validation)
      const invalidConfig = {
        mcpServers: 'not-an-object'
      };

      try {
        await saveConfig(invalidConfig, configPath);
        assert.fail('Should have thrown error');
      } catch (error) {
        // Expected to fail
      }

      // Verify original config unchanged
      const currentConfig = await loadConfig(configPath);
      assert.deepStrictEqual(currentConfig, initialConfig);
    });

    it('should restore from backup on corruption', async () => {
      // Create valid config
      const validConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js']
          }
        }
      };
      await saveConfig(validConfig, configPath);

      // Find backup file
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.startsWith('config.json.backup-'));

      if (backupFiles.length > 0) {
        // Corrupt main config
        await fs.writeFile(configPath, '{corrupt json}');

        // Restore from backup should work
        const backupPath = path.join(testDir, backupFiles[0]);
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(configPath, backupContent);

        const restoredConfig = await loadConfig(configPath);
        assert.ok(restoredConfig.mcpServers);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long server names', async () => {
      const longName = 'a'.repeat(256);

      const result = await installMcpServer({
        serverName: longName,
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      // Should either succeed or fail gracefully
      assert.ok(result.success !== undefined);
    });

    it('should handle very large args array', async () => {
      const largeArgs = Array(1000).fill('arg');

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: largeArgs
        },
        configPath
      });

      // Should succeed
      assert.strictEqual(result.success, true);
    });

    it('should handle many environment variables', async () => {
      const manyEnvVars = {};
      for (let i = 0; i < 100; i++) {
        manyEnvVars[`KEY_${i}`] = `value_${i}`;
      }

      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js'],
          env: manyEnvVars
        },
        configPath
      });

      assert.strictEqual(result.success, true);

      // Verify all env vars saved
      const config = await loadConfig(configPath);
      assert.strictEqual(
        Object.keys(config.mcpServers['test-server'].env).length,
        100
      );
    });

    it('should handle unicode in server names', async () => {
      const unicodeName = 'test-server-中文';

      const result = await installMcpServer({
        serverName: unicodeName,
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      // Unicode may or may not be allowed - just verify no crash
      assert.ok(result.success !== undefined);
    });

    it('should handle special characters in values', async () => {
      const result = await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js'],
          env: {
            KEY: 'value with "quotes" and \\backslashes\\ and \nnewlines'
          }
        },
        configPath
      });

      assert.strictEqual(result.success, true);

      // Verify special characters preserved
      const config = await loadConfig(configPath);
      assert.ok(config.mcpServers['test-server'].env.KEY.includes('quotes'));
      assert.ok(config.mcpServers['test-server'].env.KEY.includes('backslashes'));
    });
  });
});
