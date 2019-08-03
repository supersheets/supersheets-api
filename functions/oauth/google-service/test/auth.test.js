require('dotenv').config()
const { fetchGoogleServiceAccountToken, writeToParameterStore } = require('../lib/auth')

describe('Google Service Account', () => {
  let ctx = null
  beforeEach(async () => {
    ctx = createCtx()
  })
  it ('should call the handler', async () => {
    let res = await fetchGoogleServiceAccountToken(ctx)
    console.log(res.access_token)
    expect(res).toMatchObject({
      access_token: expect.anything(),
      expires_in: 3600,
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
    let key = process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
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
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH: process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
    },
    state: { }
  }
}