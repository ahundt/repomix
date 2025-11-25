import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import {
  analyzeCommit,
  type CommitAnalysis,
  type CommitGraph,
  type CommitMetadata,
  getCommitGraph,
  getCommitPatch,
  type PatchDetailLevel,
} from './gitForensics.js';
import { isGitRepository } from './gitRepositoryHandle.js';

/**
 * Complete forensics result for a single commit
 */
export interface ForensicsCommitResult {
  metadata: CommitMetadata;
  patch: string;
  analysis?: CommitAnalysis;
}

/**
 * Summary statistics for forensics analysis
 */
export interface ForensicsSummary {
  totalCommits: number;
  mergeCommits: number;
  aiGeneratedCommits: number;
  potentialRegressions: number;
  range: string;
  detailLevel: PatchDetailLevel;
}

/**
 * Complete git forensics result
 */
export interface GitForensicsResult {
  graph?: CommitGraph;
  commits: ForensicsCommitResult[];
  summary: ForensicsSummary;
}

/**
 * Get comprehensive git forensics analysis
 */
export const getGitForensics = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = {
    isGitRepository,
    getCommitGraph,
    getCommitPatch,
    analyzeCommit,
  },
): Promise<GitForensicsResult | undefined> => {
  // Only run if forensics is explicitly enabled
  if (!config.output.git?.includeForensics) {
    logger.trace('Git forensics not enabled');
    return undefined;
  }

  try {
    // Use the first directory as the git repository root
    const gitRoot = rootDirs[0] || config.cwd;

    // Check if this is a git repository
    const isGitRepo = await deps.isGitRepository(gitRoot);
    if (!isGitRepo) {
      logger.trace(`Directory ${gitRoot} is not a git repository, skipping forensics`);
      return undefined;
    }

    // Get configuration options with defaults
    const range = config.output.git.forensicsRange || 'HEAD~50..HEAD';
    const detailLevel = (config.output.git.forensicsDetailLevel as PatchDetailLevel) || 'stat';
    const includeGraph = config.output.git.forensicsIncludeGraph !== false;
    const includeAnalysis = config.output.git.forensicsIncludeAnalysis === true;
    const includePatches = config.output.git.forensicsIncludePatches !== false;

    logger.trace('Git forensics configuration:', {
      range,
      detailLevel,
      includeGraph,
      includeAnalysis,
      includePatches,
    });

    // Get commit graph (includes metadata for all commits)
    const graph = includeGraph ? await deps.getCommitGraph(gitRoot, range) : undefined;

    // If graph wasn't fetched, we need to get commits another way
    // For now, we'll require the graph for simplicity
    if (!graph) {
      throw new RepomixError('Git forensics requires commit graph to be enabled');
    }

    // Process each commit
    const commits: ForensicsCommitResult[] = [];
    for (const metadata of graph.commits) {
      // Get patch if requested
      const patch = includePatches ? await deps.getCommitPatch(gitRoot, metadata.hash, detailLevel) : '';

      // Analyze commit if requested
      const analysis = includeAnalysis ? deps.analyzeCommit(metadata) : undefined;

      commits.push({
        metadata,
        patch,
        analysis,
      });
    }

    // Calculate summary statistics
    const aiGeneratedCount = commits.filter((c) => c.analysis?.isAiGenerated).length;
    const regressionCount = commits.filter((c) => c.analysis?.isPotentialRegression).length;

    const summary: ForensicsSummary = {
      totalCommits: commits.length,
      mergeCommits: graph.mergeCommits.length,
      aiGeneratedCommits: aiGeneratedCount,
      potentialRegressions: regressionCount,
      range,
      detailLevel,
    };

    logger.info(`✅ Git forensics analyzed ${commits.length} commits in range ${range}`);
    if (includeAnalysis) {
      logger.info(
        `   AI-generated: ${aiGeneratedCount}, Potential regressions: ${regressionCount}, Merges: ${graph.mergeCommits.length}`,
      );
    }

    return {
      graph: includeGraph ? graph : undefined,
      commits,
      summary,
    };
  } catch (error) {
    if (error instanceof RepomixError) {
      throw error;
    }
    logger.trace('Failed to get git forensics:', (error as Error).message);
    throw new RepomixError(`Failed to get git forensics: ${(error as Error).message}`, { cause: error });
  }
};
