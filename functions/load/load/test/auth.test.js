require('dotenv').config()
const { LoggerWrapper } = require('@funcmaticjs/funcmatic')
const prettify = require('@funcmaticjs/pretty-logs')
const { 
  setUser, 
  setAuthorizationToken,
  setSheetsAPI,
  setDocsAPI
} = require('../lib/auth')

const NOOP = async () => { }

describe('setUser', () => {
  it ('should throw if user not passed in body', async () => {
    let ctx = createTestCtx()
    ctx.event.body.user = null
    let error = null
    try {
      await setUser(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`No user info provided ('ctx.event.body.user')`)
  })
  it ('should set the user in ctx.state.user', async () => {
    let ctx = createTestCtx()
    await setUser(ctx, NOOP)
    expect(ctx.state.user).toBeTruthy()
  })
})

describe('setAuthorizationToken', () => {
  it ('should throw if no FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH value', async () => {
    let ctx = createTestCtx()
    ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH = null
    let error = null
    try {
      await setAuthorizationToken(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`No AWS param store path for service token ('ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH')`)
  })
  it ('should throw if bad FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH value', async () => {
    let ctx = createTestCtx()
    ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH = '/bad/path'
    let error = null
    try {
      await setAuthorizationToken(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`ParameterNotFound: /bad/path`)
  })
  it ('should fetch the service token and put in ctx.state.oauthtoken', async () => {
    let ctx = createTestCtx()
    await setAuthorizationToken(ctx, NOOP)
    expect(ctx.state.oauthtoken).toEqual(expect.stringContaining("ya29.c."))
  })
})

describe('setSheetsAPI', () => {
  it ('should throw if no GOOGLESHEETS_BASE_URL value', async () => {
    let ctx = createTestCtx()
    ctx.env.GOOGLESHEETS_BASE_URL = null
    let error = null
    try {
      await setSheetsAPI(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`No Google Sheets API base url ('ctx.env.GOOGLESHEETS_BASE_URL')`)
  })
  it ('should configure axios in ctx.state.sheetsapi', async () => {
    let ctx = createTestCtx()
    ctx.state.oauthtoken = 'se.r.vicetoken'
    await setSheetsAPI(ctx, NOOP)
    expect(ctx.state.sheetsapi).toBeTruthy()
    expect(ctx.state.sheetsapi.defaults).toMatchObject({
      baseURL: process.env.GOOGLESHEETS_BASE_URL,
      headers: {
        common: {
          'Authorization': `Bearer ${ctx.state.oauthtoken}`
        }
      }
    })
  })
})

describe('setDocsAPI', () => {
  it ('should throw if no GOOGLEDOCS_BASE_URL value', async () => {
    let ctx = createTestCtx()
    ctx.env.GOOGLEDOCS_BASE_URL = null
    let error = null
    try {
      await setDocsAPI(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`No Google Docs API base url ('ctx.env.GOOGLEDOCS_BASE_URL')`)
  })
  it ('should configure axios in ctx.state.sheetsapi', async () => {
    let ctx = createTestCtx()
    ctx.state.oauthtoken = 'se.r.vicetoken'
    await setDocsAPI(ctx, NOOP)
    expect(ctx.state.docsapi).toBeTruthy()
    expect(ctx.state.docsapi.defaults).toMatchObject({
      baseURL: process.env.GOOGLEDOCS_BASE_URL,
      headers: {
        common: {
          'Authorization': `Bearer ${ctx.state.oauthtoken}`
        }
      }
    })
  })
})

// describe('setDocsAPI', () => {
//   it ('should throw if no FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH value', async () => {
//     let ctx = createTestCtx()
//     ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH = null
//     let error = null
//     try {
//       await setSheetsAPI(ctx, NOOP)
//     } catch (err) {
//       error = err
//     }
//     expect(error).toBeTruthy()
//     expect(error.message).toEqual(`No AWS param store path for service token ('ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH')`)
//   })
//   it ('should throw if bad FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH value', async () => {
  
//   })
//   it ('should fetch the service token and put in ctx.state.oauthtoken', async () => {
//     let ctx = createTestCtx()
//     await setAuthorizationToken(ctx, NOOP)
//     expect(ctx.state.oauthtoken).toEqual(expect.stringContaining("ya29.c."))
//   })
// })



function createTestCtx(options) {
  options = options || { }
  let user = options.user || {
    userid: "1234",
    email: "danieljyoo@funcmatic.com",
    org: "funcmatic.com"
  }
  return { 
    event: { 
      body: { user }
    },
    env: { 
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLEDOCS_BASE_URL: process.env.GOOGLEDOCS_BASE_URL,
      FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH: process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
    },
    state: { },
    logger: new LoggerWrapper({ prettify })
  }
}
