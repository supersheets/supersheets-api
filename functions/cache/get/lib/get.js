async function getHandler(ctx) {
  let cache = ctx.state.cache
  let id = ctx.event.pathParameters.spreadsheetid
  let includeValues = (ctx.event.queryStringParameters.values === 'true')
  let key = cachekey(id)
  try {
    let ttl = await cache.ttl(key)
    let exists = (ttl != -2)
    if (!exists) {
      ctx.logger.warn(`Key ${key} does not exist in cache`)
      ctx.response.httperror(404, `Not Found: Key ${key} does not exist in cache`)
      return
    }
    let n = await cache.hlen(key)
    let ret = {
      key,
      ttl,
      n
    }
    if (includeValues) {
      let values = await cache.hgetall(key)
      ret.values = values
    }
    ctx.response.json(ret)
  } catch (err) {
    ctx.logger.error(err)
    ctx.response.httperror(500, `Internal Server Error: ${err.message}`)
  }
  return
}
  
function cachekey(id) {
  return `supersheets:sheet:${id}:find`
}

module.exports = {
  getHandler
}