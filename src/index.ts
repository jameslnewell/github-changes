import {Octokit} from '@octokit/rest'

interface PrChange {
  type: 'pr'
}

interface CommitChange {
  type: 'commit'
}

type Change = PrChange | CommitChange

interface FindChangesOptions {
  token: string
  owner: string
  repo: string
  base: string
  head: string
}

/**
 * Find all changes to a repo since
 */
export async function* findChanges({token, owner, repo, base, head}: FindChangesOptions): AsyncGenerator<Change[]> {
  const octokit = new Octokit({ 
    auth: token,
  });

  const response = await octokit.repos.compareCommits({
    owner, 
    repo,
    base,
    head
  })

  for (const commit of response.data.commits) {
    console.log(commit)
  }

}
