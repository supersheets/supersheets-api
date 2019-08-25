const { ApolloServer } = require('apollo-server-lambda')
const { promisify } = require('util')
const { fetchSchema } = require('./schema')

async function handler(ctx) {
  let id = ctx.event.pathParameters && ctx.event.pathParameters.spreadsheetid
  let typeDefs = null
  let resolvers = null
  try {
    schema = await fetchSchema(ctx.state.axios)
    if (!schema) {
      return ctx.response.httperror(404, `Could not find schema for id=${id}`) 
    }
    typeDefs = schema.typeDefs
    resolvers = schema.resolvers
  } catch (err) {
    return ctx.response.httperror(500, `Error fetching schema for id=${id}: ${err.message}`) 
  }
  let handler = null
  try {
    handler = createApolloHandler(ctx.event, ctx.context, { typeDefs, resolvers })
  } catch (err) {
    return ctx.response.httperror(500, `Error initializing GraphQL server: ${err.message}`)
  }
  // Kind of a hack here. Since apollo-graphql creates its own independent response
  // we just replace ctx.response rather than using the plugin e.g. ctx.response.json(...)
  ctx.response = await handler(ctx.event, ctx.context)
  return
}

function createApolloHandler(event, context, { typeDefs, resolvers }) {
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

module.exports = {
  handler
}