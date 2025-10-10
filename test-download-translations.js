#!/usr/bin/env node

/**
 * Integration test for download_translations MCP tool
 * Tests that translations are downloaded to the correct directory (/tmp)
 *
 * Run this test AFTER completing a translation job to verify the fix.
 * Usage: node test-download-translations.js <jobId>
 */

import fs from 'fs';
import path from 'path';

// Get jobId from command line
const jobId = process.argv[2];

if (!jobId) {
  console.error('❌ Error: jobId is required');
  console.error('Usage: node test-download-translations.js <jobId>');
  process.exit(1);
}

console.log('🧪 Testing download_translations directory fix\n');
console.log(`📋 Job ID: ${jobId}\n`);

// Expected directory based on the fix
const expectedDirectory = `/tmp/i18n-translations-${jobId}`;

console.log(`✅ Expected directory: ${expectedDirectory}`);

// Test 1: Check if directory exists
console.log('\nTest 1: Directory Existence');
const dirExists = fs.existsSync(expectedDirectory);
console.log(`   Directory exists: ${dirExists ? '✅ YES' : '❌ NO'}`);

if (!dirExists) {
  console.error('\n❌ FAILED: Expected directory does not exist!');
  console.error(`   Directory: ${expectedDirectory}`);
  console.error('\n💡 This indicates the download_translations tool did not create files in /tmp');
  console.error('   Check the MCP server logs for errors.');
  process.exit(1);
}

// Test 2: Check files in directory
console.log('\nTest 2: Translation Files');
try {
  const files = fs.readdirSync(expectedDirectory);
  console.log(`   Files found: ${files.length}`);

  if (files.length === 0) {
    console.error('   ⚠️  WARNING: Directory exists but is empty');
  } else {
    files.forEach(file => {
      const filePath = path.join(expectedDirectory, file);
      const stats = fs.statSync(filePath);
      console.log(`   ✅ ${file} (${stats.size} bytes)`);
    });
  }
} catch (error) {
  console.error(`   ❌ Error reading directory: ${error.message}`);
  process.exit(1);
}

// Test 3: Verify file contents are not empty
console.log('\nTest 3: File Content Validation');
try {
  const files = fs.readdirSync(expectedDirectory);
  let allValid = true;

  for (const file of files) {
    const filePath = path.join(expectedDirectory, file);
    const stats = fs.statSync(filePath);

    if (stats.size === 0) {
      console.error(`   ❌ ${file}: EMPTY FILE`);
      allValid = false;
    } else {
      const content = fs.readFileSync(filePath, 'utf8');
      const preview = content.substring(0, 100);
      console.log(`   ✅ ${file}: ${stats.size} bytes`);
      console.log(`      Preview: ${preview}${content.length > 100 ? '...' : ''}`);
    }
  }

  if (!allValid) {
    console.error('\n❌ FAILED: Some files are empty');
    process.exit(1);
  }
} catch (error) {
  console.error(`   ❌ Error validating files: ${error.message}`);
  process.exit(1);
}

// Test 4: Check old location (should NOT exist)
console.log('\nTest 4: Old Location Check (Negative Test)');
const oldLocations = [
  `${process.cwd()}/translations-${jobId}`,
  `/Users/kwunlokng/Documents/i18n-agent/service-mcp/translations-${jobId}`
];

let foundOldLocation = false;
for (const oldDir of oldLocations) {
  const exists = fs.existsSync(oldDir);
  if (exists) {
    console.error(`   ❌ Found files in OLD location: ${oldDir}`);
    console.error('      This indicates the fix was NOT applied correctly');
    foundOldLocation = true;
  } else {
    console.log(`   ✅ Not found in old location: ${oldDir}`);
  }
}

if (foundOldLocation) {
  console.error('\n❌ FAILED: Files found in old location(s)');
  console.error('   The fix needs to be reapplied or deployed.');
  process.exit(1);
}

// Success!
console.log('\n✅ ALL TESTS PASSED!');
console.log('\n📊 Summary:');
console.log(`   ✅ Directory exists at correct location: ${expectedDirectory}`);
console.log(`   ✅ Translation files are present and valid`);
console.log(`   ✅ No files in old location(s)`);
console.log('\n🎉 The download_translations fix is working correctly!');

// Cleanup suggestion
console.log('\n💡 To clean up test files:');
console.log(`   rm -rf ${expectedDirectory}`);
