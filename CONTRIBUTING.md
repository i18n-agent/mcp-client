# Contributing to i18n-agent MCP Client

Thank you for your interest in contributing to the i18n-agent MCP client! We welcome contributions from the community.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-client.git
   cd mcp-client
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🛠 Development Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Local Development
```bash
# Install dependencies (if any are added)
npm install

# Run tests
npm test

# Test the installer locally
node install.js

# Test MCP client syntax
node -c mcp-client.js
```

## 📝 Types of Contributions

### 🐛 Bug Reports
- Use the [GitHub Issues](https://github.com/i18n-agent/mcp-client/issues) page
- Include steps to reproduce
- Mention your OS, IDE, and Node.js version
- Include error messages and logs

### 💡 Feature Requests  
- Check existing issues first
- Describe the use case and expected behavior
- Consider backward compatibility

### 🔧 Code Contributions

#### Areas for Contribution:
- **IDE Support**: Add support for new AI IDEs
- **Installation**: Improve cross-platform compatibility
- **Error Handling**: Better error messages and recovery
- **Documentation**: Improve README, add examples
- **Testing**: Add more test cases
- **Localization**: Translate installation messages

## 🧪 Testing

Before submitting a PR, ensure:

```bash
# Run the test suite
npm test

# Test installation process
node install.js

# Check for syntax errors
node -c mcp-client.js
node -c install.js
```

### Test Coverage Areas:
- ✅ Configuration generation
- ✅ IDE detection
- ✅ File validation
- ✅ Package.json validation  
- ✅ MCP client syntax
- 🔧 Cross-platform testing needed
- 🔧 Error condition testing needed

## 📋 Coding Standards

### JavaScript Style
- Use ES6+ modules (`import`/`export`)
- Use modern JavaScript features
- Add JSDoc comments for functions
- Use descriptive variable names

### Security
- **Never commit API keys** or secrets
- Use environment variables for configuration
- Validate user input
- Handle errors gracefully

### Example Code Style:
```javascript
/**
 * Detect available AI IDEs on the system
 * @returns {Promise<Array>} List of available IDEs with config paths
 */
async function detectAvailableIDEs() {
  const available = [];
  
  for (const [key, config] of Object.entries(IDE_CONFIGS)) {
    const configDir = path.dirname(config.configPath);
    if (fs.existsSync(configDir)) {
      available.push({ key, ...config });
    }
  }
  
  return available;
}
```

## 🚦 Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, focused commits
3. **Add tests** if applicable
4. **Update documentation** if needed
5. **Run tests** and ensure they pass
6. **Create a Pull Request** with:
   - Clear title and description
   - Reference any related issues
   - Include testing steps

### PR Title Format:
- `feat: add support for WebStorm IDE`
- `fix: handle Windows path separators correctly` 
- `docs: improve installation instructions`
- `test: add cross-platform installation tests`

## 🌟 Adding IDE Support

To add support for a new AI IDE:

1. **Add IDE config** to `IDE_CONFIGS` in `install.js`:
   ```javascript
   newIDE: {
     name: 'New IDE Name',
     configPath: path.join(os.homedir(), '.newIDE/mcp_config.json'),
     displayPath: '~/.newIDE/mcp_config.json'
   }
   ```

2. **Add configuration logic** if the IDE uses a different config format

3. **Test on the target platform**

4. **Update README** with IDE support information

## 🐛 Debugging

### Common Issues:
- **Permission errors**: Check file permissions for config directories
- **Path issues**: Ensure paths work on Windows/macOS/Linux  
- **JSON parsing**: Validate config file structure
- **Node.js version**: Ensure compatibility with Node 16+

### Debug Environment Variables:
```bash
# Enable verbose logging (if implemented)
DEBUG=i18n-agent:* node install.js

# Test with different home directories
HOME=/tmp/test-home node install.js
```

## 📚 Documentation

### README Updates
- Keep installation instructions current
- Add new IDE support to the table
- Update feature lists
- Include troubleshooting for new scenarios

### Code Comments
- Document complex logic
- Explain IDE-specific quirks
- Add TODO comments for future improvements

## 🌍 Internationalization

We welcome contributions to translate the installer messages:

1. **Add language files** in `locales/` directory
2. **Use i18n library** for message formatting
3. **Test with different system locales**

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🆘 Getting Help

- **GitHub Issues**: https://github.com/i18n-agent/mcp-client/issues
- **Discord**: [Join our community](https://discord.gg/i18nagent)
- **Email**: support@i18nagent.ai

## 🎉 Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Invited to our contributors Discord channel

Thank you for helping make i18n-agent better for everyone! 🌟

---

Made with ❤️ by the i18n-agent community