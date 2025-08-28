# i18n-agent MCP Client

Easy installation and setup of i18n-agent MCP client for AI development environments.

## Quick Installation

### Claude Code
```bash
npx i18n-agent-mcp-client install --claude-code
```

### Gemini IDE
```bash
npx i18n-agent-mcp-client install --gemini
```

### Cursor
```bash
npx i18n-agent-mcp-client install --cursor
```

### Interactive Installation
```bash
npx i18n-agent-mcp-client install
```

## What You Get

After installation, your AI development environment will have access to:

- **translate_text** - Translate text with cultural context and industry-specific terminology
- **translate_file** - Translate entire files while preserving structure (JSON, YAML, CSV, XML, Markdown, etc.)
- **list_supported_languages** - View available language pairs with quality ratings

## Usage Examples

Once installed, you can use these commands directly in your AI assistant:

```
"Translate this text to Spanish: Hello, how are you today?"
"Translate my en.json file to French"
"What languages are supported for translation?"
```

## Configuration

### API Key Setup

The installer provides **three easy ways** to handle your API key:

#### Option 1: Let the installer guide you (Recommended)
```bash
npx i18n-agent-mcp-client install --claude-code
```
The installer will:
- Show you where to get your API key
- Offer to open your browser automatically 
- Walk you through the setup process
- Provide a demo key option for testing

#### Option 2: Pass your API key directly
```bash
npx i18n-agent-mcp-client install --claude-code --api-key sk-your-api-key-here
```

#### Option 3: Use the demo key for quick testing
The installer offers a demo key with limited functionality - perfect for trying out the features before getting your own key.

### Getting Your API Key

1. **Visit**: [app.i18nagent.ai](https://app.i18nagent.ai)
2. **Sign up**: Create your account
3. **Get your API key**: Access your dashboard to get your key
4. **Copy your API key**: Use it with the installer

The installer can automatically open this page for you!

### Custom Server URL

For enterprise deployments:
```bash
npx i18n-agent-mcp-client install --claude-code --server-url https://your-server.com
```

## Commands

### Install
Install MCP client for your IDE:
```bash
npx i18n-agent-mcp-client install [options]
```

Options:
- `--claude-code` - Install for Claude Code CLI
- `--gemini` - Install for Gemini IDE
- `--cursor` - Install for Cursor IDE
- `--api-key <key>` - Set API key
- `--server-url <url>` - Set custom server URL

### Status
Check installation status:
```bash
npx i18n-agent-mcp-client status
```

### Uninstall
Remove MCP client configuration:
```bash
npx i18n-agent-mcp-client uninstall [options]
```

## Supported IDEs

### Claude Code ✅
Full MCP integration with native tool support.

### Gemini IDE ⚡
Extension-based integration with AI assistant capabilities.

### Cursor ⚡
VS Code extension with command palette integration.

## Features

- **🚀 One-click installation** - Get up and running in seconds
- **🌍 100+ languages** - Comprehensive language support
- **🎯 Context-aware** - Industry and region-specific translations
- **📁 File format support** - JSON, YAML, CSV, XML, Markdown, and more
- **🔒 Secure** - Enterprise-grade security and data protection
- **⚡ Fast** - Optimized for developer workflows

## Troubleshooting

### Configuration Files

The installer creates configuration files in these locations:

**Claude Code:**
- macOS: `~/Library/Application Support/claude-code/mcp_servers.json`
- Windows: `%APPDATA%\\claude-code\\mcp_servers.json`
- Linux: `~/.config/claude-code/mcp_servers.json`

**Gemini IDE:**
- macOS: `~/Library/Application Support/gemini-ide/extensions.json`
- Windows: `%APPDATA%\\gemini-ide\\extensions.json`
- Linux: `~/.config/gemini-ide/extensions.json`

**Cursor:**
- macOS: `~/Library/Application Support/Cursor/User/settings.json`
- Windows: `%APPDATA%\\Cursor\\User\\settings.json`
- Linux: `~/.config/Cursor/User/settings.json`

### Common Issues

1. **Permission denied**: Run with appropriate permissions
2. **Configuration not found**: Make sure your IDE is properly installed
3. **API errors**: Check your API key and network connection

## Development

### Building from Source

```bash
git clone https://github.com/i18n-agent/mcp-client.git
cd mcp-client
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Support

- 📖 [Documentation](https://i18nagent.ai/docs/mcp-integration)
- 🐛 [Report Issues](https://github.com/i18n-agent/mcp-client/issues)
- 💬 [Community Support](https://i18nagent.ai/community)

## License

MIT License - see [LICENSE](LICENSE) for details.