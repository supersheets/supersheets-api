require('dotenv').config()
// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const SPREADSHEETID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"
const fs = require('fs')
const path = require('path')
const { gql } = require('apollo-server-lambda')
const { LoggerWrapper } = require('@funcmaticjs/funcmatic')
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { findMetadata } = require('../lib/handler')
const NOOP = async () => { }
const SCHEMA_TEST_FILE = 'typedefs_dateformat.gql'
const COMPRESSED_GOOGLE_DOC = "H4sIAAAAAAAAE+1YW0/rOBD+K5afI9QbhcNbgQJZlRY1AVY6u6rceJp4Se2u7VB6UP/72kmv6YUgUbor7VvtGc/lm5nPTt8xFUEyBK5dii9w2WX341pv7P0Wsgq0RcBC9fjrUjTCOvX9J68b+rLiuz9u+PU5drBmOgZzzEtGIFUEoBV6SPoxC9C1CJAPSqPXilHsCzrBF+84EFwbX/ji5ztWmkjtcgpv+KJcLTkYOJ0vT6sOHhFJQklGkT0IMdggVaGTGt50N+FrDrEfAboFrSeqn8gQNSiVoNQfHGf6np7YVN6n0+mfK77n2zgCQhkPU5Sikxp5K52VzuhfQ6gbA5wMgaaq/mRkAblrNq7d9m2vbIQx4+CNSGBOm/hKJlzKJASaCRMhbjVv/J7f6XXd2zvfaJNXwegzo2Lc4LQjRxExWgMSKzCRObncbbLL3KsWioKo5U6WdqF2IxKJVCAkIMIpUvAKHE2ASIVIKJCVDoiOTPVRX4okjDQaCKkjJDjSEVPImjIAcO0ggjiMESc2c8cKAmCvQBHjqMX6IPXESZ1QoCwg2ki0MEYAjaQYCcXsObMmGm3WLIdMmtBKfpXzHfmROEYGIkRMgoGE1Cv8nZA458J0cGxKr2UCDmaamBbPVlt8W2e5qmz1fVK4+Tb6q93p3jdaPb/5u3/QDquuT1e1Wi7aYdtObkXhvwBCeT2VSnEQNk8eFITdKVuDU2fB9su+JsFLaCaX0yyiWMjUvXUeQjsZmsH0bEoGVAcPiQwZ98XIKg9JyJlOqLFzZhJLzMK4fTC+5oqXQmsxLKbbZYY8iqm2YPChpo3eY79m3L3N9o/8kTGjOspp1cvrWhaYZQ2U1VazXz8/rM4WQklbbskos6WpBkjb0IsdpSV7AR2lHLvcHRr+uiIjtdhZlvNqXkoHG0aG9c1FobEM+wvNaaprmmOG2woO5XIerBRToDdG/4YMWZze74OVFW5IlvLoeAZ/rVSa2ggV2NQ6g4ECnWLUbmYV+2SzG8hCPswGyPMb3U0WKJ/uZwGVad4LmyK+6rRajQev2Wu5nu/NxNDoi9c0mrX0U9ElxGK8IeoLaap3CXoMwNeGaqXFcr1KaRpwbp8SNQcDe52We700PxvBQ5heDu0hrM9n9xC2FxTytcaZmUbT1kwq3UpnMncok89IcqusmbHrmuQFYGTNKV+EYF9Qixm2kmemo7ahi8Xm1gsre46oiMyT2TL+2X2294W6xks7CKBSWufBL72c8qO2229+8lap2vkQ4AyvdXyzR9w+iCp7qXsXYdaPg1f5/Oh4VT/Aq9BlhCWYM6WTSr1yVjs1t08oUzpd2enHCaxs7L2+akeqRh7kndWoHaoatc0B/1QBaivQ15ag1/bCXTkS3HkUvx/u02PAXT4S3PkX9PfDXc/Dvfpt/mmy+R/8QuD7rt9qFn03fOc9WAyP6lfj4T1eboUk91X3Hc14+jWfaf+GMm3cnZ+qk/2zQyVhCMqGpJ4YjGefeQ/d5pPbfO49u/5d59HveY+3t03PdzttD0//Ab1vNlwQFwAA"

let plugin = new MongoDBPlugin()
let client = null
let db = null
let metadata = null
beforeAll(async () => {
  client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
  db = client.db()
  metadata = await createTestMetadata(db)
})
afterAll(async () => {
  if (db) {
    await deleteTestMetadata(db, metadata)
  }
  if (client) {
    await client.close()
  }
  client = null
  db = null
})

