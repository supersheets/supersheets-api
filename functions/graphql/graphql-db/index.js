const func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
const { handler, findMetadata } = require('./lib/handler')

func.use(new ContextLoggerPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new ResponsePlugin())
func.use(new MongoDBPlugin())

func.error(async (ctx, next) => {
  ctx.logger.error(ctx.error)
})
func.request(findMetadata)
func.request(handler)

module.exports = {
  handler: coldHandler(func),
  func
}