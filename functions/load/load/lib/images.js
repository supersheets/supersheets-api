const docimages = require('@supersheets/docimages')

async function fetchImages(ctx, metadata, cols, docs) {
  let s3 = ctx.state.s3
  let options = {
    bucket: ctx.env.FUNC_S3_IMAGE_BUCKET,
    prefix: ctx.env.FUNC_S3_IMAGE_PREFIX,
    base_url: ctx.env.FUNC_CLOUDFRONT_IMAGE_BASE_URL,
    //skip: { }
  }
  let doccols = filterGoogleDocColumns(metadata, cols)
  for (let doc of docs) {
    for (let col of doccols) {
      if (doc[col] && doc[col]["_content"]) {
        let res = await docimages(s3, doc[col]["_content"], options)
        doc[col]["_content"] = res.doc
      }
    }
  }
}

function filterGoogleDocColumns(metadata, cols) {
  let datatypes = metadata.config && metadata.config.datatypes || { }
  return cols.filter(col => datatypes[col] == "GoogleDoc")
}

module.exports = {
  fetchImages
}