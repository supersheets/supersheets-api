const axios = require('axios')

const func = require('@funcmaticjs/funcmatic')
const EventPlugin = require('@funcmaticjs/event-plugin')
const StageVarsPlugin = require('@funcmaticjs/stagevars-plugin')
const ParameterStorePlugin = require('@funcmaticjs/parameterstore-plugin')
const CorrelationPlugin = require('@funcmaticjs/correlation-plugin')
const LogLevelPlugin = require('@funcmaticjs/loglevel-plugin')
const ResponsePlugin = require('@funcmaticjs/response-plugin')
const DynamoDBCachePlugin = require('@funcmaticjs/dynamodb-cache-plugin')
const BodyParserPlugin = require('@funcmaticjs/bodyparser-plugin')
const { cacheHandler } = require('./lib/cache')

func.use(new EventPlugin())
func.use(new StageVarsPlugin())
func.use(new ParameterStorePlugin())
func.use(new CorrelationPlugin())
func.use(new LogLevelPlugin())
func.use(new BodyParserPlugin())
func.use(new ResponsePlugin())
func.use(new DynamoDBCachePlugin())

func.request(async (ctx, next) => {
  if (ctx.event.body && (typeof ctx.event.body === 'string')) {
    ctx.event.body = JSON.parse(ctx.event.body)
  }
  await next()
})
func.request(async (ctx, next) => {
  ctx.state.supersheets = axios.create({
    baseURL: ctx.env.SUPERSHEETS_BASE_URL,
    headers: Object.assign({ }, ctx.state.correlation || { })
    //timeout: 1000,
  });
  await next()
})
func.request(cacheHandler)

func.error(async (ctx) => {
  ctx.response.httperror((ctx.error.status || 500), `${ctx.error.message}`)
})

module.exports = {
  handler: func.handler(),
  func
}


