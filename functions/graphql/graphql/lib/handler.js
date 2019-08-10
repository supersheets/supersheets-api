const { ApolloServer } = require('apollo-server-lambda')
const { promisify } = require('util')
const { fetchSchema } = require('./schema')

async function handler(event, context) {
  // get the supersheetid
  // use it to fetch the graphql schema
  const id = event.pathParameters && event.pathParameters.spreadsheetid
  let typeDefs = null
  let resolvers = null
  try {
    schema = await fetchSchema(id)
    if (!schema) {
      return createError(404, `Could not find schema for id=${id}`) 
    }
    typeDefs = schema.typeDefs
    resolvers = schema.resolvers
  } catch (err) {
    return createError(500, `Error fetching schema for id=${id}: ${err.message}`) 
  }
  let handler = null
  try {
    handler = createApolloHandler(event, context, { typeDefs, resolvers })
  } catch (err) {
    return createError(500, `Error initializing GraphQL server: ${err.message}`)
  }
  return await handler(event, context)
}

function createApolloHandler(event, context, { typeDefs, resolvers }) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
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

function createError(statusCode, errorMessage) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache" ,
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ errorMessage }),
    isBase64Encoded: false
  }
}

module.exports = {
  handler
}