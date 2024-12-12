import {suite, test} from 'node:test';
import { findChanges } from "./index.ts";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
if (!GITHUB_TOKEN) throw "GITHUB_TOKEN is not defined"

suite(findChanges.toString(), () => {

  test('finds stuff', async () => {
    for await (const change of findChanges({
      token: GITHUB_TOKEN, 
      owner: 'jameslnewell',
      repo: 'github-changes',
      base: 'main',
      head: 'HEAD'
    })) {
      console.log(change)
    }
  })

})
