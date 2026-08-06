export const GITHUB_REPO = "Never-lab/liquidazi";

const issueNew = (labels: string, title: string) =>
  `https://github.com/${GITHUB_REPO}/issues/new?labels=${encodeURIComponent(labels)}&title=${encodeURIComponent(title)}`;

export const bugReportUrl = () => issueNew("bug", "Bug: ");

export const enhancementUrl = () => issueNew("enhancement", "Idea: ");
