/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type SearchPullRequestByShaQueryVariables = Exact<{
  q: string;
}>;


export type SearchPullRequestByShaQuery = { search: { nodes: Array<
      | { __typename: 'App' }
      | { __typename: 'Discussion' }
      | { __typename: 'Issue' }
      | { __typename: 'MarketplaceListing' }
      | { __typename: 'Organization' }
      | { __typename: 'PullRequest', number: number, title: string, body: string, url: string, author:
          | { login: string }
          | { login: string }
          | { login: string }
          | { login: string }
          | { login: string }
         | null, labels: { nodes: Array<{ name: string } | null> | null } | null }
      | { __typename: 'Repository' }
      | { __typename: 'User' }
     | null> | null } };
