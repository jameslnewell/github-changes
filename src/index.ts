import type {Octokit} from '@octokit/rest'

interface PrChange {
  type: 'pr'
  url: string
  number: number
  title: string
  body: string
  labels: string[]
  /** The Github username of the person who made the change */
  author?: string
}

interface CommitChange {
  type: 'commit'
  url: string
  sha: string
  message: string
  /** The Github username of the person who made the change */
  author?: string
}

export type Change = PrChange | CommitChange

interface FindChangesOptions {
  octokit: Octokit
  owner: string
  repo: string
  base: string
  head: string
}

const BATCH_SIZE = 20

interface CompareCommit {
  sha: string
  html_url: string
  commit: {message: string}
  author: {login: string} | null
  committer: {login: string} | null
}

interface PullRequestNode {
  __typename: 'PullRequest'
  number: number
  title: string
  body: string | null
  url: string
  author: {login: string} | null
  labels: {nodes: Array<{name: string}>}
}

interface SearchResult {
  nodes: Array<PullRequestNode | {__typename: string}>
}

function isPullRequestNode(
  node: PullRequestNode | {__typename: string} | undefined
): node is PullRequestNode {
  return node?.__typename === 'PullRequest'
}

function buildBatchQuery(size: number): string {
  const variableDecls = Array.from({length: size}, (_, i) => `$q${i}: String!`).join(', ')
  const aliases = Array.from({length: size}, (_, i) => `
    s${i}: search(query: $q${i}, type: ISSUE, first: 1) {
      nodes {
        __typename
        ... on PullRequest {
          number
          title
          body
          url
          author { login }
          labels(first: 100) { nodes { name } }
        }
      }
    }
  `).join('\n')
  return `query SearchByShas(${variableDecls}) {\n${aliases}\n}`
}

/**
 * Find all changes to a repo since
 */
export async function* findChanges({octokit, owner, repo, base, head}: FindChangesOptions): AsyncGenerator<Change> {
  const yieldedPrNumbers = new Set<number>()

  // we could potentially make fewer requests using the strategy mentioned at https://github.com/orgs/community/discussions/73691 but then SHAs won't work
  const commitsPaginator = octokit.paginate.iterator(octokit.repos.compareCommitsWithBasehead, {
    owner,
    repo,
    basehead: `${base}...${head}`
  })

  let batch: CompareCommit[] = []

  async function* flushBatch(): AsyncGenerator<Change> {
    if (batch.length === 0) return
    const current = batch
    batch = []

    const query = buildBatchQuery(current.length)
    const variables: Record<string, string> = {}
    for (let i = 0; i < current.length; i++) {
      const commit = current[i]
      if (!commit) continue
      variables[`q${i}`] = `repo:${owner}/${repo} is:pr sha:${commit.sha}`
    }

    // Resolve commits → PRs in a single HTTP request via aliased GraphQL search.
    // Each aliased sub-query consumes one search-rate-limit unit; consumers should
    // pass an Octokit configured with @octokit/plugin-throttling to handle 429s.
    const data = await octokit.graphql<Record<string, SearchResult>>(query, variables)

    for (let i = 0; i < current.length; i++) {
      const commit = current[i]
      if (!commit) continue
      const result = data[`s${i}`]
      const node = result?.nodes[0]

      if (isPullRequestNode(node)) {
        if (yieldedPrNumbers.has(node.number)) continue
        yieldedPrNumbers.add(node.number)
        yield {
          type: 'pr',
          url: node.url,
          number: node.number,
          title: node.title,
          body: node.body ?? '',
          labels: node.labels.nodes.map((label) => label.name),
          author: node.author?.login,
        }
      } else {
        yield {
          type: 'commit',
          url: commit.html_url,
          sha: commit.sha,
          message: commit.commit.message,
          // author is the developer who wrote the code; committer is often web-flow for GitHub-merged PRs
          author: commit.author?.login ?? commit.committer?.login,
        }
      }
    }
  }

  for await (const commitsPage of commitsPaginator) {
    const commits = (commitsPage as unknown as Awaited<ReturnType<typeof octokit.repos.compareCommitsWithBasehead>>).data.commits
    for (const commit of commits) {
      batch.push(commit as unknown as CompareCommit)
      if (batch.length >= BATCH_SIZE) {
        yield* flushBatch()
      }
    }
  }

  yield* flushBatch()
}
