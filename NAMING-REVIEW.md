# Git Commit History Feature - Comprehensive Naming Review

## Current Repomix Naming Patterns

### Pattern 1: CLI Flags for Git Features
```bash
--include-diffs          # Toggle: include git diffs
--include-logs           # Toggle: include git logs
--include-logs-count N   # Parameter: how many logs
```
**Pattern**: `--include-{feature}` for toggles, `--include-{feature}-{param}` for parameters

### Pattern 2: Config Fields (under `git: {}` object)
```typescript
git: {
  includeDiffs: boolean,     // Toggle: include diffs
  includeLogs: boolean,      // Toggle: include logs
  includeLogsCount: number,  // Parameter: log count
  sortByChanges: boolean,    // Action: sort by changes
  sortByChangesMaxCommits: number  // Parameter: max commits for sort
}
```
**Pattern**:
- Toggles: `include{Feature}` (no "Git" prefix - already in git object)
- Parameters: `{feature}{ParamName}`
- Actions: `{action}By{Criteria}`

### Pattern 3: Template Variables
```handlebars
{{gitDiffEnabled}}
{{gitDiffWorkTree}}
{{gitLogEnabled}}
{{gitLogCommits}}
```
**Pattern**: `git{Feature}{Property}` (full "git" prefix since templates have all variables in one scope)

---

## Problems with Current Implementation

### ❌ Problem 1: Config Field Names Missing Specificity

**Current (vague)**:
```typescript
git: {
  includeHistory: boolean,        // ❌ What kind of history?
  historyRange: string,           // ❌ History of what?
  includeGraph: boolean,          // ❌ Graph of what?
  includeAnalysis: boolean,       // ❌ Analysis of what?
  includeTags: boolean,           // ⚠️  Okay but could be clearer
  includePatches: boolean,        // ❌ Patches for what?
  patchDetailLevel: string        // ✅ This is actually fine
}
```

**Should be (specific)**:
```typescript
git: {
  includeCommitHistory: boolean,     // ✅ Detailed commit history
  commitRange: string,               // ✅ Range of commits
  includeCommitGraph: boolean,       // ✅ Commit graph visualization
  includeCommitAnalysis: boolean,    // ✅ AI analysis of commits
  includeGitTags: boolean,           // ✅ Git tags
  includeCommitPatches: boolean,     // ✅ Patches for each commit
  commitPatchDetail: 'full' | ...    // ✅ Detail level for commit patches
}
```

### ❌ Problem 2: CLI Flags Don't Follow --include-* Pattern

**Current (inconsistent)**:
```bash
--git-history              # ❌ Should use --include-* pattern
--git-detail-level         # ❌ Doesn't match pattern
--git-no-graph             # ⚠️  Negative flag okay, but should be more specific
--git-no-tags              # ⚠️  Okay
--git-no-patches           # ❌ Should be --no-commit-patches
--git-analyze              # ✅ This is fine (it's an action modifier)
```

**Should be (consistent)**:
```bash
--include-commit-history          # ✅ Follows --include-* pattern
--commit-range <range>            # ✅ Parameter name
--commit-patch-detail <level>     # ✅ Specific parameter
--no-commit-graph                 # ✅ Specific negative flag
--no-git-tags                     # ✅ Clear what's excluded
--no-commit-patches               # ✅ Specific negative flag
--analyze-commits                 # ✅ Or keep --git-analyze (both work)
```

### ❌ Problem 3: Template Variable Names

**Current**:
```handlebars
{{gitHistoryEnabled}}
{{gitHistorySummary}}
{{gitHistoryGraph}}
{{gitHistoryCommits}}
```

**Should be** (more specific):
```handlebars
{{gitCommitHistoryEnabled}}
{{gitCommitHistorySummary}}
{{gitCommitGraph}}
{{gitCommitHistoryItems}}
```

---

## Complete Renaming Plan

### Phase 1: Config Schema (src/config/configSchema.ts)

| Current Name | New Name | Reason |
|-------------|----------|--------|
| `includeHistory` | `includeCommitHistory` | Specify it's commit history, not file history |
| `historyRange` | `commitRange` | It's a commit range specifically |
| `patchDetailLevel` | `commitPatchDetail` | Detail level for commit patches |
| `includeGraph` | `includeCommitGraph` | It's specifically a commit graph |
| `includeAnalysis` | `includeCommitAnalysis` | Analysis of commits specifically |
| `includeTags` | `includeGitTags` | Make it explicit |
| `includePatches` | `includeCommitPatches` | Patches for commits |

### Phase 2: CLI Flags (src/cli/cliRun.ts, types.ts)

| Current Flag | New Flag | Config Mapping |
|-------------|----------|----------------|
| `--git-history` | `--include-commit-history` | `includeCommitHistory` |
| `--git-range` | `--commit-range` | `commitRange` |
| `--git-detail-level` | `--commit-patch-detail` | `commitPatchDetail` |
| `--git-no-graph` | `--no-commit-graph` | `includeCommitGraph: false` |
| `--git-no-tags` | `--no-git-tags` | `includeGitTags: false` |
| `--git-no-patches` | `--no-commit-patches` | `includeCommitPatches: false` |
| `--git-analyze` | `--analyze-commits` | `includeCommitAnalysis: true` |

### Phase 3: Template Variables (outputGeneratorTypes.ts, templates)

| Current Name | New Name |
|-------------|----------|
| `gitHistoryEnabled` | `gitCommitHistoryEnabled` |
| `gitHistorySummary` | `gitCommitHistorySummary` |
| `gitHistoryGraph` | `gitCommitGraph` |
| `gitHistoryCommits` | `gitCommitHistoryItems` |

### Phase 4: Type Names (src/core/git/)

| Current Name | New Name |
|-------------|----------|
| `GitHistoryResult` | `GitCommitHistoryResult` |
| `HistorySummary` | `CommitHistorySummary` |
| `HistoryCommitResult` | `CommitWithAnalysis` |

### Phase 5: Function Names

| Current Name | New Name |
|-------------|----------|
| `getGitHistory` | `getGitCommitHistory` |

---

## Rationale Summary

**Why "Commit" everywhere?**
- Repomix could theoretically track file history, branch history, tag history
- Being specific prevents ambiguity
- Follows existing pattern: `includeDiffs`, `includeLogs` are specific

**Why follow --include-* pattern for CLI?**
- Consistency with existing flags
- Users already know `--include-diffs`, `--include-logs`
- Makes it easy to discover related features

**Why "git" prefix in templates but not config?**
- Templates have all variables in one flat namespace
- Config already under `git: {}` object, so prefix is redundant
- This matches existing pattern exactly

---

## Migration Impact

**Backward Compatibility**: BREAKING CHANGES
- Existing users using `--git-history` will need to update to `--include-commit-history`
- Config files using old field names will break

**Recommendation**:
Since feature is brand new (just added), now is the best time to fix naming before anyone uses it in production.

---

## Implementation Checklist

- [ ] Update config schema field names
- [ ] Update CLI flags and help text
- [ ] Update CLI option types
- [ ] Update defaultAction.ts mapping
- [ ] Update template variable names in outputGeneratorTypes.ts
- [ ] Update Markdown template
- [ ] Update XML template
- [ ] Update JSON output generation
- [ ] Update type names in gitHistory.ts
- [ ] Update type names in gitHistoryHandle.ts
- [ ] Update function names
- [ ] Update all test files
- [ ] Update design documentation
- [ ] Test build
- [ ] Test all 27 unit tests pass
- [ ] Commit with clear explanation of breaking changes
