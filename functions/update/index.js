const func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const EventPlugin = require('@funcmaticjs/event-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const Auth0Plugin = require('@funcmaticjs/auth0-plugin')
const JWKSPlugin = require('@funcmaticjs/jwks-plugin')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const BodyParserPlugin = require('@funcmaticjs/bodyparser-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
const { updateHandler } = require('./lib/update')
const axios = require('axios')

func.use(new ContextLoggerPlugin())
func.use(new EventPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new BodyParserPlugin())
func.use(new ResponsePlugin())
func.use(new JWKSPlugin())
func.use(new Auth0Plugin())
func.use(new MongoDBPlugin())

func.start(async (ctx) => {
  axios.defaults.baseURL = ctx.env.GOOGLESHEETS_BASE_URL
  axios.defaults.params = { }
  axios.defaults.params['key'] = ctx.env.GOOGLESHEETS_API_KEY
})

// Parse JSON body just in case Content-Type wasn't set to application/json
func.request(async (ctx, next) => {
  if (ctx.event.body && (typeof ctx.event.body === 'string')) {
    ctx.event.body = JSON.parse(ctx.event.body)
  }
  await next()
})

// Set axios already configured with Google sheets base url and our API key
func.request(async (ctx, next) => {
  ctx.state.axios = axios
  await next()
})

func.request(updateHandler)

func.error(async (ctx) => {
  ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
})

module.exports = {
  handler: coldHandler(func),
  func
}


