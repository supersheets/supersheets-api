
require('dotenv').config()
const { promisify } = require('util')
const uuidV4 = require('uuid/v4')
const AWS = require('aws-sdk')
const stepfunctions = new AWS.StepFunctions()
const LOAD_ARN = "arn:aws:states:us-east-1:233748856986:stateMachine:external-step-test"
const startExecution = promisify(stepfunctions.startExecution).bind(stepfunctions)

describe('Basic AWS Step Execution', () => {
  it ('should invoke a step function', async () => {
    let name = `step-test-${uuidV4()}`
    let params = {
      stateMachineArn: LOAD_ARN,
      input: JSON.stringify({ hello: "world" }),
      name
    }
    let res = await startExecution(params)
    expect(res).toMatchObject({
      executionArn: `arn:aws:states:us-east-1:233748856986:execution:external-step-test:${name}`,
      startDate: expect.anything()
    })
  })
})