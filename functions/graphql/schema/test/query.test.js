const { ApolloServer } = require('apollo-server-lambda')
const { promisify } = require('util')
const { generate } = require('../lib/schema') 


let metadata = {
  schema: {
    columns: [
      {"name":"letter","datatype":"String","sample":"A","sheets":["data"]},
      {"name":"value","datatype":"Number","sample":65,"sheets":["data"]},
      {"name":"doc","datatype":"GoogleDoc","sample":{ hello: "world" },"sheets":["data"]}
    ],
    docs: {
      doc: {
        name: "doc",
        fields: [ 
          { name: "hello", datatype: "String", sample: "world" }
        ]
      }
    }
  }
}

describe('Query', () => {
  it ('should exec a query', async () => {
    let query = `
    { find (filter: { letter: { eq: "A" } } ) { 
      edges {
        node {
          letter
        }
      } 
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    } }
    `
    //let typeDefs = generate(metadata, { name: "Letter" })
    let typeDefs = generate(metadata)
    let handler = createApolloHandler({ 
      typeDefs, 
      resolvers: createResolvers() })
    let data = await execQuery(handler, query)
    console.log("Data", JSON.stringify(data, null, 2))
  })
})

async function execQuery(handler, query) {
  let { event, context } = createTestEvent(query) 
  return await handler(event, context)
}

 
// GraphQL resolver map
// https://www.apollographql.com/docs/apollo-server/data/data/#resolver-map

function createResolvers() {
  return {
    Query: {
      find: async (parent, args, context, info) => {
        console.log("RESOLVER: PARENT", JSON.stringify(parent, null , 2))
        console.log("RESOLVER: ARGS", JSON.stringify(args, null , 2))
        console.log("RESOLVER: CONTEXT", JSON.stringify(context, null , 2))
        // should execute the mongo query 
        let query = args
        return query
      },
      findOne: async (parent, args, context, info) => {
        return { letter: 'a', value: 1 }
      }
    },
    RowConnection: {
      pageInfo: async(query) => {
        console.log("RowConnection.pageInfo", JSON.stringify(query))
        return {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null
        }
      },
      totalCount: async(query) => {
        console.log("RowConnection.totalCount", JSON.stringify(query))
        return 2
      },
      edges: async (query) => {
        console.log("RowConnection.edges", JSON.stringify(query))
        return [ 
            { node: { letter: 'a', value: 1 } },
            { node: { letter: 'a', value: 1 } }
        ]
      }
    }
  }
}

function createTestEvent(query, variables) {
  variables = variables || null;
  return {
    event: {
      httpMethod: "POST",
      body: JSON.stringify({ query, variables })
    },
    context: { }
  }
}

function createApolloHandler({ typeDefs, resolvers }) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
      //   {
      //     'editor.theme': 'light',
      //   },
      //   tabs: [
      //     {
      //       endpoint,
      //       query: defaultQuery,
      //     },
      //   ],
      // },
    introspection: true,
    context: ({ event, context }) => ({
      headers: event.headers,
      functionName: context.functionName,
      event,
      context,
    })
  })
  return promisify(server.createHandler({
    cors: {
      origin: '*',
      credentials: true,
    },
  }))
}