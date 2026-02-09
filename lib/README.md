# MCP Client Installer - Module Architecture

This directory contains the core modules for the i18n-agent MCP client installer.

## Module Overview

```
lib/
├── config-manager.js       # Configuration file operations (load, save, backup)
├── installer-core.js       # Core installation logic and orchestration
├── transport-detector.js   # Transport type detection (SSE vs stdio)
├── validator.js           # JSON validation and structure verification
└── README.md              # This file
```

## Module Responsibilities

### config-manager.js

**Purpose**: Handles all configuration file operations with safety guarantees.

**Key Functions**:
- `loadConfig()` - Load and parse existing Claude config
- `saveConfig()` - Atomically save config with backup
- `createBackup()` - Create timestamped backup before modifications
- `validateConfigStructure()` - Ensure config has required structure

**Safety Features**:
- Atomic writes with `.tmp` + `fs.renameSync()`
- Automatic backups before modifications
- Structure validation before save
- Graceful handling of missing files

**Example**:
```javascript
import { loadConfig, saveConfig } from './config-manager.js';

const config = await loadConfig();
config.mcpServers['my-server'] = { command: 'node', args: ['server.js'] };
await saveConfig(config);
```

### installer-core.js

**Purpose**: Orchestrates the installation process for MCP servers.

**Key Functions**:
- `installMcpServer()` - Main installation entry point
- `verifyInstallation()` - Post-install verification
- `updateExistingServer()` - Handle server updates

**Installation Flow**:
1. Load existing config
2. Validate server configuration
3. Detect transport type
4. Merge with existing config
5. Create backup
6. Save new config
7. Verify installation

**Example**:
```javascript
import { installMcpServer } from './installer-core.js';

const result = await installMcpServer({
  serverName: 'i18n-agent',
  serverConfig: {
    command: 'npx',
    args: ['-y', '@i18n-agent/mcp-client'],
    env: { I18N_AGENT_API_KEY: 'key' }
  }
});

console.log(result.message);
```

### transport-detector.js

**Purpose**: Automatically detect MCP transport type from server configuration.

**Key Functions**:
- `detectTransport()` - Analyze config and determine transport
- `isStdioTransport()` - Check if config uses stdio
- `isSseTransport()` - Check if config uses SSE

**Detection Logic**:
```
1. Check for explicit "command" field → stdio
2. Check for explicit "url" field → sse
3. Analyze args for URLs → sse
4. Default → stdio
```

**Example**:
```javascript
import { detectTransport } from './transport-detector.js';

// Stdio transport
const stdio = detectTransport({
  command: 'node',
  args: ['server.js']
});
console.log(stdio); // { type: 'stdio' }

// SSE transport
const sse = detectTransport({
  url: 'http://localhost:3000/sse'
});
console.log(sse); // { type: 'sse', url: 'http://localhost:3000/sse' }
```

### validator.js

**Purpose**: Validate JSON structure and MCP server configurations.

**Key Functions**:
- `validateJson()` - Parse and validate JSON syntax
- `validateServerConfig()` - Validate MCP server configuration
- `validateConfigStructure()` - Validate entire Claude config

**Validation Rules**:
- Server name: alphanumeric + hyphens + underscores only
- Stdio: requires `command` field
- SSE: requires `url` field
- All fields: proper types and non-empty values

**Example**:
```javascript
import { validateServerConfig } from './validator.js';

try {
  validateServerConfig('my-server', {
    command: 'node',
    args: ['server.js'],
    env: { API_KEY: 'key' }
  });
  console.log('Valid!');
} catch (error) {
  console.error('Invalid:', error.message);
}
```

## Error Handling Patterns

All modules follow consistent error handling:

```javascript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  return {
    success: false,
    error: error.message,
    details: error.stack
  };
}
```

## Testing Strategy

Each module has comprehensive tests:

- **Unit tests**: Test individual functions in isolation
- **Integration tests**: Test module interactions
- **Error scenarios**: Test all failure modes
- **Edge cases**: Test boundary conditions

Run tests:
```bash
pnpm test
```

## Design Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Fail-Safe**: All operations have rollback mechanisms
3. **Validation**: Validate inputs at module boundaries
4. **Atomic Operations**: Use atomic writes for file operations
5. **Explicit Errors**: Return detailed error messages

## Dependencies

Modules are designed to minimize dependencies:

- **fs/promises**: File system operations
- **path**: Path manipulation
- **os**: Home directory detection
- No external dependencies (except test frameworks)

## Future Enhancements

Potential improvements:

1. **Schema Validation**: Use JSON Schema for config validation
2. **Transaction Log**: Log all config changes for audit
3. **Rollback Command**: Add command to undo installations
4. **Conflict Resolution**: Better handling of config conflicts
5. **Migration Tools**: Help users migrate from old formats

## Contributing

When adding new modules:

1. Follow existing naming conventions
2. Add comprehensive JSDoc comments
3. Write tests for all functions
4. Update this README
5. Ensure no external dependencies (unless justified)

## Module Dependencies

```
validator.js (no dependencies)
    ↓
config-manager.js (uses validator)
    ↓
transport-detector.js (uses validator)
    ↓
installer-core.js (uses all above)
```

This layered architecture ensures clean separation of concerns.
