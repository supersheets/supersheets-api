async function getHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let store = ctx.state.paramstore
  let key = ctx.env.FUNC_AUTH0_MANAGEMENT_TOKEN_PATH
  let token = null
  try {
    token = await getManagementToken(store, key)
  } catch (err) {
    if (err.statusCode) {
      // from aws-param-store
      ctx.response.httperror(err.statusCode, `${err.code}: ${key}`, { expose: true })
      return
    }
    ctx.response.httperror(500, `Error looking up parameter value at ${key}: ${err.message}`, { expose: true })
    return
  } 
  if (!token) {
    ctx.response.httperror(400, `Invalid token value token stored at ${key}: token=${token}`)
    return
  }
  let userinfo = null
  try {
    userinfo = (await ctx.state.axios.get(user.userid, { headers: { 'Authorization': `Bearer ${token}` } })).data
  } catch (err) {
    if (err.response && err.response.data) { // axios 
      ctx.response.httperror(err.response.data.statusCode, `${err.response.data.error}: ${err.response.data.message}`)
      return
    }
    ctx.response.httperror(500, `Error in request to Auth0: ${err.message}`, { expose: true })
    return
  }
  let response = null
  let provider = ctx.event.queryStringParameters['provider'] || null  // google-oauth2
  if (provider) {
    response = userinfo.identities.find(id => id.provider == provider)
  } else {
    response = userinfo
  }
  ctx.response.json(response)
  return
}

async function getManagementToken(store, key) {
  let res = await store.getParameter(key)
  return res.Value
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
  getHandler,
}