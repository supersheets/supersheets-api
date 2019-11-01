const axios = require('axios')
const awsParamStore = require('aws-param-store')

async function setUser(ctx, next) {
  if (ctx.state.user) return await next()
  ctx.state.user = ctx.event.body && ctx.event.body.user
  if (!ctx.state.user) {
    throw new Error(`No user info provided ('ctx.event.body.user')`)
  }
  return await next()
}

// This could be our default service token OR 
// the Google oauth token of the 
async function setAuthorizationToken(ctx, next) {
  if (ctx.state.oauthtoken) return await next()
  let token = getUserOAuthToken(ctx)
  if (!token) {
    token = await fetchServiceAccountOAuthToken(ctx)
  }
  ctx.state.oauthtoken = token
  ctx.logger.info(`Google OAuth Token: ${ctx.state.oauthtoken}`)
  return await next()
}

function getUserOAuthToken(ctx) {
  return ctx.event && ctx.event.body && ctx.event.body.token || null
}

async function fetchServiceAccountOAuthToken(ctx) {
  let key = ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
  if (!key) {
    throw new Error(`No AWS param store path for service token ('ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH')`)
  }
  let token = null
  try {
    token = (await awsParamStore.getParameter(key)).Value
  } catch (err) {
    if (err.code && !err.message) { // 'ParameterNotFound'
      err.message = `${err.code}: ${key}`
    }
    throw err
  }
  return token
}

async function setSheetsAPI(ctx, next) {
  if (ctx.state.sheetsapi) return await next()
  if (!ctx.env.GOOGLESHEETS_BASE_URL) {
    throw new Error(`No Google Sheets API base url ('ctx.env.GOOGLESHEETS_BASE_URL')`)
  }
  ctx.state.sheetsapi = axios.create({ 
    baseURL: ctx.env.GOOGLESHEETS_BASE_URL
  })
  ctx.state.sheetsapi.defaults.headers.common['Authorization'] = `Bearer ${ctx.state.oauthtoken}`
  return await next()
}

async function setDocsAPI(ctx, next) {
  if (ctx.state.docsapi) return await next()
  if (!ctx.env.GOOGLEDOCS_BASE_URL) {
    throw new Error(`No Google Docs API base url ('ctx.env.GOOGLEDOCS_BASE_URL')`)
  }
  ctx.state.docsapi = axios.create({ 
    baseURL: ctx.env.GOOGLEDOCS_BASE_URL
  })
  ctx.state.docsapi.defaults.headers.common['Authorization'] = `Bearer ${ctx.state.oauthtoken}`
  return await next()
}


module.exports = {
  setUser, 
  setAuthorizationToken,
  setSheetsAPI,
  setDocsAPI
}