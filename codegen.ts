import type {CodegenConfig} from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'node_modules/@octokit/graphql-schema/schema.graphql',
  documents: 'src/queries/**/*.graphql',
  generates: {
    'src/__generated__/graphql.ts': {
      plugins: ['typescript-operations'],
      config: {
        useTypeImports: true,
        avoidOptionals: true,
        skipTypename: false,
        scalars: {
          URI: 'string',
          DateTime: 'string',
          GitObjectID: 'string',
          GitTimestamp: 'string',
          HTML: 'string',
          Base64String: 'string',
          BigInt: 'string',
          Date: 'string',
          PreciseDateTime: 'string',
          X509Certificate: 'string',
        },
      },
    },
  },
}

export default config
