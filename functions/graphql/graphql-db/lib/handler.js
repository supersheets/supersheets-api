const { ApolloServer } = require('apollo-server-lambda')
const { promisify } = require('util')
const { generate } = require('./schema')
const { createResolvers } = require('./resolvers')
const { createLoader } = require('./dataloader')

async function findMetadata(ctx, next) {
  if (ctx.state.metadata) {
    return await next()
  }
  let id = ctx.event.pathParameters && ctx.event.pathParameters.spreadsheetid
  let db = ctx.state.mongodb
  let metadata = await db.collection('spreadsheets').findOne({ id })
  if (!metadata || !metadata.id) {
    throw new Error(`Not Found: Supersheet with id ${id} could not be found`)
  }
  ctx.state.metadata = metadata
  return await next()
}

async function handler(ctx) {
  ctx.logger.info(`EVENT ${JSON.stringify(ctx.event, null, 2)}`)
  ctx.logger.info(`CONTEXT ${JSON.stringify(ctx.context, null, 2)}`)
  let metadata = ctx.state.metadata 
  let typeDefs = null
  let resolvers = null
  let db = ctx.state.mongodb
  try {
    typeDefs = ctx.state.typeDefs || generate(metadata) // await fetchSchema(ctx.state.axios)  // so we can inject typeDefs in unit testing
    if (!typeDefs) {
      return ctx.response.httperror(404, `Could not find schema for id=${metadata.id}`) 
    }
    resolvers = createResolvers({ typeDefs, metadata })
  } catch (err) {
    ctx.logger.error(err)
    return ctx.response.httperror(500, `Error fetching schema for id=${metadata.id}: ${err.message}`) 
  }
  let collection = db.collection(metadata.datauuid)
  let loader = createLoader(collection, { logger: ctx.logger }) // we just create 1 loader which all GraphQL queries can use 
  let handler = null
  try {
    handler = createApolloHandler(ctx.event, ctx.context, { typeDefs, resolvers, collection, loader, logger: ctx.logger })
  } catch (err) {
    ctx.logger.error(err)
    return ctx.response.httperror(500, `Error initializing GraphQL server: ${err.message}`)
  }
  // Kind of a hack here. Since apollo-graphql creates its own independent response
  // we just replace ctx.response rather than using the plugin e.g. ctx.response.json(...)
  ctx.response = await handler(ctx.event, ctx.context)
  return
}

function createApolloHandler(event, context, { typeDefs, resolvers, collection, loader, logger }) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
    introspection: true,
    context: ({ event, context }) => ({
      headers: event.headers,
      functionName: context.functionName,
      collection,
      logger,
      loader,
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
  handler,
  //setupSupersheetsApi,
  findMetadata
}