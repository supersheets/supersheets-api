const { ApolloServer } = require('apollo-server-lambda')
const { promisify } = require('util')
const { generate } = require('../lib/schema') 

let metadata = {
  schema: {
    columns: [
      {"name":"letter","datatype":"String","sample":"A","sheets":["data"]},
      {"name":"value","datatype":"Int","sample":65,"sheets":["data"]},
      {"name":"content","datatype":"GoogleDoc","sample":{ hello: "world" },"sheets":["data"]}
    ],
    docs: {
      "content": {
        name: "content",
        fields: [ 
          { name: "hello", datatype: "String", sample: "world" }
        ]
      }
    }
  },
  sheets: [ {
    title: "Posts",
    schema: {
      columns: [
        { name: "_id", datatype: "String" },
        {"name":"letter","datatype":"String","sample":"A","sheets":["data"]},
        {"name":"value","datatype":"Int","sample":65,"sheets":["data"]},
        { name: "title", datatype: "String" },
        { name: "content", datatype: "GoogleDoc" },
        { name: "published", datatype: "Datetime" },
        { name: "author_email", datatype: "String" }
      ],
      docs: {
        'content': {
          fields: [ 
            { name: "body", datatype: "String" },
            { name: "description", datatype: "String" } 
          ]
        }
      }
    }
  }, {
    title: "Authors",
    schema: {
      columns: [
        { name: "_id", datatype: "String" },
        { name: "name", datatype: "String" },
        { name: "email", datatype: "String" }
      ]
    }
  } ]
}

describe('Query', () => {
  it ('should exec a Row query', async () => {
    let query = `
    { findPosts (filter: { letter: { eq: "A" } } ) { 
      rows {
        row {
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
    let typeDefs = generate(metadata)
    let handler = createApolloHandler({ 
      typeDefs, 
      resolvers: createResolvers() })
    let data = JSON.parse((await execQuery(handler, query)).body)
    expect(data).toEqual({
      "data": {
        "findPosts": {
          "rows": [
            {
              "row": {
                "letter": "a"
              }
            },
            {
              "row": {
                "letter": "a"
              }
            }
          ],
          "totalCount": 2,
          "pageInfo": {
            "hasNextPage": false,
            "hasPreviousPage": false,
            "startCursor": null,
            "endCursor": null
          }
        }
      }
    })
  })
  it ('should exec a sheet specific query', async () => {
    let query = `
    { findPosts (filter: { title: { eq: "Hello World" } } ) { 
      rows {
        row {
          title
        }
      } 
    } }
    `
    let typeDefs = generate(metadata)
    let handler = createApolloHandler({ 
      typeDefs, 
      resolvers: createResolvers() })
    let data = JSON.parse((await execQuery(handler, query)).body)
    expect(data).toEqual({
      "data": {
        "findPosts": {
          "rows": [
            {
              "row": {
                "title": "Hello World"
              }
            },
            {
              "row": {
                "title": null
              }
            }
          ]
        }
      }
    })
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
      // find: async (parent, args, context, info) => {
      //   // should execute the mongo query 
      //   let query = args
      //   return query
      // },
      // findOne: async (parent, args, context, info) => {
      //   return { letter: 'a', value: 1 }
      // },
      findPosts: async (parent, args, context, info) => {
        let query = args
        query["_sheet"] = "Posts"
        return query
      },
      findOnePosts: async (parent, args, context, info) => {
        return { letter: 'a', value: 1 }
      }
    },
    // RowsConnection: {
    //   pageInfo: async(query) => {
    //     return {
    //       hasNextPage: false,
    //       hasPreviousPage: false,
    //       startCursor: null,
    //       endCursor: null
    //     }
    //   },
    //   totalCount: async(query) => {
    //     return 2
    //   },
    //   rows: async (query) => {
    //     return [ 
    //       { row: { letter: 'a', value: 1 } },
    //       { row: { letter: 'a', value: 1 } }
    //     ]
    //   }
    // },
    PostsConnection: {
      pageInfo: async(query) => {
        return {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null
        }
      },
      totalCount: async(query) => {
        return 2
      },
      rows: async (query) => {
        return [
          { row: { title: "Hello World", letter: "a", value: 1 } },
          { row: { letter: "a", value: 1 } }
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