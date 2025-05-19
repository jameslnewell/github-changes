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

```
Release includes the following changes: 
 - #2 by @jameslnewell: test changes...
 - 7fb1a17d72ffa04ef03fdc95376ede7cb7119ad9 by @jameslnewell: iterating on tests...
```
