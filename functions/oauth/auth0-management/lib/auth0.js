const axios = require('axios')
const awsParamStore = require( 'aws-param-store')

async function fetchAuth0ManagementToken(ctx) {
  setupAxios(ctx)
  return (await ctx.state.axios.post(`oauth/token`, createBody(ctx))).data
}

function setupAxios(ctx) {
  ctx.state.axios = axios.create({
    baseURL: `https://${ctx.env.AUTH0_DOMAIN}`,
    headers: {
      'content-type': 'application/json'
    }
  })
}

function createBody(ctx) {
  return {
    "client_id": ctx.env.AUTH0_CLIENTID,
    "client_secret": ctx.env.AUTH0_CLIENTSECRET,
    "audience": `https://${ctx.env.AUTH0_DOMAIN}/api/v2/`,
    "grant_type": "client_credentials"
  }
}

async function writeToParameterStore(key, value) {
  return await awsParamStore.putParameter(key, value, 'String', { Overwrite: true })
}

module.exports = {
  fetchAuth0ManagementToken,
  writeToParameterStore
}