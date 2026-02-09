# MCP Client Installer - Architecture Documentation

## Overview

The i18n-agent MCP Client Installer is a bulletproof, production-ready installation system for MCP servers. It handles configuration management, validation, and verification with comprehensive error handling.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     install.js (Entry Point)                │
│                                                               │
│  - Parse CLI arguments                                       │
│  - Detect API key from env                                   │
│  - Orchestrate installation flow                             │
└────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              installer-core.js (Orchestration)               │
│                                                               │
│  - installMcpServer()      Main installation logic          │
│  - verifyInstallation()    Post-install verification        │
│  - updateExistingServer()  Handle updates                   │
└─────┬──────────┬──────────┬────────────┬────────────────────┘
      │          │          │            │
      ▼          ▼          ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ config-  │ │transport-│ │validator │ │namespace-        │
│ manager  │ │detector  │ │          │ │detector          │
│          │ │          │ │          │ │                  │
│ Load     │ │ Detect   │ │ Validate │ │ Extract project  │
│ Save     │ │ SSE vs   │ │ configs  │ │ namespace from   │
│ Backup   │ │ stdio    │ │          │ │ file structure   │
└──────────┘ └──────────┘ └──────────┘ └──────────────────┘
```

## Module Breakdown

### Layer 1: Entry Point

#### install.js
- **Role**: CLI interface and argument parsing
- **Responsibilities**:
  - Parse command-line arguments
  - Detect API key from environment
  - Display installation progress
  - Handle user prompts for API key
  - Call installer-core for actual installation

### Layer 2: Core Orchestration

#### installer-core.js
- **Role**: Installation orchestration and workflow
- **Responsibilities**:
  - Coordinate all installation steps
  - Handle installation errors gracefully
  - Verify installation success
  - Update existing servers
  - Provide detailed status messages

**Key Functions**:
```javascript
// Main installation flow
async function installMcpServer({ serverName, serverConfig, interactive = false })

// Verify installation succeeded
async function verifyInstallation(serverName, expectedConfig)

// Update existing server configuration
async function updateExistingServer(serverName, newConfig, existingConfig)
```

### Layer 3: Support Modules

#### config-manager.js
- **Role**: Configuration file operations
- **Responsibilities**:
  - Load Claude config from disk
  - Save config atomically with backups
  - Create timestamped backups
  - Validate config structure

**Safety Features**:
- Atomic writes (write to `.tmp`, then rename)
- Automatic backups before modifications
- JSON validation before save
- Graceful handling of missing files

#### transport-detector.js
- **Role**: MCP transport type detection
- **Responsibilities**:
  - Analyze server config to determine transport
  - Detect stdio transport (command-based)
  - Detect SSE transport (URL-based)
  - Extract URLs from server configs

**Detection Logic**:
```javascript
if (config.command) return 'stdio';
if (config.url) return 'sse';
if (hasUrlInArgs(config.args)) return 'sse';
return 'stdio'; // default
```

#### validator.js
- **Role**: Input validation and sanitization
- **Responsibilities**:
  - Validate JSON syntax
  - Validate server configurations
  - Validate server names
  - Ensure required fields present

**Validation Rules**:
- Server names: `[a-zA-Z0-9_-]+` only
- Stdio: requires `command` field
- SSE: requires `url` field
- No empty strings or null values

#### namespace-detector.js
- **Role**: Project namespace detection
- **Responsibilities**:
  - Extract namespace from file structure
  - Support multiple file formats (JSON, YAML, MD, etc.)
  - Provide fallback namespace
  - Cache detection results

## Data Flow

### Installation Flow

```
1. User runs: npx @i18n-agent/mcp-client install

2. install.js
   ├─> Parse CLI args
   ├─> Detect I18N_AGENT_API_KEY from env
   └─> Call installer-core.installMcpServer()

3. installer-core.js
   ├─> Load existing config (config-manager)
   ├─> Validate server config (validator)
   ├─> Detect transport type (transport-detector)
   ├─> Merge with existing config
   ├─> Create backup (config-manager)
   ├─> Save new config (config-manager)
   └─> Verify installation (read config back)

