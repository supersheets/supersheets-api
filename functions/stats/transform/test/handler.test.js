require('dotenv').config()

const path = require('path')
const fs = require('fs')
const { gzip } = require('node-gzip')
let { handler } = require('../index')

describe('Handler', () => {
  it ('should return all records with no reingestion', async () => {
    let event = await createTestEvent()
    let result = await handler(event, { })
    expect(result).toEqual({
      "records": [
        {
          "recordId": "49578734086442259037497492980620233840400173390482112514000000",
          "result": "Dropped"
        },
        {
          "recordId": "49578734086442259037497492980621442766219788363254202370000000",
          "result": "Ok",
          "data": "ODQ5OTg0NmEtODhjMS00ZmIzLWJmY2EtMTE3ZWMwMjNjNWMzCjU2MTUxNTJmLWFlM2UtNDE2My1iYmQwLWMyNmEyNDFlNGNhMQpiZmFjYmVlYi1lNWFiLTRiZGQtYjZmYy00ZjBiZWJkNGZhMDkK"
        },
        {
          "recordId": "49578734086442259037497492980622651692039402992428908546000000",
          "result": "Ok",
          "data": "YTI0ZGQ3NTktY2UzMS00YWUwLThlZjktMTRjNDJhMjFmMGQ5CmFjOGI0YjUwLTQyOWEtNDJlYy1iZTAwLTYzZTVkZTE2OWU5NApmMWVjMjBjMC1iODY0LTQ4NDMtYWUzZi01ZmYxMjVhNDJjMTYK"
        },
        {
          "recordId": "49578734086442259037497492980623860617859017621603614722000000",
          "result": "Ok",
          "data": "ZTMwYjZmNDYtNTZhZS00NzAzLTk0OWQtNTlmMjdmNDljMTY5CjY1MTAwY2YyLTAwOTktNDdhMy1hMmYyLTc4OWI3YThhYWZkYgo3NDAxY2U2My0zNTYzLTRhYTAtODhmMS0zMzljMmU4OGZmOGQK"
        }
      ]
    })
  })
  it ('should return all records with 1 batch reingestion', async () => {
    process.env['MAX_LAMBDA_SIZE'] = "500"
    process.env['MAX_FIREHOSE_SIZE'] = "4000000"
    process.env['MAX_FIREHOSE_RECORDS'] = "500"
    let event = await createTestEvent()
    let result = await handler(event, { })
    expect(result.records.map(r => r.result)).toEqual([
      "Dropped",
      "Ok",
      "Dropped", // reingested
      "Dropped"  // reingested
    ])
  })
  it ('should return all records with 2 batches of reingestion', async () => {
    process.env['MAX_LAMBDA_SIZE'] = "500"
    process.env['MAX_FIREHOSE_SIZE'] = "4000000"
    process.env['MAX_FIREHOSE_RECORDS'] = "1"
    let event = await createTestEvent()
    let result = await handler(event, { })
    expect(result.records.map(r => r.result)).toEqual([
      "Dropped",
      "Ok",
      "Dropped", // reingested
      "Dropped"  // reingested
    ])
  })
})

async function createTestEvent() {
  return { 
    "region": "us-west-2",
    "deliveryStreamArn": process.env.FIREHOSE_ARN,
    "invocationId": "a7234216-12b6-4bc0-96d7-82606c0e80cf",
    "records": getTestEvent('event.compressed.json').records
  }
}

function getTestEvent(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'events', name)).toString('utf8'))
}


// Amazon Kinesis Data Firehose Cloudwatch Logs Processor

