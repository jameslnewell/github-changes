# @jameslnewell/github-changes

Library for finding changes (PRs or commits) between two `git` refs.

## Installation

```console
npm i -S @jameslnewell/github-changes
```

## Usage

```ts
import { findChanges } from '@jameslnewell/github-changes'

function printReleaseInformation() {
  console.log('Release includes the following changes: ')
  for await (const change of findChanges({
    token, 
    owner,
    repo,
    base: 'last-release',
    head: 'main'
  })) {
    if (change.type === 'pr') {
      console.log(` - #${change.number} by @${change.author}: ${change.title}...`)
    } else {
      console.log(` - ${change.sha} by @${change.author}: ${change.message.substr(0, 100)}...`)
    }
  }
}
```

## Octokit configuration

Pass an `Octokit` instance configured with `@octokit/plugin-retry` and `@octokit/plugin-throttling` so the library handles GitHub's secondary rate limits gracefully — the Search API used to resolve commits to PRs has a 30-requests-per-minute cap.

```ts
import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

const ThrottledOctokit = Octokit.plugin(retry, throttling)
const octokit = new ThrottledOctokit({
  auth: process.env.GITHUB_TOKEN,
  throttle: {
    onRateLimit: (retryAfter, _options, _octokit, retryCount) => retryCount < 3,
    onSecondaryRateLimit: (retryAfter, _options, _octokit, retryCount) => retryCount < 3,
  },
})
```

```
Release includes the following changes: 
 - #2 by @jameslnewell: test changes...
 - 7fb1a17d72ffa04ef03fdc95376ede7cb7119ad9 by @jameslnewell: iterating on tests...
```
