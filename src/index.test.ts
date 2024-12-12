import {suite, test} from 'node:test';
import {deepEqual, equal} from 'node:assert'
import { findChanges } from "./index.ts";

const token = process.env.GITHUB_TOKEN
if (!token) throw "GITHUB_TOKEN is not defined"
const owner = 'jameslnewell'
const repo = 'github-changes'

async function toArray<T>(iterator: AsyncGenerator<T>): Promise<T[]> {
  const entries: T[] = []
  for await (const entry of iterator) {
    entries.push(entry)
  }
  return entries
}

suite(findChanges.name, () => {

  test('returns an empty array', async () => {
    const entries = await toArray(findChanges({
      token, 
      owner,
      repo,
      base: 'test-no-changes-base',
      head: 'test-no-changes-head'
    }))
    equal(entries.length, 0)
  })

  test('returns a single commit', async () => {
    const entries = await toArray(findChanges({
      token, 
      owner,
      repo,
      base: 'test-single-commit-base',
      head: 'test-single-commit-head'
    }))
    deepEqual(entries, [
      {
        author: 'jameslnewell',
        message: 'iterating on tests',
        type: 'commit',
        url: 'https://github.com/jameslnewell/github-changes/commit/7fb1a17d72ffa04ef03fdc95376ede7cb7119ad9'
      }
    ])
  }) 

  test('returns a single PR', async () => {
    const entries = await toArray(findChanges({
      token, 
      owner,
      repo,
      base: 'test-single-pr-base',
      head: 'test-single-pr-head'
    }))
    deepEqual(entries,     [
      {
        author: 'jameslnewell',
        body: '',
        labels: [],
        number: 2,
        title: 'test changes',
        type: 'pr',
        url: 'https://github.com/jameslnewell/github-changes/pull/2'
      }
    ])
  })

}) 
  