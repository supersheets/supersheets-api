let func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const EventPlugin = require('@funcmaticjs/event-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const BodyParserPlugin = require('@funcmaticjs/bodyparser-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
let { setUser, setAuthorizationToken, setSheetsAPI, setDocsAPI } = require('./lib/auth')
let { metaHandler, saveMetaHandler } = require('./lib/meta')
let { findStatusHandler, errorStatusHandler } = require('./lib/status')
let { loadHandler, findMetadata, findStatus } = require('./lib/load')

func.use(new ContextLoggerPlugin())
func.use(new EventPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new BodyParserPlugin())
func.use(new MongoDBPlugin())

func.request(async (ctx, next) => {
  ctx.logger.info(`EVENT ${JSON.stringify(ctx.event, null, 2)}`)
  ctx.logger.info(`CONTEXT ${JSON.stringify(ctx.context, null, 2)}`)
  await next()
})

// Status
func.request(findStatusHandler)

// Auth Middleware
func.request(setUser)
func.request(setAuthorizationToken)
func.request(setSheetsAPI)
func.request(setDocsAPI)

// Metadata 
func.request(metaHandler)

// Load
func.request(loadHandler)

// Save Metadata
func.request(saveMetaHandler)

// Save Status
func.request(successStatusHandler)


// Uncaught error handler should
// always attempt to update the status
// object indicating that the load failed 
func.error(errorStatusHandler)

// func.error(async (ctx) => {
//   ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
// })

module.exports = {
  handler: coldHandler(func),
  func
}

