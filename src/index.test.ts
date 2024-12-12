import {suite, test} from 'node:test';
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
    console.log(entries)
  })

  test('returns a single commit', async () => {
    const entries = await toArray(findChanges({
      token, 
      owner,
      repo,
      base: 'test-single-commit-base',
      head: 'test-single-commit-head'
    }))
    console.log(entries)
  })

  test('returns a single PR', async () => {
    const entries = await toArray(findChanges({
      token, 
      owner,
      repo,
      base: 'test-single-commit-base',
      head: 'test-single-commit-head'
    }))
    console.log(entries)
  })

})
