const docimages = require('@supersheets/docimages')
const { streamUrlToS3 } = require('@supersheets/docimages/lib/s3')
const { encodeUri } = require('@supersheets/docimages/lib/images')

const URL_WITH_PROTO = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
const URL_WITHOUT_PROTO = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi

async function fetchImages(ctx, metadata, cols, docs) {
  let s3 = ctx.state.s3
  let options = {
    bucket: ctx.env.FUNC_S3_IMAGE_BUCKET,
    prefix: ctx.env.FUNC_S3_IMAGE_PREFIX,
    base_url: ctx.env.FUNC_CLOUDFRONT_IMAGE_BASE_URL,
    //skip: { }
  }
  await fetchGoogleDocImages(s3, options, metadata, cols, docs)
  await fetchImageUrls(s3, options, metadata, cols, docs)
}

async function fetchImageUrls(s3, options, metadata, cols, docs) {
  options.Bucket = options.Bucket || options.bucket
  let imgcols = filterImageUrlColumns(metadata, cols)
  for (let doc of docs) {
    for (let col of imgcols) {
      if (doc[col] && isValidUrl(doc[col])) {
        let original = doc[col]
        let { meta, upload } = await streamUrlToS3(s3, original, options)
        let url = `${options.base_url}/${encodeUri(upload.bucket, upload.key)}`
        doc[col] = {
          _original: original,
          _url: url,
          _mediatype: meta.type,
          _length: meta.length,
          _bucket: upload.Bucket,
          _key: upload.key,
          _etag: upload.ETag
        }
      }
    }
  }
}

async function fetchGoogleDocImages(s3, options, metadata, cols, docs) {
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
  let datatypes = getDatatypes(metadata)
  return cols.filter(col => datatypes[col] == "GoogleDoc")
}

function filterImageUrlColumns(metadata, cols) {
  let datatypes = getDatatypes(metadata)
  return cols.filter(col => datatypes[col] == "ImageUrl")
}

function getDatatypes(metadata) {
  return metadata.config && metadata.config.datatypes || { }
}

function isValidUrl(url) {
  return url.match(URL_WITH_PROTO) && true || false
}

module.exports = {
  isValidUrl,
  fetchImages,
  fetchImageUrls,
  fetchGoogleDocImages
}