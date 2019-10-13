require('dotenv').config()
const fs = require('fs')
const path = require('path')
// https://github.com/awslabs/serverless-application-model/blob/master/examples/apps/kinesis-firehose-cloudwatch-logs-processor/testEvent.json
const EVENT_COMPRESSED = 'event.compressed.json'
const RECORDS_DECOMPRESSED = 'records.decompressed.json'
const EVENT_PROCESSED = 'event.processed.json'
const EVENT_PROCESSED_ENCODED = 'event.processed.encoded.json'
const EVENT_SUPERSHEETS = 'event.supersheets.json'

const { process, decompressRecords, processRecords } = require('../lib/event')

describe('Supersheets Data', () => {
  it ('should process event', async () => {
    let event = getTestEvent(EVENT_SUPERSHEETS)
    let records = decompressRecords(event)
    console.log(JSON.stringify(records, null, 2))
  })
})

describe('decompressRecords', () => {
  it ('should decompress events', async () => {
    let event = getTestEvent(EVENT_COMPRESSED)
    let records = decompressRecords(event)
    expect(records.map(r => r.recordId)).toEqual([
      "49578734086442259037497492980620233840400173390482112514000000",
      "49578734086442259037497492980621442766219788363254202370000000",
      "49578734086442259037497492980622651692039402992428908546000000",
      "49578734086442259037497492980623860617859017621603614722000000"
    ])
  })
})

describe('processRecords', () => {
  it ('should process decompressed log records to unencoded data records', async () => {
    let records = getTestEvent(RECORDS_DECOMPRESSED)
    let processed = processRecords(records)
    expect(processed).toEqual(getTestEvent(EVENT_PROCESSED))
  })
})

describe('process', () => {
  it ('should fullly process cloudwatch log event', async () => {
    let event = getTestEvent(EVENT_COMPRESSED)
    let data = process(event)
    expect(data).toEqual(getTestEvent(EVENT_PROCESSED_ENCODED))
  })
})

function getTestEvent(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'events', name)).toString('utf8'))
}