describe('findMetadata', () => {
  let ctx = null
  beforeEach(async () => {
    ctx = {
      event: { pathParameters: { spreadsheetid: SPREADSHEETID } },
      state: { mongodb: db },
      logger: new LoggerWrapper({ prettify })
    }
  })
  afterEach(async () => {
  })
  it ('should throw if id is invalid', async () => {
    let error = null
    ctx.event.pathParameters.spreadsheetid = 'BAD-SPREADSHEET-ID'
    try {
      await findMetadata(ctx, NOOP) 
    } catch (err) {
      error = err
    }
    expect(ctx.state.metadata).toBeFalsy()
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`Not Found: Supersheet with id ${ctx.event.pathParameters.spreadsheetid} could not be found`)
  }, 30 * 1000)
  it ('should set ctx.state.metadata', async () => {
    ctx.event.pathParameters.spreadsheetid = SPREADSHEETID
    await findMetadata(ctx, NOOP) 
    expect(ctx.state.metadata).toMatchObject({
      id: SPREADSHEETID,
      datauuid: 'TEST-DATA-UUID'
    })
  }, 30 * 1000)
})

describe('findOne', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
  }, 30 * 1000)
  it ('should run a basic findOne query', async () => {
    let query = `{ 
      findOnePosts { 
        letter
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    console.log(ctx.response)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findOnePosts: {
          "letter": "A"
        }
      }
    })
  }, 30 * 1000)
  it ('should run a findOne query with filter', async () => {
    let query = `{ 
      findOnePosts (filter: { letter: { eq: "B" } } ) { 
        letter
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findOnePosts: {
          "letter": "B"
        }
      }
    })
  }, 30 * 1000)
})

