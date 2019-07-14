const { createHash } = require('crypto')

async function deleteHandler(ctx) {
  let cache = ctx.state.cache
  let id = ctx.event.pathParameters.spreadsheetid
  let body = ctx.event.body
  let key = cachekey(id)
  try {
    let status = await cache.del(key)
    if (status == 1) {
      ctx.response.json({ id, key, status })
    } else {
      ctx.logger.warn(`Key ${key} does not exist in cache`)
      ctx.response.httperror(404, `Not Found: Key ${key} does not exist in cache`)
    }
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
  deleteHandler
}