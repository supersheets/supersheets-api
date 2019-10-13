require('dotenv').config()

const path = require('path')
const fs = require('fs')
const { handler } = require('../index')
const EVENT_SUPERSHEETS = 'event.supersheets.json'

describe('Handler', () => {
  it ('should return all records with no reingestion', async () => {
    let event = getTestEvent(EVENT_SUPERSHEETS)
    let result = await handler(event, { })
    expect(result).toMatchObject({
      records: [ {
        recordId: "49600040360416080619090264506781604020990689323830476802000000",
        result: "Ok",
        data: expect.anything()
      } ]
    })
    let data = JSON.parse(decodeBase64(result.records[0].data), null, 2)
    expect(data).toEqual( {
      "x-correlation-id": "1675aa21-11bc-469e-88e9-a9bda5add563",
      "awsRequestId": "1675aa21-11bc-469e-88e9-a9bda5add563",
      "time": 1570930939707,
      "utc": "2019-10-13T01:42:19.707Z",
      "functionName": "supersheets-api-v3-graphql-cache",
      "functionVersion": "$LATEST",
      "invokedQualifier": "DEV",
      "spreadsheetid": "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI",
      "key": "supersheets:sheet:1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI:find",
      "field": "90QlL8sjVtkRGFHjdOEL76SQK5s=",
      "hit": false,
      "t": 1570930938531,
      "elapsed": 1176,
      "size": 581
    })
  })
})

function getTestEvent(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'events', name)).toString('utf8'))
}

function decodeBase64(s) {
  return Buffer.from(s, 'base64').toString('utf8')
}