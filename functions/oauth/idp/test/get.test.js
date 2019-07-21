require('dotenv').config()
const axios = require('axios')
const prettify = require('@funcmaticjs/pretty-logs')

describe('Error Handling', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should return 401 Unauthorized if there if user is unauthenticated", async () => {
    let ctx = createCtx() 
    delete ctx.event.headers['Authorization']
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ("should return 400 if param store path does not exist", async () => {
    let ctx = createCtx() 
    ctx.env.FUNC_AUTH0_MANAGEMENT_TOKEN_PATH = '/External/BAD/PATH'
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 400
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "ParameterNotFound: /External/BAD/PATH"
    })
  })
  it ("should return 500 if the param store itself throws error", async () => {
    let ctx = createCtx() 
    ctx.state.paramstore = mockparamstore(null, new Error("AWS Error"))
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error looking up parameter value at /External/testtoken: AWS Error` 
    })
  })
  it ("should return 400 if param value is invalid (i.e. null)", async () => {
    let ctx = createCtx() 
    ctx.state.paramstore = mockparamstore({ Value: null })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 400
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Invalid token value token stored at /External/testtoken: token=null` 
    })
  })
  it ("should return 400 if Auth0 API returns error", async () => {
    let ctx = createCtx() 
    ctx.state.paramstore = mockparamstore({ Value: 'BAD-TOKEN-VALUE' })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 400
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Bad Request: Bad HTTP authentication header format` 
    })
  })
  it ('should return 500 if the actual Auth0 request fails', async () => {
    let ctx = createCtx() 
    ctx.state.axios = mockaxios(null, new Error("Request error"))
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error in request to Auth0: Request error` 
    })
  })
})

describe('Function', () => { 
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should return a single identity provider token for the user", async () => {
    let ctx = createCtx() 
    ctx.event.queryStringParameters['provider'] = "google-oauth2"
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      provider: 'google-oauth2',
      access_token: expect.anything(),
      expires_in: 3600,
      user_id: '107764139004828737326',
      connection: 'google-oauth2',
      isSocial: true
    })
  })
  it ("should return all Auth0 user info", async () => {
    let ctx = createCtx() 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      email: "danieljyoo@goalbookapp.com"
    })
    expect(body.identities[0]).toMatchObject({
      provider: 'google-oauth2',
      access_token: expect.anything(),
    })
  })
})

function mockparamstore(response, error) {
  return {
    getParameter: async () => {
      if (response) {
        return response
      }
      throw error
    }
  }
}

function mockaxios(response, error) {
  return {
    get: async () => {
      if (response) {
        return response
      }
      throw error
    }
  }
}

function createCtx() {
  return { 
    event: {
      httpMethod: 'GET',
      pathParameters: { },
      queryStringParameters: { },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.AUTH0_TOKEN
      },
      stageVariables: { },
    },
    env: {
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      FUNC_AUTH0_SKIP_VERIFICATION: 'true',
      FUNC_AUTH0_MANAGEMENT_TOKEN_PATH: process.env.FUNC_AUTH0_MANAGEMENT_TOKEN_PATH
    },
    state: { }
  }
}