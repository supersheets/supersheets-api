const crypto = require('crypto')

async function cacheHandler(ctx) {
  let id = ctx.event.pathParameters['spreadsheetid']
  let body = ctx.event.body

  let key = cachekey(id, body)
  // await check
  ctx.logger.debug(`GET ${key}`)
  let data = null 
  try {
    data = await ctx.state.cache.get(key) 
  } catch (err) {
    ctx.logger.error(err)
  }
  if (!data) {
    try { 
      ctx.logger.debug(`MISS ${key}`)
      data = (await ctx.state.supersheets.post(`${id}/find`, body)).data
      await ctx.state.cache.set(key, data, ctx.env.FUNC_DYNAMODB_CACHE_EXPIRES)
      ctx.logger.debug(`SET ${key} ${ctx.env.FUNC_DYNAMODB_CACHE_EXPIRES}`)
      ctx.logger.trace(`DATA=${JSON.stringify(data, null, 2)}`)
    } catch (err) {
      console.log(err)
      ctx.logger.error(err)
    }
  } else {
    ctx.logger.debug(`HIT ${key}`)
  }
  ctx.response.json(data)
  return
}

function cachekey(id, body) {
  // https://medium.com/@chris_72272/what-is-the-fastest-node-js-hashing-algorithm-c15c1a0e164e
  let prefix = 'supersheets:find'
  let key = crypto.createHash('sha1').update(JSON.stringify({ id, body })).digest('base64')
  return `${prefix}:${key}`
}

module.exports = {
  cacheHandler
} 