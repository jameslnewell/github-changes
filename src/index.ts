
interface PrChange {
  type: 'pr'
  url: string
  number: number
  title: string
  body: string
  labels: string[]
  author?: string
}

interface CommitChange {
  type: 'commit'
  url: string
  sha: string
  message: string
  author?: string
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
module.exports.findChanges = async function* findChanges({token, owner, repo, base, head}: FindChangesOptions): AsyncGenerator<Change> {
  const yieldedPrNumbers = new Set<number>()
  const {Octokit} = require('@octokit/rest')
  const octokit = new Octokit({ 
    auth: token,
  });

  // we could potentially make fewer requests using the strategy mentioned at https://github.com/orgs/community/discussions/73691 but then SHAs won't work
  const commitsPaginator = octokit.paginate.iterator(octokit.repos.compareCommitsWithBasehead, {
    owner, 
    repo,
    basehead: `${base}...${head}`
  })

  for await (const commitsPage of commitsPaginator) {
    const commits = (commitsPage as unknown as Awaited<ReturnType<typeof octokit.repos.compareCommitsWithBasehead>>).data.commits
    for (const commit of commits) {

          // find associated PRs
          const commitPullsResponse = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
            owner,
            repo,
            commit_sha: commit.sha,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })
          
          if (commitPullsResponse.data.length > 0) {
            for (const pull of commitPullsResponse.data) {
              // avoid yielding the same PR multiple times because many commits may be associated with a single PR
              if (yieldedPrNumbers.has(pull.number)) continue
              yieldedPrNumbers.add(pull.number)
      
              // TODO: filter whether the pull request is on the branch
              // if (pull.base.ref !== base) continue // TODO: otherwise just yield the commit
              yield {
                type: 'pr',
                url: pull.html_url,
                number: pull.number,
                title: pull.title,
                body: pull.body ?? '',
                labels: pull.labels.map(label => label.name),
                author: pull.user?.login
              }
            }
          } else {
            yield {
              type: 'commit',
              url: commit.html_url,
              sha: commit.sha,
              message: commit.commit.message,
              author: commit.committer?.login ?? commit.author?.login
            }
          }
    }
  }

}
