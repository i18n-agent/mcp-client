# 🌍 i18n-agent MCP Client

Professional translation service client for Claude, Cursor, VS Code, and other AI IDEs using the Model Context Protocol (MCP).

[![npm version](https://badge.fury.io/js/%40i18n-agent%2Fmcp-client.svg)](https://www.npmjs.com/package/@i18n-agent/mcp-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🎯 Smart Translation**: Context-aware translations with cultural adaptation
- **📁 File Translation**: Support for JSON, YAML, CSV, XML, Markdown, and more
- **⚡ Large File Support**: Async processing for files >50KB with progress tracking
- **🔄 Timeout Improvements**: Extended timeouts (5-10 min) for large translations
- **📊 Progress Tracking**: Real-time job status and completion monitoring
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

### Content Analysis
```
Analyze content for translation readiness and get improvement suggestions
```

## 🛠 Supported AI IDEs

| IDE | Status | Config Location |
|-----|--------|----------------|
| **Claude Desktop** | ✅ Auto-configured | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Cursor** | ✅ Auto-configured | `~/.cursor/mcp_settings.json` |
| **VS Code** | ✅ Auto-configured | `~/.vscode/mcp_settings.json` |
| **Other MCP IDEs** | 🔧 Manual setup | Varies |

## 🌐 Language Support
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
- **Async Processing**: Files >50KB processed asynchronously with job tracking
- **Progress Monitoring**: Real-time status updates for long-running translations
- **Timeout Resilience**: Up to 10 minutes for large translation jobs

### Large Translation Handling
- **Async Processing**: >100 texts or >50KB files processed asynchronously
- **Job Tracking**: Unique job IDs for monitoring long-running translations
- **Progress Updates**: Real-time completion percentages and status
- **Extended Timeouts**: 5-10 minute timeouts prevent interruptions
- **Automatic Polling**: Client automatically polls for job completion

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

### MCP Connection Issues

**"Failed" status in Claude Code:**

This usually happens with Node Version Managers (nvm, fnm, n). The installer now automatically detects nvm and creates a wrapper script. If you still have issues:

1. **Check your Node installation:**
   ```bash
   which node
   # If output contains .nvm, you're using nvm
   ```

2. **Manual wrapper script (if auto-detection fails):**
   Create `~/.claude/run-mcp.sh`:
   ```bash
   #!/bin/bash
   export PATH="$(dirname $(which node)):$PATH"
   cd ~/.claude
   exec node node_modules/@i18n-agent/mcp-client/mcp-client.js
   ```
   
   Make it executable:
   ```bash
   chmod +x ~/.claude/run-mcp.sh
   ```
   
3. **Update Claude configuration:**
   Edit `~/.claude.json`:
   ```json
   {
     "mcpServers": {
       "i18n-agent": {
         "command": "/Users/YOUR_USERNAME/.claude/run-mcp.sh",
         "env": {
           "MCP_SERVER_URL": "https://mcp.i18nagent.ai",
           "API_KEY": "your-api-key"
         }
       }
     }
   }
   ```

4. **Restart Claude Code completely** (not just close window, quit the app)

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

- **Email**: support@i18nagent.ai
- **Documentation**: [docs.i18nagent.ai](https://docs.i18nagent.ai)

## 🔧 Available MCP Tools

### translate_text
Translate text content with cultural adaptation and context awareness.

**Parameters:**
- `texts` (array): Array of strings to translate
- `targetLanguage` (string): Target language code
- `targetAudience` (string): Target audience context
- `industry` (string): Industry context
- `sourceLanguage` (string, optional): Source language (auto-detected if not provided)
- `region` (string, optional): Specific region for localization

### translate_file
Translate files while preserving structure and format.

**Parameters:**
- `filePath` or `fileContent` (string): File path or content to translate
- `fileType` (string): File format (json, yaml, xml, csv, txt, md, etc.)
- `targetLanguage` (string): Target language code
- `preserveKeys` (boolean): Whether to preserve object keys/structure
- `outputFormat` (string): Output format (same, json, yaml, txt)

### analyze_content
Analyze content for translation readiness and get improvement suggestions before translation.

**Parameters:**
- `content` (string/array/object): Content to analyze
- `targetLanguage` (string): Target language for translation
- `fileType` (string, optional): File type if content is from a file
- `sourceLanguage` (string, optional): Source language (auto-detected)
- `industry` (string): Industry context
- `targetAudience` (string): Target audience
- `region` (string, optional): Specific region for localization

**Returns:**
- Source language detection with confidence score
- Content type and tone analysis
- Translation readiness score (0-100)
- Specific improvement suggestions
- Quality metrics and issues
- Warnings for potential problems
- Estimated credits required

### list_supported_languages
Get list of all supported languages with quality ratings.

**Parameters:**
- `includeQuality` (boolean): Include quality ratings (default: true)

### get_credits
Check remaining translation credits and word count estimates.

**Parameters:**
- `apiKey` (string): Your API key

### check_translation_status
Check status of async translation jobs (for large files).

**Parameters:**
- `jobId` (string): Job ID from async translation

---

Made with ❤️ by [FatCouple OÜ](https://fireinbelly.com)