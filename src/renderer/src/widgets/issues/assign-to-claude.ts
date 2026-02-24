import { GitHubIssue } from '../../../../shared/types'

export function issueBranchName(issueNumber: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 45)
  return `${issueNumber}-${slug}`
}

export function claudeIssueCommand(issueNumber: number): string {
  return `cls; claude "Read GitHub issue #${issueNumber} using gh cli and work on it."`
}
