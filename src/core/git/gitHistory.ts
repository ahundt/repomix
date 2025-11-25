import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

/**
 * Commit metadata with full information
 */
export interface CommitMetadata {
  hash: string;
  abbreviatedHash: string;
  parents: string[];
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
  body: string;
  files: string[];
}

/**
 * Commit graph with topology information
 */
export interface CommitGraph {
  commits: CommitMetadata[];
  graph: string; // ASCII art graph
  mermaidGraph: string; // Mermaid diagram
  mergeCommits: string[];
  tags: Record<string, string>; // tag name -> commit hash
}

/**
 * Commit quality analysis
 */
export interface CommitAnalysis {
  isAiGenerated: boolean;
  confidence: number; // 0-100
  indicators: string[];
  messageQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isPotentialRegression: boolean;
  regressionIndicators: string[];
}

/**
 * Parsed commit range
 */
export interface ParsedCommitRange {
  from: string;
  to: string;
  raw: string;
}

/**
 * Detail level for patches
 */
export type PatchDetailLevel = 'full' | 'stat' | 'files' | 'metadata';

/**
 * Parse and validate a commit range
 * Supports: HEAD~10..HEAD, tag1..tag2, branch1..branch2, commit1..commit2
 */
export const parseCommitRange = (range: string): ParsedCommitRange => {
  if (!range || typeof range !== 'string') {
    throw new RepomixError('Commit range must be a non-empty string');
  }

  // Handle single commit (treated as commit^..commit)
  if (!range.includes('..')) {
    return {
      from: `${range}^`,
      to: range,
      raw: range,
    };
  }

  // Handle range formats
  const [from, to] = range.split('..');

  if (!from || !to) {
    throw new RepomixError(`Invalid commit range format: '${range}'. Expected format: 'from..to'`);
  }

  return {
    from: from.trim(),
    to: to.trim(),
    raw: range,
  };
};

/**
 * Get full metadata for a specific commit
 */
export const getCommitMetadata = async (
  directory: string,
  hash: string,
  deps = {
    execFileAsync,
  },
): Promise<CommitMetadata> => {
  try {
    // Get commit metadata with fuller format showing author and committer
    const formatString = [
      '%H', // Full hash
      '%h', // Abbreviated hash
      '%P', // Parent hashes (space-separated)
      '%an', // Author name
      '%ae', // Author email
      '%aI', // Author date (ISO 8601)
      '%cn', // Committer name
      '%ce', // Committer email
      '%cI', // Committer date (ISO 8601)
      '%s', // Subject (first line of message)
      '%b', // Body (rest of message)
    ].join('%n');

    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '-1',
      `--pretty=format:${formatString}`,
      '--name-only',
      hash,
    ]);

    // Don't filter empty lines yet - we need all metadata fields even if empty
    const lines = result.stdout.split('\n');

    if (lines.length < 10) {
      throw new RepomixError(`Invalid git log output for commit ${hash}`);
    }

    const [
      fullHash,
      abbrevHash,
      parents,
      authorName,
      authorEmail,
      authorDate,
      committerName,
      committerEmail,
      committerDate,
      subject,
    ] = lines.slice(0, 10);

    // Rest of the lines are: body (if any) + files
    // Body ends when we hit file paths (relative paths typically start without special markers)
    const bodyAndFiles = lines.slice(10);
    const body: string[] = [];
    const files: string[] = [];

    let inBody = true;
    for (const line of bodyAndFiles) {
      // Heuristic: file paths typically don't start with spaces (unlike indented body text)
      // and commit bodies often have empty lines
      if (inBody && (line.startsWith(' ') || line === '')) {
        body.push(line);
      } else {
        inBody = false;
        files.push(line);
      }
    }

    return {
      hash: fullHash,
      abbreviatedHash: abbrevHash,
      parents: parents ? parents.split(' ').filter(Boolean) : [],
      author: {
        name: authorName,
        email: authorEmail,
        date: authorDate,
      },
      committer: {
        name: committerName,
        email: committerEmail,
        date: committerDate,
      },
      message: subject,
      body: body.join('\n').trim(),
      files,
    };
  } catch (error) {
    logger.trace('Failed to get commit metadata:', (error as Error).message);
    throw new RepomixError(`Failed to get commit metadata for ${hash}: ${(error as Error).message}`);
  }
};

