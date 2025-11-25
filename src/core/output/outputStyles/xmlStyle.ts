export const getXmlTemplate = () => {
  return /* xml */ `
{{#if fileSummaryEnabled}}
{{{generationHeader}}}

<file_summary>
This section contains a summary of this file.

<purpose>
{{{summaryPurpose}}}
</purpose>

<file_format>
{{{summaryFileFormat}}}
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
{{{summaryUsageGuidelines}}}
</usage_guidelines>

<notes>
{{{summaryNotes}}}
</notes>

</file_summary>

{{/if}}
{{#if headerText}}
<user_provided_header>
{{{headerText}}}
</user_provided_header>

{{/if}}
{{#if directoryStructureEnabled}}
<directory_structure>
{{{treeString}}}
</directory_structure>

{{/if}}
{{#if filesEnabled}}
<files>
This section contains the contents of the repository's files.

{{#each processedFiles}}
<file path="{{{this.path}}}">
{{{this.content}}}
</file>

{{/each}}
</files>
{{/if}}

{{#if gitDiffEnabled}}
<git_diffs>
<git_diff_work_tree>
{{{gitDiffWorkTree}}}
</git_diff_work_tree>
<git_diff_staged>
{{{gitDiffStaged}}}
</git_diff_staged>
</git_diffs>
{{/if}}

{{#if gitLogEnabled}}
<git_logs>
{{#each gitLogCommits}}
<git_log_commit>
<date>{{{this.date}}}</date>
<message>{{{this.message}}}</message>
<files>
{{#each this.files}}
{{{this}}}
{{/each}}
</files>
</git_log_commit>
{{/each}}
</git_logs>
{{/if}}

{{#if gitHistoryEnabled}}
<git_history>
<summary>
<total_commits>{{{gitHistorySummary.totalCommits}}}</total_commits>
<merge_commits>{{{gitHistorySummary.mergeCommits}}}</merge_commits>
{{#if gitHistorySummary.aiGeneratedCommits}}
<ai_generated_commits>{{{gitHistorySummary.aiGeneratedCommits}}}</ai_generated_commits>
<potential_regressions>{{{gitHistorySummary.potentialRegressions}}}</potential_regressions>
{{/if}}
<range>{{{gitHistorySummary.range}}}</range>
<detail_level>{{{gitHistorySummary.detailLevel}}}</detail_level>
</summary>

{{#if gitHistoryGraph}}
<commit_graph>
<ascii_graph>
{{{gitHistoryGraph.graph}}}
</ascii_graph>
{{#if gitHistoryGraph.mermaidGraph}}
<mermaid_graph>
{{{gitHistoryGraph.mermaidGraph}}}
</mermaid_graph>
{{/if}}
{{#if gitHistoryGraph.tags}}
<tags>
{{#each gitHistoryGraph.tags}}
<tag name="{{{@key}}}">{{{this}}}</tag>
{{/each}}
</tags>
{{/if}}
</commit_graph>
{{/if}}

<commits>
{{#each gitHistoryCommits}}
<commit hash="{{{this.metadata.hash}}}" abbreviated_hash="{{{this.metadata.abbreviatedHash}}}"{{#if this.analysis.isAiGenerated}} ai_generated="true"{{/if}}{{#if this.analysis.isPotentialRegression}} potential_regression="true"{{/if}}>
<author>
<name>{{{this.metadata.author.name}}}</name>
<email>{{{this.metadata.author.email}}}</email>
<date>{{{this.metadata.author.date}}}</date>
</author>
<committer>
<name>{{{this.metadata.committer.name}}}</name>
<email>{{{this.metadata.committer.email}}}</email>
<date>{{{this.metadata.committer.date}}}</date>
</committer>
{{#if this.metadata.parents}}
<parents>
{{#each this.metadata.parents}}
<parent>{{{this}}}</parent>
{{/each}}
</parents>
{{/if}}
<message>{{{this.metadata.message}}}</message>
{{#if this.metadata.body}}
<body>{{{this.metadata.body}}}</body>
{{/if}}
{{#if this.analysis}}
<analysis>
<ai_generated confidence="{{{this.analysis.confidence}}}">{{{this.analysis.isAiGenerated}}}</ai_generated>
<message_quality>{{{this.analysis.messageQuality}}}</message_quality>
<potential_regression>{{{this.analysis.isPotentialRegression}}}</potential_regression>
{{#if this.analysis.indicators}}
<ai_indicators>
{{#each this.analysis.indicators}}
<indicator>{{{this}}}</indicator>
{{/each}}
</ai_indicators>
{{/if}}
{{#if this.analysis.regressionIndicators}}
<regression_indicators>
{{#each this.analysis.regressionIndicators}}
<indicator>{{{this}}}</indicator>
{{/each}}
</regression_indicators>
{{/if}}
</analysis>
{{/if}}
{{#if this.patch}}
<patch>
{{{this.patch}}}
</patch>
{{/if}}
</commit>
{{/each}}
</commits>
</git_history>
{{/if}}

{{#if instruction}}
<instruction>
{{{instruction}}}
</instruction>
{{/if}}
`;
};
