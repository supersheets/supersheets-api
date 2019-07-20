const axios = require('axios')
const func = require('@funcmaticjs/funcmatic')
const ContextLoggerPlugin = require('@funcmaticjs/contextlogger-plugin')
const EventPlugin = require('@funcmaticjs/event-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const RedisPlugin = require('@funcmaticjs/redis-plugin')
const coldHandler = require('@funcmaticjs/forcecoldstart')
const RedisObjectCache = require('@funcmaticjs/redis-objectcache')
const { deleteHandler } = require('./lib/delete')

func.use(new ContextLoggerPlugin())
func.use(new EventPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new ResponsePlugin())
func.use(new RedisPlugin())

func.request(async (ctx, next) => {
  let headers = Object.assign({ }, ctx.state.correlation)
  if (ctx.event.headers['Authorization']) {
    headers['Authorization'] = ctx.event.headers['Authorization']
  }
  if (!ctx.state.supersheets) {
    ctx.state.supersheets = axios.create({
      baseURL: ctx.env.SUPERSHEETS_BASE_URL,
      headers
    })
  }
  await next()
})
func.request(async (ctx, next) => {
  ctx.state.cache = new RedisObjectCache(ctx.state.redis)
  await next()
})
func.request(deleteHandler)

func.error(async (ctx) => {
  ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
})

module.exports = {
  handler: coldHandler(func),
  func
}


