require('dotenv').config()
const { handler } = require('../index')

describe('Handler', () => {
  let event = null
  let context = null
  beforeEach(async () => {
    event = { }
    context = { }
  })
  it ('should call the handler', async () => {
    let ret = await handler(event, context)
    expect(ret).toBe('ok')
  })
})
