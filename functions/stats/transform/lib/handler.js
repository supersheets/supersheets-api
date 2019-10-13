const AWS = require('aws-sdk')
const eventlib = require('./event')
const { 
  getPutRecordBatch, 
  processForReingestion, 
  batchReingestionRecords, 
  reingestRecords } = require('./firehose')

const MAX_LAMBDA_SIZE = 6000000    // ~6MB
const MAX_FIREHOSE_SIZE = 4000000  // ~4MB
const MAX_FIREHOSE_RECORDS = 500   

async function handler(event, context, options) {
  options = options || { }

  const streamARN = event.deliveryStreamArn
  const region = streamARN.split(':')[3]
  const streamName = streamARN.split('/')[1]

  const firehose = new AWS.Firehose({ region })
  const putRecordBatch = getPutRecordBatch(firehose)

  // Service limits
  // We let these be specified in options for testing
  const limit_lambda_size = options.MAX_LAMBDA_SIZE || MAX_LAMBDA_SIZE
  const limit_firehose_n = options.MAX_LAMBDA_SIZE || MAX_FIREHOSE_RECORDS
  const limit_firehose_size = options.MAX_LAMBDA_SIZE || MAX_FIREHOSE_SIZE
  console.debug(`limit_lambda_size=${limit_lambda_size},limit_firehose_n=${limit_firehose_n}`,`limit_firehose_size=${limit_firehose_size}`)

  // LogEvent transform function
  let transform = options.transform || eventlib.defaultTransform
  let processed = eventlib.process(event, { transform })
  let { records, reingest } = processForReingestion(processed, { limit: limit_lambda_size })
  if (reingest.length > 0) {
    console.warn(`Need to reingest ${reingest.length} records`)
    let batches = batchReingestionRecords(reingest, { 
      limit_n: limit_firehose_n, 
      limit_size: limit_firehose_size 
    })
    console.log(`Reingesting ${batches.length} batches`)
    let nbatch = 1
    for (let batch of batches) {
      console.log(`Reingesting batch ${nbatch} (${batch.length} records)`)
      await reingestRecords(putRecordBatch, streamName, batch, { })
      nbatch += 1
    }
  }
  console.log(`Returning ${records.length} records`)
  return { records } 
}

module.exports = {
  handler
}