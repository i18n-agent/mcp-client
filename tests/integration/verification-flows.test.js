import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'path';
import os from 'os';
import { installMcpServer, verifyInstallation } from '../../lib/installer-core.js';

describe('Verification Flows', () => {
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

  describe('Post-Installation Verification', () => {
    it('should verify successful stdio installation', async () => {
      const serverName = 'test-server';
      const serverConfig = {
        command: 'node',
        args: ['server.js'],
        env: { TEST_KEY: 'test-value' }
      };

      // Install
      const installResult = await installMcpServer({
        serverName,
        serverConfig,
        configPath
      });
      assert.strictEqual(installResult.success, true);

      // Verify
      const verifyResult = await verifyInstallation(
        serverName,
        serverConfig,
        configPath
      );
      assert.strictEqual(verifyResult.success, true);
    });

    it('should verify successful SSE installation', async () => {
      const serverName = 'sse-server';
      const serverConfig = {
        url: 'http://localhost:3000/sse',
        env: { API_KEY: 'key123' }
      };

      // Install
      const installResult = await installMcpServer({
        serverName,
        serverConfig,
        configPath
      });
      assert.strictEqual(installResult.success, true);

      // Verify
      const verifyResult = await verifyInstallation(
        serverName,
        serverConfig,
        configPath
      );
      assert.strictEqual(verifyResult.success, true);
    });

    it('should detect mismatched config in verification', async () => {
      const serverName = 'test-server';
      const serverConfig = {
        command: 'node',
        args: ['server.js']
      };

      // Install
      await installMcpServer({
        serverName,
        serverConfig,
        configPath
      });

      // Verify with different config
      const differentConfig = {
        command: 'python',
        args: ['server.py']
      };

      const verifyResult = await verifyInstallation(
        serverName,
        differentConfig,
        configPath
      );
      assert.strictEqual(verifyResult.success, false);
      assert.match(verifyResult.error, /mismatch/i);
    });

    it('should detect missing server in verification', async () => {
      const serverName = 'nonexistent-server';
      const serverConfig = {
        command: 'node',
        args: ['server.js']
      };

      const verifyResult = await verifyInstallation(
        serverName,
        serverConfig,
        configPath
      );
      assert.strictEqual(verifyResult.success, false);
      assert.match(verifyResult.error, /not found/i);
    });
  });

  describe('Update Verification', () => {
    it('should verify server update', async () => {
      const serverName = 'test-server';
      const initialConfig = {
        command: 'node',
        args: ['server.js'],
        env: { VERSION: '1.0' }
      };

      // Install initial version
      await installMcpServer({
        serverName,
        serverConfig: initialConfig,
        configPath
      });

      // Update
      const updatedConfig = {
        command: 'node',
        args: ['server.js'],
        env: { VERSION: '2.0' }
      };

      const updateResult = await installMcpServer({
        serverName,
        serverConfig: updatedConfig,
        configPath
      });
      assert.strictEqual(updateResult.success, true);

      // Verify update
      const verifyResult = await verifyInstallation(
        serverName,
        updatedConfig,
        configPath
      );
      assert.strictEqual(verifyResult.success, true);

      // Check that old config is gone
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      assert.strictEqual(config.mcpServers[serverName].env.VERSION, '2.0');
    });

    it('should verify environment variable updates', async () => {
      const serverName = 'test-server';
      const initialConfig = {
        command: 'node',
        args: ['server.js'],
        env: { KEY1: 'value1' }
      };

      await installMcpServer({
        serverName,
        serverConfig: initialConfig,
        configPath
      });

      // Update env vars
      const updatedConfig = {
        command: 'node',
        args: ['server.js'],
        env: { KEY1: 'value1', KEY2: 'value2' }
      };

      await installMcpServer({
        serverName,
        serverConfig: updatedConfig,
        configPath
      });

      // Verify both keys present
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      assert.strictEqual(config.mcpServers[serverName].env.KEY1, 'value1');
      assert.strictEqual(config.mcpServers[serverName].env.KEY2, 'value2');
    });
  });

  describe('Backup Verification', () => {
    it('should create backup before installation', async () => {
      // Create initial config
      const initialConfig = {
        mcpServers: {
          'existing-server': {
            command: 'node',
            args: ['existing.js']
          }
        }
      };
      await fs.writeFile(configPath, JSON.stringify(initialConfig, null, 2));

      // Install new server
      await installMcpServer({
        serverName: 'new-server',
        serverConfig: {
          command: 'node',
          args: ['new.js']
        },
        configPath
      });

      // Check for backup file
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.startsWith('config.json.backup-'));
      assert.strictEqual(backupFiles.length, 1);

      // Verify backup contains original config
      const backupPath = path.join(testDir, backupFiles[0]);
      const backupContent = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
      assert.deepStrictEqual(backupContent, initialConfig);
    });

    it('should maintain backup history', async () => {
      // Create initial config
      await fs.writeFile(configPath, JSON.stringify({ mcpServers: {} }, null, 2));

      // Install multiple servers to create multiple backups
      for (let i = 1; i <= 3; i++) {
        await installMcpServer({
          serverName: `server-${i}`,
          serverConfig: {
            command: 'node',
            args: [`server${i}.js`]
          },
          configPath
        });

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Check for backup files
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.startsWith('config.json.backup-'));
      assert.ok(backupFiles.length >= 3, 'Should have at least 3 backups');
    });
  });

  describe('Multi-Server Verification', () => {
    it('should verify multiple servers installed correctly', async () => {
      const servers = {
        'server-1': {
          command: 'node',
          args: ['server1.js']
        },
        'server-2': {
          url: 'http://localhost:3001/sse'
        },
        'server-3': {
          command: 'python',
          args: ['server3.py']
        }
      };

      // Install all servers
      for (const [name, config] of Object.entries(servers)) {
        const result = await installMcpServer({
          serverName: name,
          serverConfig: config,
          configPath
        });
        assert.strictEqual(result.success, true);
      }

      // Verify all servers
      for (const [name, config] of Object.entries(servers)) {
        const verifyResult = await verifyInstallation(name, config, configPath);
        assert.strictEqual(verifyResult.success, true, `Failed to verify ${name}`);
      }

      // Verify config structure
      const finalConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      assert.strictEqual(Object.keys(finalConfig.mcpServers).length, 3);
    });

    it('should verify each server is independent', async () => {
      // Install two servers
      await installMcpServer({
        serverName: 'server-1',
        serverConfig: {
          command: 'node',
          args: ['server1.js'],
          env: { KEY: 'value1' }
        },
        configPath
      });

      await installMcpServer({
        serverName: 'server-2',
        serverConfig: {
          command: 'node',
          args: ['server2.js'],
          env: { KEY: 'value2' }
        },
        configPath
      });

      // Verify each has independent config
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      assert.strictEqual(config.mcpServers['server-1'].env.KEY, 'value1');
      assert.strictEqual(config.mcpServers['server-2'].env.KEY, 'value2');
      assert.notStrictEqual(
        config.mcpServers['server-1'].args[0],
        config.mcpServers['server-2'].args[0]
      );
    });
  });

  describe('Config Integrity Verification', () => {
    it('should maintain JSON formatting after installation', async () => {
      const serverName = 'test-server';
      const serverConfig = {
        command: 'node',
        args: ['server.js']
      };

      await installMcpServer({
        serverName,
        serverConfig,
        configPath
      });

      // Read and verify JSON is valid and well-formatted
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Verify it can be stringified and re-parsed
      const reStringified = JSON.stringify(config, null, 2);
      const reParsed = JSON.parse(reStringified);
      assert.deepStrictEqual(config, reParsed);
    });

    it('should preserve existing server configurations', async () => {
      // Create config with existing server
      const existingConfig = {
        mcpServers: {
          'existing-server': {
            command: 'python',
            args: ['existing.py'],
            env: { EXISTING: 'true' }
          }
        }
      };
      await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2));

      // Install new server
      await installMcpServer({
        serverName: 'new-server',
        serverConfig: {
          command: 'node',
          args: ['new.js']
        },
        configPath
      });

      // Verify existing server untouched
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      assert.deepStrictEqual(
        config.mcpServers['existing-server'],
        existingConfig.mcpServers['existing-server']
      );
    });

    it('should preserve custom config fields', async () => {
      // Create config with custom fields
      const customConfig = {
        mcpServers: {},
        customField: 'custom-value',
        anotherField: { nested: 'data' }
      };
      await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));

      // Install server
      await installMcpServer({
        serverName: 'test-server',
        serverConfig: {
          command: 'node',
          args: ['server.js']
        },
        configPath
      });

      // Verify custom fields preserved
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      assert.strictEqual(config.customField, 'custom-value');
      assert.deepStrictEqual(config.anotherField, { nested: 'data' });
    });
  });
});
