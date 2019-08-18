// https://github.com/prisma/graphql-playground/blob/master/packages/graphql-playground-middleware-lambda/examples/basic/handler.js
// or using require()
const playground = require('graphql-playground-middleware-lambda').default
const { promisify } = require('util')

async function handler(ctx) {
  let event = ctx.event
  let context = ctx.context
  ctx.logger.info(`EVENT: ${JSON.stringify(event, null, 2)}`)
  // get the supersheetid
  // use it to fetch the graphql schema
  const id = event.pathParameters && event.pathParameters.spreadsheetid
  
  try {
    handler = createPlaygroundHandler(ctx, id)
  } catch (err) {
    return ctx.response.httperror(500, `Error initializing GraphQL Playground: ${err.message}`)
  }
  // Kind of a hack here. Since apollo-graphql creates its own independent response
  // we just replace ctx.response rather than using the plugin e.g. ctx.response.json(...)
  ctx.response = await handler(event, context)
  return
}

function createPlaygroundHandler(ctx, id) {
  return promisify(playground({
    endpoint: `/dev/${id}/graphql`,
    //config: getConfig(ctx),
    settings: getSettings(ctx),
    //tabs: getTabs(ctx)
  }))
}

module.exports = {
  handler
}

function getConfig(ctx) {
  if (ctx.event.queryStringParameters && ctx.event.queryStringParameters['config']) {
    return decodeAndParse(ctx.event.queryStringParameters['config'])
  }
  return defaultConfig()
}

function getSettings(ctx) {
  if (ctx.event.queryStringParameters && ctx.event.queryStringParameters['settings']) {
    return decodeAndParse(ctx.event.queryStringParameters['settings'])
  }
  return defaultSettings()
}

function getTabs() {
  if (ctx.event.queryStringParameters && ctx.event.queryStringParameters['tabs']) {
    return decodeAndParse(ctx.event.queryStringParameters['config'])
  }
  return defaultTabs()
}

function decodeAndParse(data) {
  let buff = new Buffer(data, 'base64')
  return JSON.parse(buff.toString('utf8'))
}

function defaultSettings() {
  return {
    "editor.cursorShape": "line",
    "editor.fontFamily": "'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace",
    "editor.fontSize": 14,
    "editor.reuseHeaders": true,
    "editor.theme": "dark",
    "general.betaUpdates": false,
    "prettier.printWidth": 80,
    "prettier.tabWidth": 2,
    "prettier.useTabs": false,
    "request.credentials": "omit",
    "schema.disableComments": true,
    "schema.polling.enable": true,
    "schema.polling.endpointFilter": "*localhost*",
    "schema.polling.interval": 2000,
    "tracing.hideTracingResponse": true
  }
}

function defaultConfig() {
  return null
}

function defaultTabs() {
  return null
}