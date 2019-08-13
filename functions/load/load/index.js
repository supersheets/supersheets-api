const awsParamStore = require('aws-param-store')
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
let { loadHandler, findMetadata, findStatus, setUser, setGoogle, fetchServiceToken } = require('./lib/load')

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
func.request(async (ctx, next) => {
  if (!ctx.state.paramstore) {
    ctx.state.paramstore = awsParamStore
  }
  await next()
})
func.request(setUser)
func.request(setGoogle)
func.request(findMetadata)
func.request(findStatus)
func.request(fetchServiceToken)
func.request(loadHandler)

// func.error(async (ctx) => {
//   ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
// })

module.exports = {
  handler: coldHandler(func),
  func
}



