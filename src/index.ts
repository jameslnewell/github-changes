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
export async function* findChanges({token, owner, repo, base, head}: FindChangesOptions): AsyncGenerator<Change> {
  const octokit = new Octokit({ 
    auth: token,
  });

  const compareCommitsResponse = await octokit.repos.compareCommits({
    owner, 
    repo,
    base,
    head
  })

  for (const commit of compareCommitsResponse.data.commits) {
    console.log('COMMIT')
    console.log(commit)

    const commitPullsResponse = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
      owner,
      repo,
      commit_sha: commit.sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    console.log('PULLS')
    console.log(commitPullsResponse.data)
    if (commitPullsResponse.data.length === 0) {
      yield {
        type: 'commit',
      }
    } else {
      yield {
        type: 'pr'
      }
    }
  }

}
