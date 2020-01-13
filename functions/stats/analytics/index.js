const { transform } = require('./lib/transform')
const { process } = require('./lib/event')

async function handler(event, context) {
  console.log('EVENT', JSON.stringify(event, null, 2))
  let records = process(event, { transform })
  return { records }
}

module.exports = {
  handler
}

// https://docs.aws.amazon.com/kinesisanalytics/latest/dev/lambda-preprocessing.html
// {
//   "records": [
//     {
//       "recordId": "49572672223665514422805246926656954630972486059535892482",
//       "result": "Ok",
//       "data": "SEVMTE8gV09STEQ="
//     }
//   ]
// }
// recordId	The record ID is passed from Kinesis Data Analytics to Lambda during the invocation. The transformed record must contain the same record ID. Any mismatch between the ID of the original record and the ID of the transformed record is treated as a data preprocessing failure.
// result	The status of the data transformation of the record. The possible values are:
// Ok: The record was transformed successfully. Kinesis Data Analytics ingests the record for SQL processing.

// Dropped: The record was dropped intentionally by your processing logic. Kinesis Data Analytics drops the record from SQL processing. The data payload field is optional for a Dropped record.

// ProcessingFailed: The record could not be transformed. Kinesis Data Analytics considers it unsuccessfully processed by your Lambda function and writes an error to the error stream. For more information about the error stream, see Error Handling. The data payload field is optional for a ProcessingFailed record.

// data	The transformed data payload, after base64-encoding. Each data payload can contain multiple JSON documents if the application ingestion data format is JSON. Or each can contain multiple CSV rows (with a row delimiter specified in each row) if the application ingestion data format is CSV. The Kinesis Data Analytics service successfully parses and processes data with either multiple JSON documents or CSV rows within the same data payload.