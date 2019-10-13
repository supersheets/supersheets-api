require('dotenv').config()
const AWS = require('aws-sdk')
const athena = require("athena-client")
const { executeQuery } = require('../lib/athena')

// describe('executeQuery', () => {
//   it ('should execute a select on a view', async () => {
//     let athena = new AWS.Athena()
//     let spreadsheetid = '1Li6CHJtW5ShwzVDRFRMCjhYPfmNNWRamquW4S_EaCck'
//     let query = `select * from monthly_stats_supersheets_io where spreadsheetid='${spreadsheetid}'`
//     let results = await executeQuery(athena, 'supersheets-stats', query)
//     console.log(JSON.stringify(results, null, 2))
//   }, 60 * 1000)
// })

describe('athena-client', () => {
  beforeAll(async () => {

  })
  it ('should execute query using athena-client', async () => {
    // https://github.com/KoteiIto/node-athena
    const clientConfig = {
      database: process.env.ATHENA_DATABASE,
      bucketUri: process.env.ATHENA_S3_URI
    }
    const awsConfig = {
        region: process.env.ATHENA_REGION, 
    }
    let client = athena.createClient(clientConfig, awsConfig)
    let spreadsheetid = '1Li6CHJtW5ShwzVDRFRMCjhYPfmNNWRamquW4S_EaCck'
    let query = `select * from monthly_stats_supersheets_io where spreadsheetid='${spreadsheetid}'`
    let data = await client.execute(query).toPromise()
    console.log("clientdata", JSON.stringify(data, null, 2))
  }, 60 * 1000)
})