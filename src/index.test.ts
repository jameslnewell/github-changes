import {suite, test} from 'node:test';
import { findChanges } from "./index.ts";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
if (!GITHUB_TOKEN) throw "GITHUB_TOKEN is not defined"

suite(findChanges.name, () => {

  test('log stuff', async () => {
    for await (const change of findChanges({
      token: GITHUB_TOKEN, 
      owner: 'jameslnewell',
      repo: 'github-changes',
      base: 'bc94bc5c96784b3e616dae9415da5536c9a4b719',
      head: 'HEAD'
    })) {
      console.log(change)
    }
  })

})
 