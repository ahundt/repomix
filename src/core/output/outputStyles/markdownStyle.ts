import Handlebars from 'handlebars';

export const getMarkdownTemplate = () => {
  return /* md */ `
{{#if fileSummaryEnabled}}
{{{generationHeader}}}

# File Summary

## Purpose
{{{summaryPurpose}}}

## File Format
{{{summaryFileFormat}}}
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
{{{summaryUsageGuidelines}}}

## Notes
{{{summaryNotes}}}

{{/if}}
{{#if headerText}}
# User Provided Header
{{{headerText}}}

{{/if}}
{{#if directoryStructureEnabled}}
# Directory Structure
\`\`\`
{{{treeString}}}
\`\`\`

{{/if}}
{{#if filesEnabled}}
# Files

{{#each processedFiles}}
## File: {{{this.path}}}
{{{../markdownCodeBlockDelimiter}}}{{{getFileExtension this.path}}}
{{{this.content}}}
{{{../markdownCodeBlockDelimiter}}}

{{/each}}
{{/if}}

{{#if gitDiffEnabled}}
# Git Diffs
## Git Diffs Working Tree
\`\`\`diff
{{{gitDiffWorkTree}}}
\`\`\`

## Git Diffs Staged
\`\`\`diff
{{{gitDiffStaged}}}
\`\`\`

{{/if}}

{{#if gitLogEnabled}}
# Git Logs

{{#each gitLogCommits}}
## Commit: {{{this.date}}}
**Message:** {{{this.message}}}

**Files:**
{{#each this.files}}
- {{{this}}}
{{/each}}

{{/each}}
{{/if}}

{{#if gitForensicsEnabled}}
# Git Forensics

## Analysis Summary
- **Total Commits**: {{{gitForensicsSummary.totalCommits}}}
- **Merge Commits**: {{{gitForensicsSummary.mergeCommits}}}
{{#if gitForensicsSummary.aiGeneratedCommits}}
- **AI-Generated**: {{{gitForensicsSummary.aiGeneratedCommits}}} ({{gitForensicsAiPercentage}}%)
- **Potential Regressions**: {{{gitForensicsSummary.potentialRegressions}}}
{{/if}}
- **Range**: \`{{{gitForensicsSummary.range}}}\`
- **Detail Level**: {{{gitForensicsSummary.detailLevel}}}

{{#if gitForensicsGraph}}
## Commit Graph

### Topology (ASCII)
\`\`\`
{{{gitForensicsGraph.graph}}}
\`\`\`

{{#if gitForensicsGraph.mermaidGraph}}
### Mermaid Diagram
\`\`\`mermaid
{{{gitForensicsGraph.mermaidGraph}}}
\`\`\`
{{/if}}

{{#if gitForensicsGraph.tags}}
### Tags
{{#each gitForensicsGraph.tags}}
- **{{{@key}}}**: \`{{{this}}}\`
{{/each}}
{{/if}}

{{/if}}

## Commits

{{#each gitForensicsCommits}}
### Commit {{{this.metadata.abbreviatedHash}}}{{#if this.analysis.isAiGenerated}} 🤖 AI-Generated{{/if}}{{#if this.analysis.isPotentialRegression}} ⚠️ Potential Regression{{/if}}

**Hash**: \`{{{this.metadata.hash}}}\`
**Author**: {{{this.metadata.author.name}}} <{{{this.metadata.author.email}}}>
**Date**: {{{this.metadata.author.date}}}
{{#if this.metadata.parents}}
**Parents**: {{#each this.metadata.parents}}\`{{{this}}}\` {{/each}}
{{/if}}
**Message**: {{{this.metadata.message}}}

{{#if this.metadata.body}}
**Body**:
\`\`\`
{{{this.metadata.body}}}
\`\`\`
{{/if}}

{{#if this.analysis}}
**Analysis**:
- **AI-Generated**: {{#if this.analysis.isAiGenerated}}Yes (confidence: {{{this.analysis.confidence}}}%){{else}}No{{/if}}
- **Message Quality**: {{{this.analysis.messageQuality}}}
- **Potential Regression**: {{#if this.analysis.isPotentialRegression}}Yes{{else}}No{{/if}}
{{#if this.analysis.indicators}}
- **AI Indicators**: {{#each this.analysis.indicators}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if this.analysis.regressionIndicators}}
- **Regression Indicators**: {{#each this.analysis.regressionIndicators}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{/if}}

{{#if this.patch}}
**Changes**:
\`\`\`diff
{{{this.patch}}}
\`\`\`
{{/if}}

---

{{/each}}
{{/if}}

{{#if instruction}}
# Instruction
{{{instruction}}}
{{/if}}
`;
};

Handlebars.registerHelper('gitForensicsAiPercentage', function (this: { gitForensicsSummary: { totalCommits: number; aiGeneratedCommits: number } }) {
  const total = this.gitForensicsSummary?.totalCommits || 0;
  const aiCount = this.gitForensicsSummary?.aiGeneratedCommits || 0;
  if (total === 0) return '0';
  return Math.round((aiCount / total) * 100).toString();
});

Handlebars.registerHelper('getFileExtension', (filePath) => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'vue':
      return 'vue';
    case 'py':
      return 'python';
    case 'rb':
      return 'ruby';
    case 'java':
      return 'java';
    case 'c':
    case 'cpp':
      return 'cpp';
    case 'cs':
      return 'csharp';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'php':
      return 'php';
    case 'swift':
      return 'swift';
    case 'kt':
      return 'kotlin';
    case 'scala':
      return 'scala';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
      return 'scss';
    case 'json':
      return 'json';
    case 'json5':
      return 'json5';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'md':
      return 'markdown';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'sql':
      return 'sql';
    case 'dockerfile':
      return 'dockerfile';
    case 'dart':
      return 'dart';
    case 'fs':
    case 'fsx':
      return 'fsharp';
    case 'r':
      return 'r';
    case 'pl':
    case 'pm':
      return 'perl';
    case 'lua':
      return 'lua';
    case 'groovy':
      return 'groovy';
    case 'hs':
      return 'haskell';
    case 'ex':
    case 'exs':
      return 'elixir';
    case 'erl':
      return 'erlang';
    case 'clj':
    case 'cljs':
      return 'clojure';
    case 'ps1':
      return 'powershell';
    case 'vb':
      return 'vb';
    case 'coffee':
      return 'coffeescript';
    case 'tf':
    case 'tfvars':
      return 'hcl';
    case 'proto':
      return 'protobuf';
    case 'pug':
      return 'pug';
    case 'graphql':
    case 'gql':
      return 'graphql';
    case 'toml':
      return 'toml';
    default:
      return '';
  }
});
