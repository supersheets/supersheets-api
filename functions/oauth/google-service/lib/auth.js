const axios = require('axios')
const qs = require('querystring')
const jwt = require('jsonwebtoken')
const awsParamStore = require('aws-param-store')
const SCOPES = [ 
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets"
]

async function fetchGoogleServiceAccountToken(ctx) {
  setupAxios(ctx)
  return (await ctx.state.axios.post(`oauth2/v4/token`, qs.stringify(createBody(ctx)))).data
}

function setupAxios(ctx) {
  ctx.state.axios = axios.create({
    baseURL: `https://www.googleapis.com`,
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  })
}

function createBody(ctx) {
  let token = encodeRequestToken({
    GOOGLE_CLIENT_EMAIL: ctx.env.GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY: ctx.env.GOOGLE_PRIVATE_KEY
  })
  return {
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: token
  }
}

function encodeRequestToken(options) {
  options = options || { }
  let header = {
    "alg":"RS256",
    "typ":"JWT"
  }
  let epoch = Math.floor(Date.now() / 1000)
  let claims = {
    iss: options.GOOGLE_CLIENT_EMAIL,
    scope: SCOPES.join(' '),
    aud: "https://www.googleapis.com/oauth2/v4/token",
    iat: epoch,
    exp: epoch + 60 * 60  // 4 hrs
  }
  let token = jwt.sign(claims, options.GOOGLE_PRIVATE_KEY, { algorithm: 'RS256', header })
  return token
}


async function writeToParameterStore(key, value) {
  return await awsParamStore.putParameter(key, value, 'String', { Overwrite: true })
}

module.exports = {
  fetchGoogleServiceAccountToken,
  writeToParameterStore
}