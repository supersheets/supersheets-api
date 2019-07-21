const axios = require('axios')
const awsParamStore = require('aws-param-store')
const func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const EventPlugin = require('@funcmaticjs/event-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const Auth0Plugin = require('@funcmaticjs/auth0-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
const { getHandler } = require('./lib/get')

func.use(new ContextLoggerPlugin())
func.use(new EventPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new ResponsePlugin())
func.use(new Auth0Plugin())

func.request(async (ctx, next) => {
  if (!ctx.state.axios) {
    ctx.state.axios = axios.create({
      baseURL: `https://${ctx.env.FUNC_AUTH0_DOMAIN}/api/v2/users/`,
      headers: {
        'content-type': 'application/json'
      }
    })
  }
  await next()
})
func.request(async (ctx, next) => {
  if (!ctx.state.paramstore) {
    ctx.state.paramstore = awsParamStore
  }
  await next()
})
func.request(getHandler) 

func.error(async (ctx) => {
  ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
})

module.exports = {
  handler: coldHandler(func),
  func
}


