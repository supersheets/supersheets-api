const { fetchGoogleServiceAccountToken, writeToParameterStore } = require('./lib/auth')

async function handler(event, context) {
  let ctx = createCtx(event, context)
  console.log({ msg: `ctx.env: ${JSON.stringify(ctx.env, null, 2)}` })
  let { access_token, expires_in } = await fetchGoogleServiceAccountToken(ctx)
  console.log({ msg: 'Fetched access token for Google Service Account', access_token, expires_in })
  let key = ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
  let res = await writeToParameterStore(key, access_token)
  console.log({ msg: `Successfully wrote token to ${key}: ${JSON.stringify(res)}` })
  return 'ok'
}

function createCtx(event, context) {
  return {
    event, 
    context,
    env: {
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: toMultiline(process.env.GOOGLE_PRIVATE_KEY),
      FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH: process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
    },
    state: { }
  }
}

// AWS Lambda will treat env variables with '\n' as literal. 
function toMultiline(s) {
  return s.replace(/\\n/g, '\n')
}

module.exports = {
  handler
}