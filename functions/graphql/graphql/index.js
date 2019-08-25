const axios = require('axios')
const func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
const { handler } = require('./lib/handler')

func.use(new ContextLoggerPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new ResponsePlugin())

func.request(async (ctx, next) => {
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
})
func.request(handler)

module.exports = {
  handler: coldHandler(func),
  func
}