/**
 * Namespace Auto-Detection Utility for MCP Client
 *
 * Analyzes file paths and suggests namespace names based on project structure.
 * Follows the same validation rules as the service-mcp namespace validator.
 */

/**
 * Auto-detect namespace from file path
 */
export function detectNamespaceFromPath(filePath, options = {}) {
  const { includeAlternatives = true, maxAlternatives = 3 } = options;

  if (!filePath || typeof filePath !== 'string') {
    return {
      suggestion: null,
      confidence: 0,
      source: 'none',
      reasoning: 'No file path provided',
      alternatives: []
    };
  }

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const pathSegments = normalizedPath.split('/').filter(segment => segment.length > 0);

  // Pattern detection strategies (ordered by confidence)
  const detectionStrategies = [
    detectServicePattern,
    detectGitRepoPattern,
    detectProjectFolderPattern,
    detectDirectoryPattern
  ];

  let bestResult = null;
  const allSuggestions = [];

  for (const strategy of detectionStrategies) {
    const result = strategy(pathSegments, normalizedPath);
    if (result.suggestion && isValidNamespace(result.suggestion)) {
      if (!bestResult || result.confidence > bestResult.confidence) {
        bestResult = result;
      }
      if (includeAlternatives && !allSuggestions.includes(result.suggestion)) {
        allSuggestions.push(result.suggestion);
      }
    }
  }

  if (!bestResult) {
    return {
      suggestion: null,
      confidence: 0,
      source: 'none',
      reasoning: 'Could not detect a valid namespace from the file path',
      alternatives: []
    };
  }

  // Generate alternatives
  const alternatives = includeAlternatives
    ? allSuggestions
        .filter(s => s !== bestResult.suggestion)
        .slice(0, maxAlternatives)
    : [];

  return {
    ...bestResult,
    alternatives
  };
}

/**
 * Detect service-* pattern (highest confidence)
 * Examples:
 * - /path/to/service-platform/file.json → "service-platform"
 * - /path/to/service-auth/config.yaml → "service-auth"
 */
function detectServicePattern(pathSegments) {
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    if (segment.startsWith('service-') && segment.length > 8) {
      const serviceName = segment.toLowerCase();
      return {
        suggestion: serviceName,
        confidence: 0.9,
        source: 'service-name',
        reasoning: `Detected service name "${serviceName}" in path`,
        alternatives: []
      };
    }
  }

  return { suggestion: null, confidence: 0, source: 'none', reasoning: '', alternatives: [] };
}

/**
 * Detect git repository pattern (high confidence)
 * Examples:
 * - /path/to/i18n-agent/service-platform/file.json → "service-platform"
 * - /path/to/my-project/src/file.ts → "my-project"
 */
function detectGitRepoPattern(pathSegments) {
  // Look for common project root indicators
  const projectRootIndicators = [
    'package.json', '.git', 'node_modules', 'src', 'lib', 'app',
    'components', 'pages', 'public', 'assets', 'docs', 'tests'
  ];

  // Find potential project root by looking for these indicators
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    const segment = pathSegments[i];

    // If this looks like a project folder, use it
    if (segment.includes('-') || segment.includes('_')) {
      // Check if next segments contain project indicators
      const remainingPath = pathSegments.slice(i + 1);
      const hasProjectIndicators = remainingPath.some(seg =>
        projectRootIndicators.includes(seg) ||
        seg === 'src' ||
        seg === 'lib' ||
        seg.includes('component') ||
        seg.includes('page')
      );

      if (hasProjectIndicators) {
        const suggestion = normalizeNamespace(segment);
        if (suggestion) {
          return {
            suggestion,
            confidence: 0.7,
            source: 'git-repo',
            reasoning: `Detected project root "${segment}" based on directory structure`,
            alternatives: []
          };
        }
      }
    }
  }

  return { suggestion: null, confidence: 0, source: 'none', reasoning: '', alternatives: [] };
}

/**
 * Detect project folder pattern (medium confidence)
 * Examples:
 * - /Users/user/Documents/my-awesome-project/file.js → "my-awesome-project"
 * - /workspace/client-docs/locales/en.json → "client-docs"
 */
function detectProjectFolderPattern(pathSegments) {
  // Look for segments that contain hyphens or underscores (common in project names)
  const projectLikeSegments = pathSegments.filter(segment =>
    (segment.includes('-') || segment.includes('_')) &&
    segment.length >= 3 &&
    !segment.startsWith('.') &&
    segment !== 'node_modules'
  );

  if (projectLikeSegments.length > 0) {
    // Use the last project-like segment (closest to the file)
    const lastProjectSegment = projectLikeSegments[projectLikeSegments.length - 1];
    const suggestion = normalizeNamespace(lastProjectSegment);

    if (suggestion) {
      return {
        suggestion,
        confidence: 0.5,
        source: 'project-folder',
        reasoning: `Detected project-like folder "${lastProjectSegment}" in path`,
        alternatives: []
      };
    }
  }

  return { suggestion: null, confidence: 0, source: 'none', reasoning: '', alternatives: [] };
}

/**
 * Detect directory pattern (low confidence fallback)
 * Uses the immediate parent directory if it looks reasonable
 */
