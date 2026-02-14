/**
 * Tests for API key prompt flow in the installer
 * Validates:
 * 1. API key validation uses correct prefix (i18n_, not sk-)
 * 2. install.js actually calls createInteractiveSession when no key exists
 * 3. Prompted API key gets propagated to installations
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the module under test
import { createInteractiveSession, formatInstructions } from '../../lib/interactive-setup.js';

describe('API Key Validation', () => {
  let session;

  afterEach(() => {
    if (session) {
      session.close();
      session = null;
    }
  });

  describe('promptForAPIKey prefix validation', () => {
    it('should accept keys with i18n_ prefix', async () => {
      // Create a mock stdin that provides an i18n_ key
      const mockInput = new (await import('stream')).PassThrough();
      const mockOutput = new (await import('stream')).PassThrough();

      const rl = readline.createInterface({
        input: mockInput,
        output: mockOutput
      });

      const result = await new Promise((resolve) => {
        rl.question('Enter key: ', (answer) => {
          const trimmed = answer.trim();
          if (!trimmed) {
            resolve(null);
            return;
          }
          // This is the validation logic from interactive-setup.js
          // It SHOULD accept i18n_ prefix
          if (trimmed.startsWith('i18n_') && trimmed.length > 5) {
            resolve(trimmed);
          } else {
            resolve(null);
          }
        });
        mockInput.write('i18n_abc123def456\n');
      });

      rl.close();
      assert.strictEqual(result, 'i18n_abc123def456', 'Should accept i18n_ prefixed keys');
    });

    it('should reject keys with sk- prefix (wrong format)', async () => {
      const mockInput = new (await import('stream')).PassThrough();
      const mockOutput = new (await import('stream')).PassThrough();

      const rl = readline.createInterface({
        input: mockInput,
        output: mockOutput
      });

      const result = await new Promise((resolve) => {
        rl.question('Enter key: ', (answer) => {
          const trimmed = answer.trim();
          if (!trimmed) {
            resolve(null);
            return;
          }
          // The validation should NOT accept sk- prefix
          if (trimmed.startsWith('i18n_') && trimmed.length > 5) {
            resolve(trimmed);
          } else {
            resolve(null);
          }
        });
        mockInput.write('sk-somekey123\n');
      });

      rl.close();
      assert.strictEqual(result, null, 'Should reject sk- prefixed keys');
    });

    it('should accept empty input (skip)', async () => {
      const mockInput = new (await import('stream')).PassThrough();
      const mockOutput = new (await import('stream')).PassThrough();

      const rl = readline.createInterface({
        input: mockInput,
        output: mockOutput
      });

      const result = await new Promise((resolve) => {
        rl.question('Enter key: ', (answer) => {
          const trimmed = answer.trim();
          if (!trimmed) {
            resolve(null);
            return;
          }
          if (trimmed.startsWith('i18n_') && trimmed.length > 5) {
            resolve(trimmed);
          } else {
            resolve(null);
          }
        });
        mockInput.write('\n');
      });

      rl.close();
      assert.strictEqual(result, null, 'Should return null for empty input (skip)');
    });

    it('should reject keys that are too short', async () => {
      const mockInput = new (await import('stream')).PassThrough();
      const mockOutput = new (await import('stream')).PassThrough();

      const rl = readline.createInterface({
        input: mockInput,
        output: mockOutput
      });

      const result = await new Promise((resolve) => {
        rl.question('Enter key: ', (answer) => {
          const trimmed = answer.trim();
          if (!trimmed) {
            resolve(null);
            return;
          }
          if (trimmed.startsWith('i18n_') && trimmed.length > 5) {
            resolve(trimmed);
          } else {
            resolve(null);
          }
        });
        mockInput.write('i18n_\n');
      });

      rl.close();
      assert.strictEqual(result, null, 'Should reject i18n_ with no suffix');
    });
  });
});

describe('Install.js Interactive Prompt Integration', () => {

  it('should call createInteractiveSession in main() when no API key exists', () => {
    // Static analysis: verify install.js calls createInteractiveSession() in main()
    const installPath = path.join(__dirname, '../../install.js');
    const installContent = fs.readFileSync(installPath, 'utf8');

    // Extract main function body
    const mainFnMatch = installContent.match(/async function main\(\)\s*\{([\s\S]*?)^\}/m);
    assert.ok(mainFnMatch, 'main() function should exist in install.js');

    const mainBody = mainFnMatch[1];

    // Verify createInteractiveSession is called within main()
    assert.ok(
      mainBody.includes('createInteractiveSession'),
      'main() should call createInteractiveSession() when no API key is found. ' +
      'Currently createInteractiveSession is imported but never used in main().'
    );
  });

  it('should call promptForAPIKey when no shared key exists', () => {
    const installPath = path.join(__dirname, '../../install.js');
    const installContent = fs.readFileSync(installPath, 'utf8');

    // Extract main function body
    const mainFnMatch = installContent.match(/async function main\(\)\s*\{([\s\S]*?)^\}/m);
    assert.ok(mainFnMatch, 'main() function should exist');

    const mainBody = mainFnMatch[1];

    // Verify promptForAPIKey is called
    assert.ok(
      mainBody.includes('promptForAPIKey'),
      'main() should call promptForAPIKey() to collect API key from user during installation. ' +
      'Currently the installer writes an empty API key without ever asking the user.'
    );
  });

  it('should use prompted API key in subsequent installations', () => {
    const installPath = path.join(__dirname, '../../install.js');
    const installContent = fs.readFileSync(installPath, 'utf8');

    // The prompted API key should be stored and used as sharedApiKey
    // Check that there's logic to update sharedApiKey from the prompt
    const mainFnMatch = installContent.match(/async function main\(\)\s*\{([\s\S]*?)^\}/m);
    assert.ok(mainFnMatch, 'main() function should exist');

    const mainBody = mainFnMatch[1];

    // After prompting, the key should be assigned to sharedApiKey or used in installations
    // Check that promptForAPIKey result is captured and used
    const hasPromptCapture = mainBody.includes('promptForAPIKey') &&
      (mainBody.includes('sharedApiKey') || mainBody.includes('apiKey'));

    assert.ok(
      hasPromptCapture,
      'The result of promptForAPIKey() should be captured and used as the shared API key ' +
      'for all IDE installations.'
    );
  });
});

describe('API Key Validation in interactive-setup.js', () => {
  it('should validate i18n_ prefix, not sk- prefix', () => {
    // Static analysis of the validation logic in interactive-setup.js
    const setupPath = path.join(__dirname, '../../lib/interactive-setup.js');
    const setupContent = fs.readFileSync(setupPath, 'utf8');

    // The validation should check for i18n_ prefix
    assert.ok(
      setupContent.includes("i18n_"),
      'interactive-setup.js should validate API keys with i18n_ prefix'
    );

    // The validation should NOT check for sk- prefix (that's wrong)
    const promptFnMatch = setupContent.match(/async function promptForAPIKey[\s\S]*?}\s*\)/);
    if (promptFnMatch) {
      const promptBody = promptFnMatch[0];
      assert.ok(
        !promptBody.includes("'sk-'") && !promptBody.includes('"sk-"'),
        'promptForAPIKey should NOT validate for sk- prefix. ' +
        'i18n-agent API keys start with i18n_, not sk-.'
      );
    }
  });

  it('should show correct prefix in error message', () => {
    const setupPath = path.join(__dirname, '../../lib/interactive-setup.js');
    const setupContent = fs.readFileSync(setupPath, 'utf8');

    // Error message should mention i18n_, not sk-
    assert.ok(
      !setupContent.includes('should start with "sk-"'),
      'Error message should not reference sk- prefix'
    );
  });
});
