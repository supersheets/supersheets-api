const { createHash } = require('crypto')

async function cacheHandler(ctx) {
  let id = ctx.event.pathParameters['spreadsheetid']
  let body = ctx.event.body
  let cache = ctx.state.cache
  let { key, field } = cachekey(id, body)
  let info = { key, field, hit: false, t: Date.now(), elapsed: 0, }
  // await check
  ctx.logger.debug({ msg: `GET`, cache: info })
  let data = null 
  try {
    data = await cache.hget(key, field) 
  } catch (err) {
    ctx.logger.error(err)
  }
  if (!data) { 
    info.hit = false
    info.elapsed = Date.now() - info.t
    ctx.logger.debug({ msg: `MISS`, cache: info })
    try { 
      data = (await ctx.state.supersheets.post(`${id}/find`, body)).data
      await cache.hset(key, field, data)
      ctx.logger.trace(`DATA=${JSON.stringify(data, null, 2)}`)
    } catch (err) {
      console.log(err)
      ctx.logger.error(err)
    }
    info.elapsed = Date.now() - info.t
    ctx.logger.debug({ msg: `SET`, cache: info })
  } else { // HIT
    info.hit = true
    info.elapsed = Date.now() - info.t
    ctx.logger.debug({ msg: `HIT`, cache: info })
  }
  info.elapsed = Date.now() - info.t
  ctx.response.set('X-Supersheets-Cache-Response', base64(info))
  ctx.response.json(data)
  return
}

// https://medium.com/@chris_72272/what-is-the-fastest-node-js-hashing-algorithm-c15c1a0e164e
function cachekey(id, body) {
  let key = `supersheets:sheet:${id}:find`
  let field = createHash('sha1').update(JSON.stringify(body)).digest('base64')
  return { key, field }
}

function base64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

module.exports = {
  cacheHandler
} 