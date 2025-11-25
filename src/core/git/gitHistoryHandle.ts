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
} from './gitHistory.js';
import { isGitRepository } from './gitRepositoryHandle.js';

/**
 * Complete forensics result for a single commit
 */
export interface HistoryCommitResult {
  metadata: CommitMetadata;
  patch: string;
  analysis?: CommitAnalysis;
}

/**
 * Summary statistics for forensics analysis
 */
export interface HistorySummary {
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
export interface GitHistoryResult {
  graph?: CommitGraph;
  commits: HistoryCommitResult[];
  summary: HistorySummary;
}

/**
 * Get comprehensive git forensics analysis
 */
export const getGitHistory = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = {
    isGitRepository,
    getCommitGraph,
    getCommitPatch,
    analyzeCommit,
  },
): Promise<GitHistoryResult | undefined> => {
  // Only run if git history is explicitly enabled
  if (!config.output.git?.includeHistory) {
    logger.trace('Git commit history analysis not enabled');
    return undefined;
  }

  try {
    // Use the first directory as the git repository root
    const gitRoot = rootDirs[0] || config.cwd;

    // Check if this is a git repository
    const isGitRepo = await deps.isGitRepository(gitRoot);
    if (!isGitRepo) {
      logger.trace(`Directory ${gitRoot} is not a git repository, skipping history analysis`);
      return undefined;
    }

    // Get configuration options with defaults
    const range = config.output.git.historyRange || 'HEAD~50..HEAD';
    const detailLevel = (config.output.git.patchDetailLevel as PatchDetailLevel) || 'stat';
    const includeGraph = config.output.git.includeGraph !== false;
    const includeAnalysis = config.output.git.includeAnalysis === true;
    const includePatches = config.output.git.includePatches !== false;

    logger.trace('Git history analysis configuration:', {
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
    const commits: HistoryCommitResult[] = [];
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

    const summary: HistorySummary = {
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
