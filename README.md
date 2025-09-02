# 🌍 i18n-agent MCP Client

Professional translation service client for Claude, Cursor, VS Code, and other AI IDEs using the Model Context Protocol (MCP).

[![npm version](https://badge.fury.io/js/%40i18n-agent%2Fmcp-client.svg)](https://www.npmjs.com/package/@i18n-agent/mcp-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🎯 Smart Translation**: Context-aware translations with cultural adaptation
- **📁 File Translation**: Support for JSON, YAML, CSV, XML, Markdown, and more
- **💰 Credit Tracking**: Real-time credit balance and word count estimates
- **🌐 30+ Languages**: Multi-tier language support with quality ratings
- **🔧 Easy Setup**: One-command installation for major AI IDEs

## 🚀 Quick Installation

Install via npx (recommended):

```bash
npx @i18n-agent/mcp-client install
```

Or install globally:

```bash
npm install -g @i18n-agent/mcp-client
i18n-agent-install
```

## 🔑 Setup API Key

1. **Get your API key** from [app.i18nagent.ai](https://app.i18nagent.ai)

2. **Set environment variable**:
   ```bash
   export API_KEY=your-api-key-here
   ```

3. **Make it permanent** (add to ~/.bashrc or ~/.zshrc):
   ```bash
   echo 'export API_KEY=your-api-key-here' >> ~/.zshrc
   ```

4. **Restart your AI IDE** to load the new configuration

## 🎮 Usage Examples

### Text Translation
```
Translate "Hello, how are you?" to Spanish for a casual audience
```

### File Translation
```
Translate this JSON file to French, preserving the structure
```

### Credit Check
```
Check my translation credits
```

### Language Support
```
List supported languages with quality ratings
```

## 🛠 Supported AI IDEs

| IDE | Status | Config Location |
|-----|--------|----------------|
| **Claude Desktop** | ✅ Auto-configured | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Cursor** | ✅ Auto-configured | `~/.cursor/mcp_settings.json` |
| **VS Code** | ✅ Auto-configured | `~/.vscode/mcp_settings.json` |
| **Other MCP IDEs** | 🔧 Manual setup | Varies |

## 🌐 Language Support

### Tier 1 - Excellent Quality
- **en**: English
- **fr**: French
- **de**: German
- **es**: Spanish
- **it**: Italian
- **pt**: Portuguese
- **ru**: Russian
- **ja**: Japanese
- **ko**: Korean
- **zh-CN**: Chinese (Simplified)

### Tier 2 - High Quality
- **nl**: Dutch
- **pl**: Polish
- **cs**: Czech
- **ar**: Arabic
- **he**: Hebrew
- **hi**: Hindi
- **zh-TW**: Chinese (Traditional)
- **sv**: Swedish
- **da**: Danish
- **no**: Norwegian
- **fi**: Finnish

### Tier 3 - Good Quality
- **tr**: Turkish
- **hu**: Hungarian
- **th**: Thai
- **vi**: Vietnamese
- **uk**: Ukrainian
- **bg**: Bulgarian
- **ro**: Romanian
- **hr**: Croatian
- **sk**: Slovak
- **sl**: Slovenian
- **et**: Estonian
- **lv**: Latvian
- **lt**: Lithuanian

## 📁 Supported File Formats

| Format | Extension | Features |
|--------|-----------|----------|
| JSON | `.json` | Preserves structure, nested objects |
| YAML | `.yaml`, `.yml` | Maintains formatting, comments |
| CSV | `.csv` | Handles quoted fields, commas |
| XML/HTML | `.xml`, `.html` | Extracts text content |
| Markdown | `.md` | Preserves formatting, skips code |
| Properties | `.properties` | Key-value pairs |
| Plain Text | `.txt` | Direct translation |

## 🔧 Manual Setup

If auto-installation fails, you can manually configure your IDE:

### Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "i18n-agent": {
      "command": "node",
      "args": ["/path/to/mcp-client.js"],
      "env": {
        "MCP_SERVER_URL": "https://mcp.i18nagent.ai",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor / VS Code
Create `.cursor/mcp_settings.json` or `.vscode/mcp_settings.json`:

```json
{
  "mcpServers": {
    "i18n-agent": {
      "command": "node", 
      "args": ["/path/to/mcp-client.js"],
      "env": {
        "MCP_SERVER_URL": "https://mcp.i18nagent.ai",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## 💡 Usage Tips

### Translation Context
- **Target Audience**: Specify "technical", "casual", "formal", or "general"
- **Industry Context**: Use "technology", "healthcare", "finance", "education"
- **Regional Variations**: Add regions like "Spain", "Mexico", "Brazil"

### File Translation
- **Preserve Structure**: Keeps original file format and structure
- **Output Format**: Convert between formats (JSON ↔ YAML ↔ CSV)
- **Large Files**: Automatically chunks large files for processing

### Credit Management
- **Cost**: 0.001 credits per word
- **Monitoring**: Check balance before large translations
- **Estimates**: Get word count estimates before translation

## 🚨 Troubleshooting

### Installation Issues

**Permission denied:**
```bash
sudo npm install -g @i18n-agent/mcp-client
```

**IDE not detected:**
```bash
# Check if IDE directory exists
ls ~/Library/Application\ Support/Claude/
ls ~/.cursor/
ls ~/.vscode/
```

### Runtime Issues

**API Key not found:**
```bash
echo $API_KEY  # Should show your key
export API_KEY=your-key-here
```

**Connection errors:**
- Check your internet connection
- Verify API key is valid
- Try again after a few seconds

**Translation quality:**
- Use Tier 1 languages for production
- Add context with industry/audience parameters
- Review Tier 2/3 translations manually

## 📊 Pricing

- **Pay-per-use**: 0.001 credits per word
- **No subscriptions**: Only pay for what you translate  
- **Bulk discounts**: Available for enterprise usage
- **Free tier**: New accounts get starter credits

## 🔐 Privacy & Security

- **No data storage**: Translations are processed in real-time
- **Encrypted transport**: All data sent over HTTPS
- **API key security**: Keys are stored locally, never transmitted in logs
- **GDPR compliant**: EU privacy standards

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

### Development Setup

```bash
git clone https://github.com/i18n-agent/mcp-client.git
cd mcp-client
npm install
npm test
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 FatCouple OÜ

## 🔗 Links

- **Website**: [i18nagent.ai](https://i18nagent.ai)
- **Dashboard**: [app.i18nagent.ai](https://app.i18nagent.ai)
- **Documentation**: [docs.i18nagent.ai](https://docs.i18nagent.ai)
- **GitHub**: [github.com/i18n-agent/mcp-client](https://github.com/i18n-agent/mcp-client)
- **Issues**: [github.com/i18n-agent/mcp-client/issues](https://github.com/i18n-agent/mcp-client/issues)

## 🆘 Support

- **Discord**: [Join our community](https://discord.gg/i18nagent)
- **Email**: support@i18nagent.ai
- **Documentation**: [docs.i18nagent.ai](https://docs.i18nagent.ai)

---

Made with ❤️ by [FatCouple OÜ](https://fireinbelly.com)