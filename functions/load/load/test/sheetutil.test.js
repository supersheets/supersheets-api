require('dotenv').config()
const { constructDocs } = require('../lib/sheetutil')
const { convertValues } = require('../lib/convert')

describe('Construct Docs', () => {
  let sheetDoc = { title: "title" }
  it ('should set formatted data', async () => {
    let { cols, docs } = constructDocs(sheetDoc, formattedData)
    expect(docs[0]).toMatchObject({
      "String": "Hello",
      "Number": "3",
      "Datetime": "2018-04-05",
    })
  })
  it ('should set unformatted data', async () => {
    let { cols, docs } = constructDocs(sheetDoc, unformattedData)
    expect(docs[0]).toMatchObject({
      "String": "Hello",
      "Number": 3,
      "Datetime": 43195,
    })
  })
  it ('should convert values of the docs', async () => {
    let datatypes = {
      String: "String",
      Number: "Number",
      Datetime: "Datetime"
    }
    let { cols, docs } = constructDocs(sheetDoc, unformattedData)
    let converted = convertValues(cols, docs, datatypes, { tz: "America/New_York" })
    expect(JSON.parse(JSON.stringify(converted.docs[0]))).toMatchObject({
      "String": "Hello",
      "Number": 3,
      // "Datetime": "2018-04-05T00:00:00.000-04:00" // "2018-04-05"
      "Datetime": "2018-04-05T04:00:00.000Z" // "2018-04-05" (spreadsheet)
    })
    expect(JSON.parse(JSON.stringify(converted.docs[1]))).toMatchObject({
      "String": "World",
      "Number": 3.14,
      //"Datetime": "2018-04-05T12:30:04.000-04:00" // "4/5/2018 12:30:04" (spreadsheet)
      "Datetime": "2018-04-05T16:30:04.000Z"
    })
  })
})

const formattedData = [
  [
    "String",
    "Number",
    "Datetime"
  ],
  [
    "Hello",
    "3",
    "2018-04-05"
  ],
  [
    "World",
    "3.14",
    "4/5/2018 12:30:04"
  ],
  [
    "Old",
    "$10",
    "1/1/1886"
  ],
  [
    "Percent",
    "10%",
    "1/1/1886 12:30:04"
  ],
  [
    "Yen",
    "100",
    "¥100"
  ]
]

const unformattedData = [
  [
    "String",
    "Number",
    "Datetime"
  ],
  [
    "Hello",
    3,
    43195
  ],
  [
    "World",
    3.14,
    43195.52087962963
  ],
  [
    "Old",
    10,
    -5111
  ],
  [
    "Percent",
    0.1,
    -5110.479120370371
  ],
  [
    "Yen",
    100,
    100
  ]
]