describe('find', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
  }, 30 * 1000)
  it ('should run a basic find all query', async () => {
    let query = `{ 
      findPosts { 
        rows {
          row {
            letter 
          } 
        }
        totalCount
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          totalCount: 5,
          rows: [
            { row: { "letter": "A" } },
            { row: { "letter": "B" } },
            { row: { "letter": "C" } },
            { row: { "letter": "D" } },
            { row: { "letter": "E" } }
          ]
        }
      }
    })
  }, 30 * 1000)
  it ('should run a find all with filter', async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "B" } }) { 
        rows {
          row {
            letter 
          } 
        }
        totalCount
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          totalCount: 1,
          rows: [
            { row: { "letter": "B" } }
          ]
        }
      }
    })
  }, 30 * 1000)
  it("should filter using regex", async () => {
    let query = `{ 
      findPosts (filter: { googledoc___title: { regex: "^Song", options: "i" } }) { 
        rows {
          row {
            googledoc {
              title
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              googledoc: {
                title: "Song of Solomon"
              }
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
    it ('should match on an in (array) query', async () => {
    let query =  `{ 
      findPosts (filter: { letter: { in: [ "C", "D" ] } }) { 
        rows {
          row {
            letter
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ {
            row: {
              "letter": "C"
            },
          }, {
            row: {
              "letter": "D"
            }
          } ]
        }
      }
    })
  })
  it("should sort, limit, and skip", async () => {
    let query = `{ 
      findPosts (sort: { fields: [ letter ], order: [ DESC ] }, limit: 2, skip: 1) { 
        rows {
          row {
            letter
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ {
            row: { 
              letter: "D"
            }
          }, { 
            row: {
              letter: "C"
            }
          } ]
        }
      }
    })
  }, 30 * 1000)
})


describe('date and datetime', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
  }, 30 * 1000)
  it("should serialize date and datetime correctly", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            letter
            date
            datetime 
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              date: "1979-05-16",
              datetime: "1979-05-16T21:01:23.000Z" 
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it("should filter query date and datetime", async () => {
    let query = `{ 
      findPosts (filter: { date: { gt: "1979-05-15" }, datetime: { lte: "1979-05-16T21:01:23.000Z" } }) { 
        rows {
          row {
            letter
            date
            datetime 
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              date: "1979-05-16",
              datetime: "1979-05-16T21:01:23.000Z" 
            } 
          } ]
        }
      }
    })
    // Time just barely missing by a second
    query = `{ 
      findPosts (filter: { date: { gt: "1979-05-15" }, datetime: { lte: "1979-05-16T21:01:22.000Z" } }) { 
        rows {
          row {
            letter
            date
            datetime 
          }
        } 
      }
    }`
    ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ ]
        }
      }
    })
  }, 30 * 1000)
  it("should take date and datetime formatting arguments", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            letter
            date(formatString: "DDDD")
            datetime(formatString: "DDDD ttt")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              date: "Wednesday, May 16, 1979",
              datetime: "Wednesday, May 16, 1979 9:01:23 PM UTC" 
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it ("should not throw if date and datime are null", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "E" } }) { 
        rows {
          row {
            letter
            date(formatString: "DDDD")
            datetime(formatString: "DDDD ttt")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "E",
              date: null,
              datetime: null
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it ("should accept timezone", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            letter
            date(formatString: "DDDD ttt", zone: "America/Los_Angeles")
            datetime(formatString: "DDDD ttt", zone: "America/Los_Angeles")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              date: "Wednesday, May 16, 1979 12:00:00 AM PDT",
              datetime: "Wednesday, May 16, 1979 2:01:23 PM PDT"
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it ("should noop on locale (to be supported later)", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            letter
            date(locale: "fr")
            datetime(locale: "fr")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              date: "1979-05-16",
              datetime: "1979-05-16T21:01:23.000Z"
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
})


describe('GoogleDoc Content', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
  }, 30 * 1000)
  it("should get the html rendered google doc content", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            googledoc {
              excerpt(pruneLength: 11)
              text
              markdown
              html
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              googledoc: {
                excerpt: "Hello World",
                text: "Hello World\nThis is a document\n",
                markdown: expect.stringMatching(/^# The Gettysburg Address/),
                html: expect.stringMatching(/^\<h1\>The Gettysburg Address\<\/h1\>/)
              }
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
})

describe('Relationships', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
  }, 30 * 1000)
  it("should get a relationship", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            letter
            value
            posts {
              letter
              value
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              value: 65,
              posts: [ {
                letter: "C",
                value: 66
              } ]
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it("should query the underlying column value", async () => {
    let query = `{ 
      findPosts (filter: { posts: { eq: 66 } }) { 
        rows {
          row {
            letter
            value
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              value: 65,
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it("should recursive work", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            letter
            value
            posts {
              letter
              value
              posts {
                letter
                value
              }
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              letter: "A",
              value: 65,
              posts: [ {
                letter: "C",
                value: 66,
                posts: [ {
                  letter: "D",
                  value: 67
                } ]
              } ]
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
})

describe('Image content', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
  }, 30 * 1000)
  it("should get the image src from asset host", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            image {
              src
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              image: {
                "src": "https://images.supersheets.io/eyJrZXkiOiJ0ZXN0LzU2NTAxMGU0MWM2OTQ5NDczZGZjYzM0MWFiMTMwM2MwNTE1NDkzMDcucG5nIn0="
              }
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it("should pass image edit options", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            image(
              edits: {
                resize: {
                  width: 200
                  height: 200
                  fit: contain
                }
                grayscale: true
              }
            ) {
              src
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              image: {
                "src": "https://images.supersheets.io/eyJidWNrZXQiOiJpbWFnZXMuc3VwZXJzaGVldHMuaW8iLCJrZXkiOiJ0ZXN0LzU2NTAxMGU0MWM2OTQ5NDczZGZjYzM0MWFiMTMwM2MwNTE1NDkzMDcucG5nIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjoyMDAsImhlaWdodCI6MjAwLCJmaXQiOiJjb250YWluIn0sImdyYXlzY2FsZSI6dHJ1ZX19"
              }
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it("should generate blurup", async () => {
    let query = `{ 
      findPosts (filter: { letter: { eq: "A" } }) { 
        rows {
          row {
            image(
              edits: {
                resize: {
                  width: 200
                  height: 200
                  fit: contain
                }
                grayscale: true
              }
            ) {
              blurup(
                width: 800
                height: 600
                scale: 0.05
              )
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findPosts: {
          rows: [ { 
            row: { 
              image: {
                "blurup": "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='800' height='600' viewBox='0 0 800 600'%3e %3cfilter id='blur' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3e %3cfeGaussianBlur stdDeviation='20 20' edgeMode='duplicate' /%3e %3cfeComponentTransfer%3e %3cfeFuncA type='discrete' tableValues='1 1' /%3e %3c/feComponentTransfer%3e %3c/filter%3e %3cimage filter='url(%23blur)' xlink:href='data:image/jpeg%3bbase64%2c/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAeACgDASIAAhEBAxEB/8QAGgAAAgMBAQAAAAAAAAAAAAAABAYAAwcFAf/EADEQAAECBQIBCQkBAAAAAAAAAAECAwAEBQYREiFxIjFBYZGhwtLhBxM0RVFSgYKV4v/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDpUygWuppOu3aKo45zItHwx0Tb9pIGVW1QwPqae15YT5Sr4SAMKMWz0649ITHuphbT%2bglBGDg4zwgGaUpNmTbIdl7ft9xBzgins9Bx9seu0C1ANrboX89rywnW7P6Kc4ykpWlp1Wkk8oBWFDf8mDl1RfQsnqPP2wB87RbZSDpt2ijhItDwxIX5%2bpFaTkkKESAWpJ4uI5CkngoQcl19IwUkjujI2LocaHw4V%2b/pB7d8vtgaZZY4P%2bkBoErNqYmHUAgZSCABg7Ejfti5dQyNyIzpN9Oh1LhkUKUAQSpzc90En2gJUOXSGyep7HhgG6cqO2x2iQiTF4NPfLdPB/8AzEgP/9k=' x='0' y='0' height='100%25' width='100%25'/%3e %3c/svg%3e"
              }
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
})

function createTestEvent(id, query, variables) {
  variables = variables || null;
  return {
    event: {
      httpMethod: "POST",
      pathParameters: {
        spreadsheetid: id
      },
      body: JSON.stringify({ query, variables })
    },
    context: { },
    env: {
      SUPERSHEETS_BASE_URL: process.env.SUPERSHEETS_BASE_URL,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
    },
    state: { 
      mongodb: db,
      //typeDefs: gql(fs.readFileSync(path.join(__dirname, SCHEMA_TEST_FILE)).toString('utf8'))
    },
    logger: new LoggerWrapper({ prettify })
  }
}

function getTestMetadata() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'metadata.json')).toString('utf8'))
}

async function createTestMetadata(db, options) {
  options = options || { }
  let metadata = getTestMetadata()
  metadata.id = options.id || metadata.id
  metadata.datauuid = options.datauuid || metadata.datauuid

  await db.collection('spreadsheets').deleteOne({ id: metadata.id })
  await db.collection('spreadsheets').updateOne({ id: metadata.id }, { "$set": metadata }, { upsert: true })
  await createTestData(db, { datauuid: metadata.datauuid })
  return metadata
}

async function createTestData(db, options) {
  let data = [ 
    { 
      _sheet: "Posts",
      letter: "A", 
      value: 65, 
      date: new Date("1979-05-16"), 
      datetime: new Date("1979-05-16T21:01:23.000Z"), 
      googledoc: { title: "The Gettysburg Address", "_text": "Hello World\nThis is a document\n", "_content": COMPRESSED_GOOGLE_DOC },
      posts: 66,
      image: {
        "_original": "https://images.unsplash.com/photo-1423347834838-5162bb452ca7",
        "_url": "https://images.supersheets.io/eyJrZXkiOiJ0ZXN0LzU2NTAxMGU0MWM2OTQ5NDczZGZjYzM0MWFiMTMwM2MwNTE1NDkzMDcucG5nIn0=",
        "_mediatype": "image/jpeg",
        "_length": 1994229,
        "_bucket": "images.supersheets.io",
        "_key": "test/565010e41c6949473dfcc341ab1303c051549307.png",
        "_etag": "\"7479486ef7dfa55ec32dc24e2c757701\""
      }
    },
    { 
      _sheet: "Posts",
      letter: "B", 
      value: 65, 
      date: new Date("2019-07-04"), 
      datetime: new Date("2019-07-04T03:21:00.000Z"), 
      googledoc: { title: "Song of Solomon", "_text": "Song of Solomon\nThis is a document\n" } },
    { _sheet: "Posts", letter: "C", value: 66, posts: 67 },
    { _sheet: "Posts", letter: "D", value: 67 },
    { _sheet: "Posts", letter: "E", value: 68 }
  ]
  let datauuid = options.datauuid || 'DATAUUID'
  await db.collection(datauuid).insertMany(data)
  return
}

async function deleteTestMetadata(db, options) {
  options = options || { }
  let id = options.id || SPREADSHEETID
  let datauuid = options.datauuid || 'DATAUUID'
  try { 
    await db.collection('spreadsheets').deleteOne({ id })
    await db.collection(datauuid).drop()
  } catch (err) {

  }
  return 
}