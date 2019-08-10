const { siftifyArgs, extractFieldsToSift } = require('../lib/filter')

describe('siftifyArgs', () => {
  it ('should convert query args to sift args', async () => {
    let query = {
      wordcount: {
        paragraphs: {
          eq: 4
        }
      }
    }
    let sifted = siftifyArgs(query)
    expect(sifted).toMatchObject({
      wordcount: {
        paragraphs: {
          '$eq': 4
        }
      }
    })
    console.log("SIFT", sift)
  })
})

describe('extractFieldsToSift', () => {
  it ('should convert query args to sift args', async () => {
    let query = {
      wordcount: {
        paragraphs: {
          '$eq': 4
        }
      }
    }
    let sifted = extractFieldsToSift(query)
    expect(sifted).toMatchObject({
      wordcount: {
        paragraphs: true
      }
    })
  })
})