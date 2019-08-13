let func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const EventPlugin = require('@funcmaticjs/event-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const Auth0Plugin = require('@funcmaticjs/auth0-plugin')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
let { loadHandler } = require('./lib/load')
let axios = require('axios')

func.use(new ContextLoggerPlugin())
func.use(new EventPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new ResponsePlugin())
func.use(new Auth0Plugin())
func.use(new MongoDBPlugin())

func.start(async (ctx) => {
  axios.defaults.baseURL = ctx.env.GOOGLESHEETS_BASE_URL
  axios.defaults.params = { }
  axios.defaults.params['key'] = ctx.env.GOOGLESHEETS_API_KEY
})

func.request(async (ctx, next) => {
  if (!ctx.state.axios) {
    // this lets us mock axios in unit testing
    // by injecting ctx.state.axios beforehand
    ctx.state.axios = axios
  }
  await next()
})
func.request(loadHandler)

func.error(async (ctx) => {
  ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
})

module.exports = {
  handler: coldHandler(func),
  func
}


