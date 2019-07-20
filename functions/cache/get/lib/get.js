async function getHandler(ctx) {
  let id = ctx.event.pathParameters.spreadsheetid
  try {
    await ctx.state.supersheets.get(`${id}`)
  } catch (err) {
    if (err.response) {
      ctx.response.httperror(err.response.status, err.response.data.errorMessage)
    } else {
      ctx.response.httperror(500, `Internal Server Error: ${err.message}`)
    }   
    return
  }
  let cache = ctx.state.cache
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

function userInfo(ctx) {
  let auth = ctx.state.auth
  if (!auth || !auth.success) {
    return null
  }
  let decoded = ctx.state.auth.decoded
  let userid = decoded.sub
  let email = decoded.email && decoded.email.toLowerCase() || null
  let org = getOrgFromEmail(email)
  return { userid, email, org }
}

function getOrgFromEmail(email) {
  if (!email || email.endsWith("@gmail.com")) return null
  return email.split('@')[1]
}

module.exports = {
  getHandler
}