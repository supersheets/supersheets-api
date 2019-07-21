require('dotenv').config()
const { fetchAuth0ManagementToken, writeToParameterStore } = require('../lib/auth0')

describe('Auth0', () => {
  let ctx = null
  beforeEach(async () => {
    ctx = createCtx()
  })
  it ('should call the handler', async () => {
    let res = await fetchAuth0ManagementToken(ctx)
    console.log(res.access_token)
    expect(res).toMatchObject({
      access_token: expect.anything(),
      scope: 'read:users read:user_idp_tokens',
      expires_in: 86400,
      token_type: 'Bearer'
    })
  })
})

describe('Parameter Store', () => {
  let ctx = null
  beforeEach(async () => {
    ctx = createCtx()
  })
  it ('should save a value to the parameter store', async () => {
    let key = "/External/testtoken"
    let value = "TEST-VALUE"
    let res = await writeToParameterStore(key, value)
    expect(res).toMatchObject({
      Version: expect.anything()
    })
  })
})

function createCtx() {
  return {
    env: {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
      AUTH0_CLIENTID: process.env.AUTH0_CLIENTID,
      AUTH0_CLIENTSECRET: process.env.AUTH0_CLIENTSECRET,
      PARAMETER_STORE_PATH: process.env.PARAMETER_STORE_PATH
    },
    state: { }
  }
}