/**
 * Get commit graph with topology
 */
export const getCommitGraph = async (
  directory: string,
  range: string,
  deps = {
    execFileAsync,
    parseCommitRange,
    getCommitMetadata,
    getTags,
  },
): Promise<CommitGraph> => {
  try {
    const parsedRange = deps.parseCommitRange(range);

    // Get ASCII graph
    const graphResult = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '--graph',
      '--oneline',
      '--decorate',
      '--all',
      `${parsedRange.from}..${parsedRange.to}`,
    ]);

    // Get list of commit hashes in range
    const hashesResult = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '--pretty=format:%H',
      `${parsedRange.from}..${parsedRange.to}`,
    ]);

    const hashes = hashesResult.stdout.split('\n').filter(Boolean);

    // Get metadata for each commit
    const commits = await Promise.all(hashes.map((hash) => deps.getCommitMetadata(directory, hash)));

    // Identify merge commits (commits with multiple parents)
    const mergeCommits = commits.filter((c) => c.parents.length > 1).map((c) => c.hash);

    // Get tags
    const tags = await deps.getTags(directory);

    // Generate Mermaid graph
    const mermaidGraph = generateMermaidGraph(commits, tags);

    return {
      commits,
      graph: graphResult.stdout,
      mermaidGraph,
      mergeCommits,
      tags,
    };
  } catch (error) {
    logger.trace('Failed to get commit graph:', (error as Error).message);
    throw new RepomixError(`Failed to get commit graph: ${(error as Error).message}`);
  }
};

/**
 * Get git tags mapping
 */
export const getTags = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<Record<string, string>> => {
  try {
    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'tag',
      '-l',
      '--format=%(refname:short) %(objectname)',
    ]);

    const tags: Record<string, string> = {};
    const lines = result.stdout.split('\n').filter(Boolean);

    for (const line of lines) {
      const [tag, hash] = line.split(' ');
      if (tag && hash) {
        tags[tag] = hash;
      }
    }

    return tags;
  } catch (error) {
    logger.trace('Failed to get tags:', (error as Error).message);
    return {};
  }
};

/**
 * Get patch for a commit with configurable detail level
 */
export const getCommitPatch = async (
  directory: string,
  hash: string,
  detailLevel: PatchDetailLevel = 'stat',
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    const args = ['-C', directory, 'show', '--no-color'];

    switch (detailLevel) {
      case 'full':
        // Full patch with diffs
        args.push('--patch');
        break;
      case 'stat':
        // File stats (files changed, insertions, deletions)
        args.push('--stat');
        break;
      case 'files':
        // Just file names
        args.push('--name-only');
        break;
      case 'metadata':
        // No diff, just commit metadata
        args.push('--no-patch');
        break;
      default:
        throw new RepomixError(`Invalid detail level: ${detailLevel}`);
    }

    args.push(hash);

    const result = await deps.execFileAsync('git', args);
    return result.stdout;
  } catch (error) {
    logger.trace('Failed to get commit patch:', (error as Error).message);
    throw new RepomixError(`Failed to get patch for commit ${hash}: ${(error as Error).message}`);
  }
};

/**
 * Analyze commit quality and detect AI generation
 */