// {
//   "records": [
//     {
//       "recordId": "49578734086442259037497492980620233840400173390482112514000000",
//       "data": "H4sIAAAAAAAAADWO0QqCMBiFX2XsWiJFi7wLUW8sIYUuQmLpnxvpJttMQnz3Ztrlxzmc8424BaVIDfmnA+zjID3nlzS5n8IsO8YhtrAYOMg5aURfDUSXNBG1MkEj6liKvjPZQpmWQNoFVf9QpWSdZoJHrNEgFfZvxa8XvoHrGUfMqqWumdHQpDVjtmdvHc91dwdn71p/vVngmqBVD616PgoolC/Ga0SBNJoi8USVWWKczM8oYhKoULDBUzF9Aeua5yHsAAAA",
//       "approximateArrivalTimestamp": 1510254469499
//     },
//     {
//       "recordId": "49578734086442259037497492980621442766219788363254202370000000",
//       "data": "H4sIAAAAAAAAAJWRTWsbMRCG/8ueLZjRjL5yc9NNLnZDapemlFAkrTYstb3Lep0Qgv97x00KgTSHnAQzmkeP3nmqtmW/j3dl/TiU6qz6PF/Pfy3r1Wp+WVezqn/YlVHK2pK3Hr0Jxkt5099djv1hkE7uh0eVHzZqE7epiarb3fe/ixzDYVJoELRhssYQqsXLlEJ3jd8//biy4QYWz7jVNJa4/TDveQwV+qsada0v/HnthLg/pH0eu2Hq+t1Ft5nKuK/Ofn4EvnpDUAu7Xi6/LL9en3/z1e1f7fq+7KYT+qnqGrEnsi54AGS2wbHWxjCjoWAYGawmzawByIG3Dp0JzjOxsaI8dbKJKW4l1BcTdgg+zP5tSPCeQ/Bso/I+o+I2kUptjgrRlQyasslUHWdvZRwGJ4+HYJGCtiKgQTYKSJ4gODLgAkpFk3f0rkyA1zLGSsvoVsVCRTFakUkNqKxt1IyFc8T/y0gEmoHZo5a/W9HhU0TeWHMyIJaoQC6zDvC+DL6WSW3MqZSkiolJcWoalWybJSNIJTXcRgjV8fb4BwwLrNzwAgAA",
//       "approximateArrivalTimestamp": 1510254473773
//     },
//     {
//       "recordId": "49578734086442259037497492980622651692039402992428908546000000",
//       "data": "H4sIAAAAAAAAAJWRbWsbMQyA/8t9jkGSJdnut2zLCiXZyJKyZaMM352vHEty4e7SUkr++9yXwUbXD8Vgg2w9eizdF7s0DPE6re8OqTgrPkzX05+L2Wo1PZ8Vk6K73ac+h0mtV49egvgc3nbX5313POSbqjvcmep2a7ZxV9bRtPub7lfKx+E4GhQEErYqYtHMn7MMuiV+fbf5rOEbzJ9wq7FPcfdm3lOaNReXyws/3cw2fvk9A4djOVR9exjbbv+x3Y6pH4qzH29hr14QzFzXi8WnxZfl+0tfXD1az27SfnxA3xdtneWtVRc8ADJrcEwkwoxigzAyiBNxzkJuIxGrei+g3gbgrDy2eRBj3OWePpuwQ/Bh8mdAGR+J69pJMFXKihwTGJ+aYJArpkjYQB2K0+SljMPgyFIIijaQgs2BAMEyexbns1NeoqpsCV+VCfCPTOVLLgUMU4h5S5UpE4BRm6ROqCEF/r8MExBDro3ED0XBMigFVM0iQlkRvZLml9a/LoN/yzSYKoIKTOmVTf6VNTHZxkjTIElkqlCL09XpN5PgkxrvAgAA",
//       "approximateArrivalTimestamp": 1510254474027
//     },
//     {
//       "recordId": "49578734086442259037497492980623860617859017621603614722000000",
//       "data": "H4sIAAAAAAAAAJWRW28aQQyF/8s+M9J47LHHeaMtzUOhEQXSVlVUDctstCqwCJZEUcR/r3OpFCnNQ17mcjw+8+n4vtqUwyFfl/ndrlRn1afhfPh7MprNhuejalB1t9uyNzkwJk6QosZk8rq7Pt93x51V6m535+rbtVvnzXKVXbu96f4U23bH3kEEHyIhx4jgxs9dDmQK3z/8vGD94cdPdrN+X/Lm3X5PbcHp5QLkYrqYLC6/mOHhuDzU+3bXt932c7vuy/5Qnf16j/fslYMb83wy+Tr5Nv24SNXVI/Xopmz7B+v7ql0ZPCKLJu+BiFUohBiJIKJGAvIkSTgpsU8aVBNangymsCH3rQ2izxvL9JmEBOzh4N+AzL6gX3JD7CLn4kg8OiVduahNkIa0BtbqNHgNI6AS0P5kQA3sUcA4IDCElCBKwgdgiCoI+CaM+pcwbAVfN8F5r2owGV0OdpWkS8kp52a1/D8MBR8sDUoQKDIbDnqlhAgQLTMWz8YbRQT92zDwEkbIQ10YHUZbKGfvUmrAIWodih2btKpOV6e/zXGIX+8CAAA=",
//       "approximateArrivalTimestamp": 1510254474388
//     }
//   ],
//   "region": "us-west-2",
//   "deliveryStreamArn": "arn:aws:firehose:us-west-2:123456789012:deliverystream/copy-cwl-lambda-invoke-input-151025436553-Firehose-8KILJ01Q5OBN",
//   "invocationId": "a7234216-12b6-4bc0-96d7-82606c0e80cf"
// }