function detectDirectoryPattern(pathSegments) {
  if (pathSegments.length < 2) {
    return { suggestion: null, confidence: 0, source: 'none', reasoning: '', alternatives: [] };
  }

  // Use the parent directory of the file
  const parentDir = pathSegments[pathSegments.length - 2];
  const suggestion = normalizeNamespace(parentDir);

  if (suggestion && suggestion.length >= 3) {
    return {
      suggestion,
      confidence: 0.3,
      source: 'directory-name',
      reasoning: `Using parent directory "${parentDir}" as fallback`,
      alternatives: []
    };
  }

  return { suggestion: null, confidence: 0, source: 'none', reasoning: '', alternatives: [] };
}

/**
 * Normalize a potential namespace to follow validation rules
 */
function normalizeNamespace(input) {
  if (!input || typeof input !== 'string') return null;

  // Convert to lowercase and trim
  let normalized = input.toLowerCase().trim();

  // Replace invalid characters with hyphens
  normalized = normalized.replace(/[^a-z0-9_-]/g, '-');

  // Remove multiple consecutive hyphens/underscores
  normalized = normalized.replace(/[-_]{2,}/g, '-');

  // Remove leading/trailing hyphens or underscores
  normalized = normalized.replace(/^[-_]+|[-_]+$/g, '');

  // Check length constraints
  if (normalized.length < 3 || normalized.length > 50) {
    return null;
  }

  // Check if it's a reserved keyword
  const reservedKeywords = [
    'admin', 'api', 'www', 'system', 'root', 'default',
    'translations', 'upload', 'download', 'temp', 'cache',
    'public', 'private', 'test', 'staging', 'production'
  ];

  if (reservedKeywords.includes(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Quick validation using the same rules as service-mcp
 */
function isValidNamespace(namespace) {
  if (!namespace || typeof namespace !== 'string') return false;

  // Basic validation
  const pattern = /^[a-z0-9_-]+$/;
  return (
    namespace.length >= 3 &&
    namespace.length <= 50 &&
    pattern.test(namespace) &&
    !['admin', 'api', 'www', 'system', 'root', 'default'].includes(namespace)
  );
}

/**
 * Generate additional namespace suggestions based on file context
 */
export function generateNamespaceSuggestions(fileName, fileContent) {
  const suggestions = [];

  if (fileName) {
    // Extract potential namespace from filename
    const baseName = fileName.replace(/\.(json|yaml|yml|ts|js|md)$/i, '');
    const normalized = normalizeNamespace(baseName);
    if (normalized) {
      suggestions.push(normalized);
    }

    // Look for common patterns in filename
    if (fileName.includes('i18n') || fileName.includes('locale') || fileName.includes('lang')) {
      suggestions.push('localization', 'translations', 'i18n-project');
    }

    if (fileName.includes('api') || fileName.includes('endpoint')) {
      suggestions.push('api-docs', 'api-project');
    }

    if (fileName.includes('component') || fileName.includes('ui')) {
      suggestions.push('components', 'ui-library');
    }
  }

  if (fileContent) {
    // Analyze content for clues (basic implementation)
    const content = fileContent.toLowerCase();

    if (content.includes('api') || content.includes('endpoint')) {
      suggestions.push('api-docs');
    }

    if (content.includes('component') || content.includes('react') || content.includes('vue')) {
      suggestions.push('components');
    }

    if (content.includes('translation') || content.includes('locale')) {
      suggestions.push('translations');
    }
  }

  // Remove duplicates and filter valid ones
  return [...new Set(suggestions)]
    .filter(s => isValidNamespace(s))
    .slice(0, 5);
}

/**
 * Get helpful namespace suggestions text for user guidance
 */
export function getNamespaceSuggestionText(filePath, fileName) {
  if (!filePath && !fileName) {
    return `💡 Namespace Suggestions:
• Use descriptive project names: "my-website", "mobile-app"
• Include service names: "service-auth", "api-gateway"
• Use organization prefixes: "company-docs", "team-frontend"
• Avoid generic names: "app", "project", "files"`;
  }

  const detection = detectNamespaceFromPath(filePath || fileName);

  if (detection.suggestion) {
    let text = `🎯 Auto-detected suggestion: "${detection.suggestion}"`;
    text += `\n📍 Source: ${getSourceDescription(detection.source)}`;
    text += `\n💪 Confidence: ${Math.round(detection.confidence * 100)}%`;

    if (detection.alternatives.length > 0) {
      text += `\n🔄 Alternatives: ${detection.alternatives.join(', ')}`;
    }

    return text;
  }

  return `💡 Namespace Suggestions for "${fileName || filePath}":
• Extract from path: "${getPathBasedSuggestion(filePath || fileName)}"
• Use project context: "docs", "website", "api"
• Include team/org: "frontend-team", "backend-api"
• Keep it descriptive: "user-dashboard", "admin-panel"`;
}

function getSourceDescription(source) {
  const descriptions = {
    'service-name': 'Service name pattern detected',
    'git-repo': 'Git repository structure analyzed',
    'project-folder': 'Project folder pattern found',
    'directory-name': 'Parent directory used as fallback'
  };
  return descriptions[source] || 'Unknown source';
}

function getPathBasedSuggestion(path) {
  if (!path) return 'my-project';

  const segments = path.replace(/\\/g, '/').split('/').filter(s => s.length > 0);
  for (let i = segments.length - 1; i >= 0; i--) {
    const normalized = normalizeNamespace(segments[i]);
    if (normalized) return normalized;
  }

  return 'my-project';
}