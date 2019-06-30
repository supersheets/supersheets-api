let func = require('@funcmaticjs/funcmatic')
const EventPlugin = require('@funcmaticjs/event-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
let { loadHandler } = require('./lib/load')
let axios = require('axios')

func.use(new EventPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new ResponsePlugin())
func.use(new MongoDBPlugin())

func.start(async (ctx) => {
  axios.defaults.baseURL = ctx.env.GOOGLESHEETS_BASE_URL
  axios.defaults.params = { }
  axios.defaults.params['key'] = ctx.env.GOOGLESHEETS_API_KEY
})

func.request(async (ctx, next) => {
  ctx.state.axios = axios
  await next()
})
func.request(loadHandler)

func.error(async (ctx) => {
  ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
})

module.exports = {
  handler: func.handler(),
  func
}


