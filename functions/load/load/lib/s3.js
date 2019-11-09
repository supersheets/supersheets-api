const AWS = require('aws-sdk')

async function setS3(ctx, next) {
  if (ctx.state.s3) return 
  ctx.state.s3 = new AWS.S3()
  return await next()
}

module.exports = {
  setS3
}