#!/usr/bin/env node

/**
 * Test script for the MCP client installer
 */

import { main, IDE_CONFIGS, createMCPConfig } from './install.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🧪 Testing i18n-agent MCP Client Installer\n');

// Test 1: Configuration generation
console.log('Test 1: MCP Configuration Generation');
try {
  const config = createMCPConfig();
  console.log('✅ Configuration generated successfully');
  console.log('   Structure:', Object.keys(config));
  console.log('   MCP Servers:', Object.keys(config.mcpServers));
} catch (error) {
  console.error('❌ Configuration generation failed:', error.message);
}

// Test 2: IDE detection logic
console.log('\nTest 2: IDE Detection');
console.log('Supported IDEs:');
Object.entries(IDE_CONFIGS).forEach(([key, config]) => {
  const exists = fs.existsSync(path.dirname(config.configPath));
  console.log(`   ${config.name}: ${exists ? '✅ Available' : '❌ Not found'}`);
  console.log(`     Path: ${config.displayPath}`);
});

// Test 3: File validation
console.log('\nTest 3: File Validation');
const requiredFiles = [
  'i18n-agent.js',
  'install.js', 
  'package.json',
  'README.md',
  'LICENSE'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
});

// Test 4: Package.json validation
console.log('\nTest 4: Package Configuration');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('✅ Package.json is valid JSON');
  console.log(`   Name: ${pkg.name}`);
  console.log(`   Version: ${pkg.version}`);
  console.log(`   Author: ${pkg.author}`);
  console.log(`   License: ${pkg.license}`);
  console.log(`   Repository: ${pkg.repository?.url || 'Not set'}`);
} catch (error) {
  console.error('❌ Package.json validation failed:', error.message);
}

// Test 5: MCP client syntax check
console.log('\nTest 5: MCP Client Syntax');
try {
  // Try to import the module (syntax check)
  const { readFileSync } = fs;
  const mcpClientCode = readFileSync('i18n-agent.js', 'utf8');
  
  // Basic checks
  const hasShebang = mcpClientCode.startsWith('#!/usr/bin/env node');
  const hasApiKeyCheck = mcpClientCode.includes('if (!I18N_AGENT_API_KEY)');
  const hasGetCredits = mcpClientCode.includes('get_credits');
  const noHardcodedKeys = !mcpClientCode.includes('sk-prod-');
  
  console.log(`   Shebang: ${hasShebang ? '✅' : '❌'}`);
  console.log(`   API Key validation: ${hasApiKeyCheck ? '✅' : '❌'}`);
  console.log(`   Get credits tool: ${hasGetCredits ? '✅' : '❌'}`);
  console.log(`   No hardcoded keys: ${noHardcodedKeys ? '✅' : '❌'}`);
  
} catch (error) {
  console.error('❌ MCP client validation failed:', error.message);
}

console.log('\n🎉 Testing completed!');
console.log('\n💡 To test installation manually:');
console.log('   node install.js');
console.log('\n📦 To publish to npm:');
console.log('   npm publish --access public');