4. Success message displayed to user
```

### Configuration Structure

```json
{
  "mcpServers": {
    "i18n-agent": {
      "command": "npx",
      "args": ["-y", "@i18n-agent/mcp-client"],
      "env": {
        "I18N_AGENT_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Error Handling Strategy

### Layered Error Handling

```
Layer 1 (install.js):
  - User-friendly error messages
  - Exit codes for CLI
  - Colored output for readability

Layer 2 (installer-core.js):
  - Catch all module errors
  - Provide context (which step failed)
  - Suggest remediation steps

Layer 3 (Modules):
  - Throw specific errors
  - Include details for debugging
  - Validate all inputs
```

### Error Types

1. **Validation Errors**: Invalid config structure
2. **File System Errors**: Permission denied, disk full
3. **JSON Errors**: Malformed JSON in config
4. **Verification Errors**: Installation didn't persist

### Error Recovery

```javascript
try {
  await saveConfig(config);
} catch (error) {
  // Restore from backup
  await restoreBackup(backupPath);
  throw new Error(`Failed to save config: ${error.message}`);
}
```

## Design Principles

### 1. Fail-Safe Operations

All operations have rollback mechanisms:
- Backups before modifications
- Atomic writes for config files
- Verification after installation

### 2. Single Responsibility

Each module has one clear purpose:
- config-manager: file operations only
- validator: validation only
- transport-detector: detection only
- installer-core: orchestration only

### 3. Explicit Over Implicit

- Explicit error messages
- Explicit validation at boundaries
- No silent failures
- Clear success/failure states

### 4. Zero External Dependencies

Core modules use only Node.js built-ins:
- fs/promises
- path
- os

This ensures:
- Fast installation
- No dependency conflicts
- Maximum compatibility

### 5. Comprehensive Testing

Every module has:
- Unit tests for all functions
- Integration tests for workflows
- Error scenario tests
- Edge case coverage

## File System Layout

```
mcp-client-installer/
├── i18n-agent.js              # MCP server executable
├── install.js                  # Installation CLI
├── namespace-detector.js       # Namespace detection
├── lib/                        # Core modules
│   ├── config-manager.js
│   ├── installer-core.js
│   ├── transport-detector.js
│   ├── validator.js
│   └── README.md
├── tests/                      # Test suite
│   ├── unit/
│   │   ├── config-manager.test.js
│   │   ├── installer-core.test.js
│   │   ├── transport-detector.test.js
│   │   ├── validator.test.js
│   │   └── namespace-detector.test.js
│   └── integration/
│       ├── installation-flow.test.js
│       └── error-scenarios.test.js
├── scripts/
│   └── publish-mcp-client.sh   # Publishing script
└── docs/
    └── mcp-installer-architecture.md  # This file
```

## Testing Strategy

### Unit Tests

Test individual functions in isolation:
```javascript
describe('config-manager', () => {
  test('loadConfig creates empty config if file missing', async () => {
    const config = await loadConfig('/nonexistent/path');
    expect(config).toEqual({ mcpServers: {} });
  });
});
```

### Integration Tests

Test complete workflows:
```javascript
describe('installation flow', () => {
  test('successfully installs new server', async () => {
    const result = await installMcpServer({
      serverName: 'test-server',
      serverConfig: { command: 'node', args: ['server.js'] }
    });
    expect(result.success).toBe(true);
  });
});
```

### Error Scenario Tests

Test all failure modes:
```javascript
describe('error handling', () => {
  test('handles invalid JSON in config file', async () => {
    await fs.writeFile(configPath, '{invalid json}');
    await expect(loadConfig(configPath)).rejects.toThrow();
  });
});
```

## Security Considerations

### 1. API Key Handling

- API keys stored in environment variables
- Never logged or displayed
- Validated before use

### 2. File System Access

- Config files have restricted permissions (0600)
- Backups stored in same directory as config
- No arbitrary file writes

### 3. Input Validation

- Server names sanitized
- Paths validated
- No command injection vulnerabilities

### 4. Error Messages

- Don't leak sensitive information
- Provide enough detail for debugging
- Safe to display to users

## Performance Characteristics

### Installation Time

- Typical installation: < 1 second
- With verification: < 2 seconds
- Network independent (no remote calls during install)

### Resource Usage

- Memory: < 50MB
- Disk: < 5MB (including backups)
- CPU: Minimal (I/O bound)

### Scalability

- Handles configs with 100+ MCP servers
- Backup limit: 50 most recent
- No memory leaks in long-running processes

## Future Enhancements

### Planned Features

1. **Interactive Configuration**
   - TUI for server management
   - Edit existing servers
   - Remove servers

2. **Health Checks**
   - Test server connectivity
   - Validate API keys
   - Check server availability

3. **Migration Tools**
   - Migrate from old config formats
   - Bulk import/export servers
   - Conflict resolution UI

4. **Advanced Validation**
   - JSON Schema validation
   - Custom validation rules
   - Warning system for suboptimal configs

### Not Planned

- GUI (CLI-only by design)
- Automatic updates (user-controlled only)
- Cloud sync (local-only by design)
- Telemetry (privacy-first)

## Troubleshooting

### Common Issues

1. **"Config file not writable"**
   - Check file permissions: `chmod 600 ~/.config/claude/claude_desktop_config.json`
   - Ensure directory exists: `mkdir -p ~/.config/claude`

2. **"Installation succeeded but verification failed"**
   - Config file may be locked by another process
   - Try running installer again
   - Check config file manually

3. **"Invalid server configuration"**
   - Ensure all required fields present
   - Check for typos in field names
   - Validate JSON syntax

### Debug Mode

Enable debug output:
```bash
DEBUG=1 npx @i18n-agent/mcp-client install
```

## Contributing

When contributing to the installer:

1. **Read the Code**: Understand existing patterns
2. **Write Tests**: All new code needs tests
3. **Update Docs**: Keep this doc in sync
4. **Follow Principles**: Maintain architectural integrity
5. **Test Thoroughly**: Run full test suite before PR

See `CONTRIBUTING.md` for detailed guidelines.

## References

- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [Claude Desktop Config](https://docs.anthropic.com/claude/docs)
- [i18n-agent Documentation](https://i18nagent.ai/docs)
