# Git Commit History Analysis

Repomix can analyze git commit history to help AI understand how a codebase evolved.

## Quick Start

```bash
# Full analysis with diffs (recommended for detailed work)
repomix --include-commit-history --commit-patch-detail full --analyze-commits

# Lighter analysis without diffs
repomix --include-commit-history --commit-patch-detail metadata --analyze-commits

# Specific commit range
repomix --include-commit-history --commit-range "v1.0..HEAD" --analyze-commits
```

## Patch Detail Levels

| Level | Output Size | Contains | Best For |
|-------|-------------|----------|----------|
| `full` | Large (~3x) | Complete diffs | Detailed code review |
| `stat` | Medium | Change statistics | Overview of changes |
| `files` | Small | Filenames only | Quick scan |
| `metadata` | Smallest | No patches | Commit messages only |

**Recommendation**: Use `full` when you need to analyze actual code changes. The larger output is worth it.

## Options Reference

```bash
--include-commit-history     # Enable commit history analysis
--commit-range <range>       # Range to analyze (default: HEAD~50..HEAD)
--commit-patch-detail <lvl>  # full, stat, files, metadata (default: stat)
--analyze-commits            # Enable AI detection and regression flags
--no-commit-graph            # Skip ASCII/Mermaid graph generation
--no-git-tags                # Exclude tag information
--no-commit-patches          # Metadata only (same as metadata detail level)
```

## Understanding the Output

### AI Detection
The `--analyze-commits` flag detects AI-generated commits by checking:
- Author email patterns (e.g., `noreply@anthropic.com`)
- Author name patterns (e.g., `Claude`, `Copilot`)
- Conventional commit format usage

### Regression Indicators
Commits are flagged as potential regressions when they contain keywords like "fix", "bug", "revert". Note: This produces many false positives - use as a starting point for manual review, not as definitive classification.

## Tips for Better Results

1. **Choose the right detail level**: Use `full` for code review, `metadata` for quick overview
2. **Set appropriate commit range**: Analyze specific feature branches with `--commit-range "main..feature-branch"`
3. **Combine with file filtering**: `--include "src/**/*.ts"` to focus on relevant files
4. **Manual categorization needed**: Regression flags are starting points, not final assessments

## Example Workflow

```bash
# 1. Generate analysis
repomix --include-commit-history --commit-range "v1.0..HEAD" \
  --analyze-commits --commit-patch-detail full -o analysis.xml

# 2. Find AI-generated commits
grep 'ai_generated="true"' analysis.xml

# 3. Find potential regressions (review manually)
grep 'potential_regression="true"' analysis.xml

# 4. Extract specific commit details
grep -A 100 'hash="abc123"' analysis.xml
```
