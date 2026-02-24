/** Maps issue labels to a Conventional Commits type prefix. */
function labelToType(labels: { name: string }[]): string {
  const names = labels.map((l) => l.name.toLowerCase())
  if (names.includes('bug')) return 'fix'
  if (names.includes('documentation') || names.includes('docs')) return 'docs'
  if (names.includes('dependencies') || names.includes('maintenance') || names.includes('chore'))
    return 'chore'
  return 'feat'
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 45)
}

/** Generates a branch name like `feat/42-add-dark-mode`. */
export function issueBranchName(
  issueNumber: number,
  title: string,
  labels: { name: string }[] = []
): string {
  const type = labelToType(labels)
  return `${type}/${issueNumber}-${slugify(title)}`
}

/** Generates a Conventional Commits PR title like `feat: add dark mode (#42)`. */
export function issuePrTitle(
  issueNumber: number,
  title: string,
  labels: { name: string }[] = []
): string {
  const type = labelToType(labels)
  return `${type}: ${title} (#${issueNumber})`
}

/**
 * Parses a branch name into a suggested PR title and body.
 * Handles: `feat/42-add-dark-mode`, `fix/add-dark-mode`, `42-add-feature`, plain names.
 */
export function parseBranchForPR(branch: string): { title: string; body: string } {
  // Pattern: type/number-slug
  const typed = branch.match(/^(\w+)\/(\d+)-(.+)$/)
  if (typed) {
    const [, type, num, slug] = typed
    return {
      title: `${type}: ${slug.replace(/-/g, ' ')}`,
      body: `Closes #${num}`
    }
  }

  // Pattern: type/slug (no issue number)
  const typedNoNum = branch.match(/^(\w+)\/(.+)$/)
  if (typedNoNum) {
    const [, type, slug] = typedNoNum
    return {
      title: `${type}: ${slug.replace(/-/g, ' ')}`,
      body: ''
    }
  }

  // Pattern: number-slug (legacy / plain)
  const plain = branch.match(/^(\d+)-(.+)$/)
  if (plain) {
    const [, num, slug] = plain
    return {
      title: slug.replace(/-/g, ' '),
      body: `Closes #${num}`
    }
  }

  return { title: '', body: '' }
}

export function claudeIssueCommand(issueNumber: number): string {
  return `cls; claude "Read GitHub issue #${issueNumber} using gh cli and work on it."`
}
