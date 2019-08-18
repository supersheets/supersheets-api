const func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
const { handler } = require('./lib/handler')

func.use(new ContextLoggerPlugin())
func.use(new StageVarsPlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new ResponsePlugin())

func.request(handler)

module.exports = {
  handler: coldHandler(func),
  func
}