/**
 * Environment Detection Module
 *
 * Detects execution environment details to configure the installer appropriately.
 *
 * IMPORTANT: This module is NEVER published to npm.
 * It's only used during development and testing.
 * The final install.js should be standalone with no external dependencies.
 */

import os from 'os';
import fs from 'fs';

/**
 * Detects which Node version manager is in use
 * @param {string} nodePath - Path to the node executable (process.execPath)
 * @returns {'nvm'|'fnm'|'volta'|'n'|'asdf'|'system'|'unknown'} - Detected version manager
 */
export function detectNodeVersionManager(nodePath) {
  if (!nodePath) {
    return 'unknown';
  }

  // Check for various version managers by path patterns
  if (nodePath.includes('/.nvm/')) {
    return 'nvm';
  }
  if (nodePath.includes('/fnm/') || nodePath.includes('\\fnm\\')) {
    return 'fnm';
  }
  if (nodePath.includes('/.volta/')) {
    return 'volta';
  }
  if (nodePath.includes('/n/versions/')) {
    return 'n';
  }
  if (nodePath.includes('/.asdf/')) {
    return 'asdf';
  }

  // System node (usually /usr/bin/node or /usr/local/bin/node)
  if (nodePath.startsWith('/usr/') || nodePath.startsWith('/usr/local/')) {
    return 'system';
  }

  // Windows system paths
  if (nodePath.includes('\\Program Files\\')) {
    return 'system';
  }

  return 'unknown';
}

/**
 * Detects the user's shell type and config file
 * @returns {{shell: string, configFile: string|null}} - Shell type and config file path (null if unknown)
 */
export function detectShellType() {
  const shell = process.env.SHELL;

  if (!shell) {
    return { shell: 'unknown', configFile: null };
  }

  // Extract shell name from path (e.g., /bin/zsh -> zsh)
  const shellName = shell.split('/').pop() || 'unknown';

  const shellConfigs = {
    'zsh': '.zshrc',
    'bash': '.bashrc',
    'fish': '.config/fish/config.fish',
    'ksh': '.kshrc',
    'tcsh': '.tcshrc',
  };

  return {
    shell: shellName,
    configFile: shellConfigs[shellName] || null,
  };
}

/**
 * Detects platform-specific quirks
 * @returns {{platform: string, arch: string, isAppleSilicon: boolean, distro?: string}}
 */
export function detectPlatformQuirks() {
  const platform = os.platform();
  const arch = os.arch();

  const result = {
    platform,
    arch,
    isAppleSilicon: platform === 'darwin' && arch === 'arm64',
  };

  // Detect Linux distro if on Linux
  if (platform === 'linux') {
    result.distro = detectLinuxDistro();
  }

  return result;
}

/**
 * Detects Linux distribution
 * @returns {string} - Distribution name or 'unknown'
 */
function detectLinuxDistro() {
  try {
    // Try to read /etc/os-release (most modern distros)
    if (fs.existsSync('/etc/os-release')) {
      const content = fs.readFileSync('/etc/os-release', 'utf-8');
      const match = content.match(/^ID=(.+)$/m);
      if (match) {
        return match[1].replace(/"/g, '').trim();
      }
    }

    // Fallback to legacy files
    if (fs.existsSync('/etc/redhat-release')) {
      return 'redhat';
    }
    if (fs.existsSync('/etc/debian_version')) {
      return 'debian';
    }
  } catch (error) {
    // Ignore errors
  }

  return 'unknown';
}

/**
 * Comprehensive environment detection
 * @returns {object} - Complete environment information
 */
export function detectEnvironment() {
  const nodePath = process.execPath;
  const nodeVersionManager = detectNodeVersionManager(nodePath);
  const { shell, configFile: shellConfigFile } = detectShellType();
  const platformInfo = detectPlatformQuirks();

  return {
    nodePath,
    nodeVersionManager,
    shell,
    shellConfigFile,
    ...platformInfo,
  };
}
