const axios = require('axios')
const { ApolloServer } = require('apollo-server-lambda')
const { promisify } = require('util')
const { fetchSchema, createResolvers } = require('./schema')

async function setupSupersheetsApi(ctx, next) {
  let id = ctx.event.pathParameters && ctx.event.pathParameters.spreadsheetid
  if (!ctx.state.axios) {
    ctx.state.axios = axios.create({
      baseURL: `${ctx.env.SUPERSHEETS_BASE_URL}${id}`,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }
  return await next()
}

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
  let metadata = ctx.state.metadata 
  let typeDefs = null
  let resolvers = null
  let db = ctx.state.mongodb
  try {
    typeDefs = await fetchSchema(ctx.state.axios)
    if (!typeDefs) {
      return ctx.response.httperror(404, `Could not find schema for id=${metadata.id}`) 
    }
    resolvers = createResolvers()
  } catch (err) {
    ctx.logger.error(err)
    return ctx.response.httperror(500, `Error fetching schema for id=${metadata.id}: ${err.message}`) 
  }
  let collection = db.collection(metadata.datauuid)
  let handler = null
  try {
    handler = createApolloHandler(ctx.event, ctx.context, { typeDefs, resolvers, collection, logger: ctx.logger })
  } catch (err) {
    ctx.logger.error(err)
    return ctx.response.httperror(500, `Error initializing GraphQL server: ${err.message}`)
  }
  // Kind of a hack here. Since apollo-graphql creates its own independent response
  // we just replace ctx.response rather than using the plugin e.g. ctx.response.json(...)
  ctx.response = await handler(ctx.event, ctx.context)
  return
}

function createApolloHandler(event, context, { typeDefs, resolvers, collection, logger }) {
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
  setupSupersheetsApi,
  findMetadata
}