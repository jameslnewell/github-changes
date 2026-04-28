import {suite, test} from 'node:test'
import {deepEqual} from 'node:assert'
import {findChanges} from './index.ts'
import type {Octokit} from '@octokit/rest'

interface MockCommit {
  sha: string
  html_url: string
  commit: {message: string}
  author: {login: string} | null
  committer: {login: string} | null
}

interface MockGraphQLNode {
  __typename: 'PullRequest'
  number: number
  title: string
  body: string | null
  url: string
  author: {login: string} | null
  labels: {nodes: Array<{name: string}>}
}

interface CreateMockOctokitOptions {
  commits: MockCommit[]
  prsBySha: Record<string, MockGraphQLNode>
}

function createMockOctokit({commits, prsBySha}: CreateMockOctokitOptions): Octokit {
  return {
    paginate: {
      iterator: () => {
        return (async function* () {
          yield {data: {commits}}
        })()
      },
    },
    repos: {compareCommitsWithBasehead: () => undefined},
    graphql: async (_query: string, variables: Record<string, string>) => {
      const result: Record<string, {nodes: MockGraphQLNode[]}> = {}
      for (const [key, value] of Object.entries(variables)) {
        const shaMatch = value.match(/sha:(\S+)/)
        const sha = shaMatch?.[1] ?? ''
        const alias = key.replace(/^q/, 's')
        const pr = prsBySha[sha]
        result[alias] = {nodes: pr ? [pr] : []}
      }
      return result
    },
  } as unknown as Octokit
}

async function toArray<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const entries: T[] = []
  for await (const entry of iterator) {
    entries.push(entry)
  }
  return entries
}

suite('findChanges', () => {
  test('returns an empty array when there are no commits', async () => {
    const octokit = createMockOctokit({commits: [], prsBySha: {}})
    const entries = await toArray(findChanges({octokit, owner: 'o', repo: 'r', base: 'a', head: 'b'}))
    deepEqual(entries, [])
  })

  test('returns a commit when no PR is associated', async () => {
    const sha = 'abc123'
    const octokit = createMockOctokit({
      commits: [{
        sha,
        html_url: `https://github.com/o/r/commit/${sha}`,
        commit: {message: 'direct push to main'},
        author: {login: 'alice'},
        committer: {login: 'web-flow'},
      }],
      prsBySha: {},
    })
    const entries = await toArray(findChanges({octokit, owner: 'o', repo: 'r', base: 'a', head: 'b'}))
    deepEqual(entries, [{
      type: 'commit',
      url: `https://github.com/o/r/commit/${sha}`,
      sha,
      message: 'direct push to main',
      author: 'alice',
    }])
  })

  test('prefers commit author over committer (web-flow fix from 0.2.6)', async () => {
    const sha = 'def456'
    const octokit = createMockOctokit({
      commits: [{
        sha,
        html_url: `https://github.com/o/r/commit/${sha}`,
        commit: {message: 'fix: thing'},
        author: {login: 'real-dev'},
        committer: {login: 'web-flow'},
      }],
      prsBySha: {},
    })
    const entries = await toArray(findChanges({octokit, owner: 'o', repo: 'r', base: 'a', head: 'b'}))
    deepEqual(entries[0]?.author, 'real-dev')
  })

  test('returns a PR when the search resolves the commit', async () => {
    const sha = 'ghi789'
    const octokit = createMockOctokit({
      commits: [{
        sha,
        html_url: `https://github.com/o/r/commit/${sha}`,
        commit: {message: 'feat: thing (#42)'},
        author: {login: 'web-flow'},
        committer: {login: 'web-flow'},
      }],
      prsBySha: {
        [sha]: {
          __typename: 'PullRequest',
          number: 42,
          title: 'feat: thing',
          body: 'description',
          url: 'https://github.com/o/r/pull/42',
          author: {login: 'real-dev'},
          labels: {nodes: [{name: 'enhancement'}]},
        },
      },
    })
    const entries = await toArray(findChanges({octokit, owner: 'o', repo: 'r', base: 'a', head: 'b'}))
    deepEqual(entries, [{
      type: 'pr',
      url: 'https://github.com/o/r/pull/42',
      number: 42,
      title: 'feat: thing',
      body: 'description',
      labels: ['enhancement'],
      author: 'real-dev',
    }])
  })

  test('dedupes PRs across commits in the same batch', async () => {
    const pr: MockGraphQLNode = {
      __typename: 'PullRequest',
      number: 7,
      title: 'multi-commit pr',
      body: '',
      url: 'https://github.com/o/r/pull/7',
      author: {login: 'dev'},
      labels: {nodes: []},
    }
    const octokit = createMockOctokit({
      commits: [
        {sha: 'aaa', html_url: 'https://github.com/o/r/commit/aaa', commit: {message: 'a'}, author: {login: 'dev'}, committer: null},
        {sha: 'bbb', html_url: 'https://github.com/o/r/commit/bbb', commit: {message: 'b'}, author: {login: 'dev'}, committer: null},
      ],
      prsBySha: {aaa: pr, bbb: pr},
    })
    const entries = await toArray(findChanges({octokit, owner: 'o', repo: 'r', base: 'a', head: 'b'}))
    deepEqual(entries.length, 1)
    deepEqual(entries[0]?.type, 'pr')
  })

  test('batches across more than BATCH_SIZE commits', async () => {
    // 25 commits => two GraphQL batches of size 20 + 5
    const commits: MockCommit[] = Array.from({length: 25}, (_, i) => ({
      sha: `sha${i}`,
      html_url: `https://github.com/o/r/commit/sha${i}`,
      commit: {message: `commit ${i}`},
      author: {login: 'dev'},
      committer: null,
    }))
    const prsBySha: Record<string, MockGraphQLNode> = {}
    for (let i = 0; i < 25; i++) {
      prsBySha[`sha${i}`] = {
        __typename: 'PullRequest',
        number: i + 100,
        title: `pr ${i}`,
        body: '',
        url: `https://github.com/o/r/pull/${i + 100}`,
        author: {login: 'dev'},
        labels: {nodes: []},
      }
    }
    const octokit = createMockOctokit({commits, prsBySha})
    const entries = await toArray(findChanges({octokit, owner: 'o', repo: 'r', base: 'a', head: 'b'}))
    deepEqual(entries.length, 25)
    deepEqual(entries.every((e) => e.type === 'pr'), true)
  })
})
