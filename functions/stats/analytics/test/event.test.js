require('dotenv').config()
const fs = require('fs')
const path = require('path')
// https://github.com/awslabs/serverless-application-model/blob/master/examples/apps/kinesis-firehose-cloudwatch-logs-processor/testEvent.json
const EVENT_COMPRESSED = 'event.json'

const { transform } = require('../lib/transform')
const { process, decompressRecords, processRecords } = require('../lib/event')

describe('Kinesis Analytics Firehose Event', () => {
  it ('should process event', async () => {
    let event = getTestEvent(EVENT_COMPRESSED)
    let records = process(event, { transform })
    //console.log(JSON.stringify(records, null, 2))
  })
})

function getTestEvent(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', name)).toString('utf8'))
}