// https://github.com/prisma/graphql-playground/blob/master/packages/graphql-playground-html/src/render-playground-page.ts
// Seems to document the different configuration types
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
  const id = getSpreadsheetId(ctx)
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
  let endpoint = `/${getStage(ctx)}/${id}/graphql`
  ctx.logger.info(`ENDPOINT ${endpoint}`)
  let tabs = getTabs(ctx)
  ctx.logger.info(`TABS ${JSON.stringify(tabs, null, 2)}`)
  let settings = getSettings(ctx)
  ctx.logger.info(`SETTINGS ${JSON.stringify(settings, null, 2)}`)
  return promisify(playground({
    endpoint,
    settings,
    tabs
  }))
}

module.exports = {
  handler
}

function getSettings(ctx) {
  if (ctx.event.queryStringParameters && ctx.event.queryStringParameters['settings']) {
    return decodeAndParse(ctx.event.queryStringParameters['settings'])
  }
  return defaultSettings()
}

function getTabs(ctx) {
  if (ctx.event.queryStringParameters && ctx.event.queryStringParameters['tabs']) {
    return decodeAndParse(ctx.event.queryStringParameters['tabs'])
  }
  return defaultTabs(ctx)
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

// export interface Tab {
//   endpoint: string
//   query: string
//   name?: string
//   variables?: string
//   responses?: string[]
//   headers?: { [key: string]: string }
// }
function defaultTabs(ctx) {
  return [ {
    name: 'find',
    endpoint: getGraphQLEndpoint(ctx, true),
    query: DEFAULT_QUERY.trim()
  } ]
}

/*
# return 'letter' and the 'value' for all data where letter equals "A"
query {
  find(filter: { letter: { eq: "A" } }) {
    letter
    value
  }
}
*/

function getSpreadsheetId(ctx) {
  return ctx.event.pathParameters && ctx.event.pathParameters.spreadsheetid || null
}

function getGraphQLEndpoint(ctx, full) {
  if (full) {
    return `${ctx.env.SUPERSHEETS_BASE_URL}${getSpreadsheetId(ctx)}/graphql`
  } 
  return `/${getStage(ctx)}/${getSpreadsheetId(ctx)}/graphql`
}

function getStage(ctx) {
  return ctx.env.SUPERSHEETS_BASE_URL.split('/')[3] // https://api.supersheets.io/dev/
}

function decodeAndParse(data) {
  let buff = new Buffer(data, 'base64')
  return JSON.parse(buff.toString('utf8'))
}

const DEFAULT_QUERY = `
# return _id, _row, and _sheet for all records with _row less than 10
query {
  find(filter: { _row: { lt: 10 } }) {
    _id
    _row
    _sheet
  }
}
`