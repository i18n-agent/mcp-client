# 🌍 i18n-agent MCP Client

Professional translation service client for Claude, Cursor, VS Code, Antigravity, and other AI IDEs using the Model Context Protocol (MCP).

[![npm version](https://badge.fury.io/js/%40i18n-agent%2Fmcp-client.svg)](https://www.npmjs.com/package/@i18n-agent/mcp-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🎯 Smart Translation**: Context-aware translations with cultural adaptation
- **📁 File Translation**: Support for JSON, YAML, CSV, XML, Markdown, and more
- **⚡ Large File Support**: Async processing for files >50KB with progress tracking
- **🔄 Timeout Improvements**: Extended timeouts (5-10 min) for large translations
- **📊 Progress Tracking**: Real-time job status and completion monitoring
- **💰 Credit Tracking**: Real-time credit balance and word count estimates
- **🌐 48 Languages**: Comprehensive language support with regional variants
- **🔧 Easy Setup**: One-command installation for major AI IDEs

## 🚀 Quick Installation

```bash
npm install -g @i18n-agent/mcp-client
i18n-agent
```

**Note:** Global installation is required due to npm bin naming limitations. The installer will detect all available AI IDEs and configure them automatically.

### Claude Code Marketplace Installation

For Claude Code users, you can install directly from the marketplace:

```bash
/plugin marketplace add i18n-agent/mcp-client
/plugin install i18n-agent@i18n-agent
```

Then set your API key:

```bash
export API_KEY=your-api-key-here
```

Restart Claude Code and you're ready to go!

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
Analyze "Hello world! This is a test." for translation to Spanish
```

## 🛠 Supported AI IDEs

| IDE | Status | macOS | Windows | Linux |
|-----|--------|-------|---------|-------|
| **Claude Desktop** | ✅ Auto-configured | `~/Library/Application Support/Claude/` | `%APPDATA%\Claude\` | `~/.config/Claude/` |
| **Claude Code CLI** | ✅ Auto-configured | `~/.claude.json` | `~/.claude.json` | `~/.claude.json` |
| **Cursor** | ✅ Auto-configured | `~/.cursor/mcp_settings.json` | `~/.cursor/mcp_settings.json` | `~/.cursor/mcp_settings.json` |
| **VS Code** | ✅ Auto-configured | `~/.vscode/mcp_settings.json` | `~/.vscode/mcp_settings.json` | `~/.vscode/mcp_settings.json` |
| **Codex (OpenAI)** | ✅ Auto-configured | `~/.codex/mcp_settings.json` | `~/.codex/mcp_settings.json` | `~/.codex/mcp_settings.json` |
| **Antigravity (Google)** | ✅ Auto-configured | `~/.gemini/antigravity/mcp_config.json` | `%USERPROFILE%\.gemini\antigravity\mcp_config.json` | `~/.config/antigravity/mcp_config.json` |

**Note:** The installer automatically detects your platform and uses the correct config paths.

## 🌐 Language Support (48 Languages)
- **bg**: Bulgarian
- **ca**: Catalan
- **cs**: Czech
- **da**: Danish
- **de**: German
- **el**: Greek
- **en**: English
- **en-AU**: English (Australia)
- **en-CA**: English (Canada)
- **en-GB**: English (United Kingdom)
- **en-US**: English (United States)
- **es**: Spanish
- **es-MX**: Spanish (Mexico)
- **et**: Estonian
- **fi**: Finnish
- **fr**: French
- **fr-CA**: French (Canada)
- **hi**: Hindi
- **hr**: Croatian
- **hu**: Hungarian
- **id**: Indonesian
- **is**: Icelandic
- **it**: Italian
- **ja**: Japanese
- **ko**: Korean
- **lt**: Lithuanian
- **lv**: Latvian
- **ms**: Malay
- **nl**: Dutch
- **no**: Norwegian
- **pl**: Polish
- **pt**: Portuguese
- **pt-BR**: Portuguese (Brazil)
- **ro**: Romanian
- **ru**: Russian
- **sk**: Slovak
- **sl**: Slovenian
- **sr**: Serbian
- **sv**: Swedish
- **th**: Thai
- **tl**: Filipino
- **tr**: Turkish
- **uk**: Ukrainian
- **vi**: Vietnamese
- **zh-Hans**: Chinese (Simplified)
- **zh-Hant-HK**: Chinese (Traditional, Hong Kong)
- **zh-Hant-TW**: Chinese (Traditional, Taiwan)

## 📁 Supported File Formats

| Format | Extension | Features |
|--------|-----------|----------|
| JSON | `.json` | Preserves structure, nested objects |
| YAML | `.yaml`, `.yml` | Maintains formatting, comments |
| CSV | `.csv` | Handles quoted fields, commas |
| XML/HTML | `.xml`, `.html` | Extracts text content |
| Markdown | `.md` | Preserves formatting, skips code |
| Properties | `.properties` | Java properties key-value pairs |
| Plain Text | `.txt` | Direct translation |
| PDF | `.pdf` | Text extraction and translation |
| Word | `.docx`, `.doc` | Document translation |
| Gettext | `.po`, `.pot`, `.mo` | Localization file formats |

## 🔧 Manual Setup

If auto-installation fails, you can manually configure your IDE:

### Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "i18n-agent": {
      "command": "node",
      "args": ["/path/to/i18n-agent.js"],
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
      "args": ["/path/to/i18n-agent.js"],
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

### Quality Warnings
- **Source Analysis**: By default, source content is analyzed for quality issues before translation
- **Skip Warnings**: Use `skipWarnings: true` to bypass warnings in automated workflows
- **Trade-off**: Skipping warnings may reduce translation quality as potential issues aren't addressed
- **Best Practice**: Keep warnings enabled (default) for production translations

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
   exec node node_modules/@i18n-agent/mcp-client/i18n-agent.js
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
- `namespace` (string, optional): Optional namespace identifier for backend tracking and project organization
- `sourceLanguage` (string, optional): Source language (auto-detected if not provided)
- `region` (string, optional): Specific region for localization
- `skipWarnings` (boolean, optional): Skip source text quality warnings (default: false). ⚠️ WARNING: May hurt translation quality by bypassing source analysis. Only use when confident about content quality or in automated workflows.

### translate_file
Translate files while preserving structure and format.

**Parameters:**
- `filePath` or `fileContent` (string): File path or content to translate
- `fileType` (string): File format (json, yaml, xml, csv, txt, md, etc.)
- `targetLanguage` (string): Target language code
- `namespace` (string, **required**): Unique namespace identifier for backend tracking and project organization
- `preserveKeys` (boolean): Whether to preserve object keys/structure
- `outputFormat` (string): Output format (same, json, yaml, txt)
- `skipWarnings` (boolean, optional): Skip source text quality warnings (default: false). ⚠️ WARNING: May hurt translation quality by bypassing source analysis. Only use when confident about content quality or in automated workflows.

### analyze_content
Analyze content for translation readiness and get improvement suggestions before translation. This helps identify potential issues and optimize content before spending credits on translation.

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