export const analyzeCommit = (metadata: CommitMetadata): CommitAnalysis => {
  const indicators: string[] = [];
  const regressionIndicators: string[] = [];
  let aiConfidence = 0;

  // AI Detection Heuristics
  const authorEmail = metadata.author.email.toLowerCase();
  const committerEmail = metadata.committer.email.toLowerCase();
  const message = metadata.message.toLowerCase();
  const body = metadata.body.toLowerCase();

  // Email patterns indicating AI
  const aiEmailPatterns = ['claude@', 'noreply@anthropic.com', 'assistant@', 'ai@', 'bot@', 'copilot@'];

  for (const pattern of aiEmailPatterns) {
    if (authorEmail.includes(pattern) || committerEmail.includes(pattern)) {
      indicators.push(`AI email pattern: ${pattern}`);
      aiConfidence += 40;
    }
  }

  // Author name patterns
  if (
    metadata.author.name.toLowerCase().includes('claude') ||
    metadata.author.name.toLowerCase().includes('assistant') ||
    metadata.author.name.toLowerCase().includes('copilot')
  ) {
    indicators.push(`AI name pattern: ${metadata.author.name}`);
    aiConfidence += 30;
  }

  // Message patterns suggesting AI
  const aiMessagePatterns = [
    'update test',
    'fix test',
    'refactor:',
    'feat:',
    'fix:',
    'chore:',
    'test:',
    'docs:',
    'style:',
    'perf:',
    'ci:',
    'build:',
  ];

  const conventionalCommit = aiMessagePatterns.some((pattern) => message.startsWith(pattern));
  if (conventionalCommit) {
    indicators.push('Conventional commit format');
    aiConfidence += 10;
  }

  // Very structured body text
  if (body.includes('- ') && body.split('- ').length > 3) {
    indicators.push('Structured bullet points in body');
    aiConfidence += 10;
  }

  // Regression Detection Heuristics
  const regressionKeywords = ['fix', 'bug', 'revert', 'regression', 'broken', 'issue', 'problem', 'error'];

  for (const keyword of regressionKeywords) {
    if (message.includes(keyword) || body.includes(keyword)) {
      regressionIndicators.push(`Keyword: ${keyword}`);
    }
  }

  // Test file changes often indicate fixes
  const testFilePatterns = ['.test.', '.spec.', 'test/', '__tests__/', 'tests/'];
  const hasTestChanges = metadata.files.some((file) => testFilePatterns.some((pattern) => file.includes(pattern)));

  if (hasTestChanges && regressionIndicators.length > 0) {
    regressionIndicators.push('Test file changes with fix keywords');
  }

  // Multiple files changed with "fix" often indicates regression fix
  if (message.includes('fix') && metadata.files.length > 3) {
    regressionIndicators.push('Multiple files changed in fix commit');
  }

  // Message Quality Assessment
  const messageLength = metadata.message.length;
  const hasBody = metadata.body.length > 0;
  const hasConventionalFormat = conventionalCommit;

  let messageQuality: CommitAnalysis['messageQuality'];
  if (messageLength > 20 && hasBody && hasConventionalFormat) {
    messageQuality = 'excellent';
  } else if (messageLength > 10 && (hasBody || hasConventionalFormat)) {
    messageQuality = 'good';
  } else if (messageLength > 5) {
    messageQuality = 'fair';
  } else {
    messageQuality = 'poor';
  }

  return {
    isAiGenerated: aiConfidence > 50,
    confidence: Math.min(100, aiConfidence),
    indicators,
    messageQuality,
    isPotentialRegression: regressionIndicators.length > 0,
    regressionIndicators,
  };
};

/**
 * Generate Mermaid diagram from commits
 */
const generateMermaidGraph = (commits: CommitMetadata[], tags: Record<string, string>): string => {
  const lines: string[] = [];
  lines.push('gitGraph');

  // Reverse to show oldest first
  const reversed = [...commits].reverse();

  // Build a simple linear graph (more complex merge visualization could be added)
  for (const commit of reversed) {
    const shortHash = commit.abbreviatedHash;
    const shortMessage = commit.message.substring(0, 50);

    // Check if this commit has a tag
    const tagForCommit = Object.entries(tags).find(([, hash]) => hash === commit.hash)?.[0];

    if (commit.parents.length > 1) {
      lines.push(`  merge ${shortHash} tag: "${shortMessage}"`);
    } else {
      lines.push(`  commit id: "${shortHash}: ${shortMessage}"`);
    }

    if (tagForCommit) {
      lines.push(`  commit tag: "${tagForCommit}"`);
    }
  }

  return lines.join('\n');
};
