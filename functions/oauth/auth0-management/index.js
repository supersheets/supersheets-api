const { fetchAuth0ManagementToken, writeToParameterStore } = require('./lib/auth0')

async function handler(event, context) {
  let ctx = createCtx(event, context)
  console.log({ msg: `ctx.env: ${JSON.stringify(ctx.env, null, 2)}` })
  let { access_token, expires_in } = await fetchAuth0ManagementToken(ctx)
  console.log({ msg: 'Fetched access token from Auth0', access_token, expires_in })
  let key = ctx.env.FUNC_AUTH0_MANAGEMENT_TOKEN_PATH
  let res = await writeToParameterStore(key, access_token)
  console.log({ msg: `Successfully wrote token to ${key}: ${JSON.stringify(res)}` })
  return 'ok'
}

function createCtx(event, context) {
  return {
    event, 
    context,
    env: {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
      AUTH0_CLIENTID: process.env.AUTH0_CLIENTID,
      AUTH0_CLIENTSECRET: process.env.AUTH0_CLIENTSECRET,
      FUNC_AUTH0_MANAGEMENT_TOKEN_PATH: process.env.FUNC_AUTH0_MANAGEMENT_TOKEN_PATH
    },
    state: { }
  }
}

module.exports = {
  handler
}