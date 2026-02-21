/**
 * Integration tests: every MCP tool call must send Authorization: Bearer header
 * and must NOT include apiKey in the request body arguments.
 *
 * Strategy: spin up a lightweight Node http server that captures incoming
 * requests, start i18n-agent.js as a child process pointing at that server,
 * send MCP JSON-RPC messages (newline-delimited) over stdin, then assert on
 * what the mock server received.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_PATH = path.resolve(__dirname, '../../i18n-agent.js');
const TEST_API_KEY = 'test-api-key-12345';

// ─── Mock HTTP server ──────────────────────────────────────────────────────────

function startMockServer() {
  const captured = [];

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      captured.push({ headers: { ...req.headers }, body });

      // Minimal valid MCP success response accepted by all tool handlers
      const ok = {
        jsonrpc: '2.0', id: 1,
        result: {
          content: [{ type: 'text', text: JSON.stringify({ status: 'ok', credits: 100, downloadUrls: {} }) }]
        }
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ok));
    });
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port, captured });
    });
  });
}

function stopServer(server) {
  return new Promise(resolve => server.close(resolve));
}

// ─── Agent process helpers ─────────────────────────────────────────────────────
// The @modelcontextprotocol/sdk StdioServerTransport uses simple newline-
// delimited JSON (one message per line).

function startAgent(port) {
  return spawn('node', [AGENT_PATH], {
    env: {
      ...process.env,
      MCP_SERVER_URL: `http://127.0.0.1:${port}`,
      I18N_AGENT_API_KEY: TEST_API_KEY,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/** Write a JSON-RPC message to the agent's stdin (newline-delimited) */
function send(proc, obj) {
  proc.stdin.write(JSON.stringify(obj) + '\n');
}

/** Collect stdout lines until predicate matches, or timeout */
function waitForMsg(proc, predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      proc.stdout.removeListener('data', onData);
      reject(new Error('Timed out waiting for agent stdout response'));
    }, timeoutMs);

    const onData = chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) fragment
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (predicate(msg)) {
            clearTimeout(timer);
            proc.stdout.removeListener('data', onData);
            resolve(msg);
            return;
          }
        } catch { /* ignore parse errors on partial lines */ }
      }
    };

    proc.stdout.on('data', onData);
  });
}

/** Wait until mock server has captured at least one more request */
function waitForCapture(captured, countBefore, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (captured.length > countBefore) return resolve(captured[captured.length - 1]);
      if (Date.now() > deadline) return reject(new Error('Mock server received no request'));
      setTimeout(check, 30);
    };
    check();
  });
}

/**
 * Full MCP lifecycle for one tool call:
 *   initialize → initialized → tool call
 * Returns the HTTP request captured by the mock server.
 */
async function runToolCall(port, captured, toolName, toolArgs) {
  const agent = startAgent(port);
  agent.stderr.resume(); // prevent stderr from blocking the process

  try {
    send(agent, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '0.0.1' }
      }
    });
    await waitForMsg(agent, msg => msg.id === 1 && msg.result != null);

    send(agent, { jsonrpc: '2.0', method: 'notifications/initialized' });

    const capturedBefore = captured.length;

    send(agent, {
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: toolName, arguments: toolArgs }
    });

    return await waitForCapture(captured, capturedBefore);
  } finally {
    agent.kill();
  }
}

// ─── Shared assertions ─────────────────────────────────────────────────────────

function assertAuthHeader(req, toolName) {
  const auth = req.headers['authorization'];
  assert.ok(auth, `${toolName}: Authorization header must be present`);
  assert.equal(auth, `Bearer ${TEST_API_KEY}`,
    `${toolName}: Authorization header must be "Bearer <key>"`);
}

function assertNoApiKeyInBody(req, toolName) {
  let parsed;
  try { parsed = JSON.parse(req.body); } catch { return; }
  const args = parsed?.params?.arguments ?? {};
  assert.equal(args.apiKey, undefined,
    `${toolName}: apiKey must NOT appear in request body arguments`);
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('MCP tool calls: Authorization header required, no apiKey in body', () => {
  let server, port, captured;

  before(async () => {
    ({ server, port, captured } = await startMockServer());
  });

  after(async () => {
    await stopServer(server);
  });

  beforeEach(() => {
    captured.length = 0;
  });

  const tools = [
    {
      name: 'translate_text',
      args: { texts: ['hello'], targetLanguages: ['es'] }
    },
    {
      name: 'translate_file',
      args: { fileContent: '{"k":"v"}', fileType: 'json', targetLanguages: ['es'], namespace: 'test-ns' }
    },
    {
      name: 'analyze_content',
      args: { content: 'hello world', targetLanguage: 'es' }
    },
    {
      name: 'get_credits',
      args: {}
    },
    {
      name: 'check_translation_status',
      args: { jobId: 'fake-job-id-0000' }
    },
    {
      name: 'resume_translation',
      args: { jobId: 'fake-job-id-0000' }
    },
    {
      name: 'download_translations',
      args: { jobId: 'fake-job-id-0000' }
    },
    {
      name: 'list_supported_languages',
      args: {}
    },
  ];

  for (const { name, args } of tools) {
    it(`${name}: sends Authorization Bearer header`, async () => {
      const req = await runToolCall(port, captured, name, args);
      assertAuthHeader(req, name);
    });

    it(`${name}: does not leak apiKey into request body`, async () => {
      const req = await runToolCall(port, captured, name, args);
      assertNoApiKeyInBody(req, name);
    });
  }
});
