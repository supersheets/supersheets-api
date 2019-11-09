require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const AWS = require('aws-sdk')
const jessy = require('jessy')

// Supersheets Public Doc Test Images v2
const GOOGLEDOC_URL = 'https://docs.google.com/document/d/1pfrL8KdvYGFrH1huKtcPbNy1qmJMBL_SIy1PZMf-tvw/edit'

const { fetchImages } = require('../lib/images')
const { fetchDoc } = require('../lib/docs')
const docimages = require('@supersheets/docimages')

describe('fetchImages', () => {
  let token = null
  let docsapi = null
  let doc = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    docsapi = axios.create({
      baseURL: process.env.GOOGLEDOCS_BASE_URL
    })
    docsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
    doc = (await fetchDoc(docsapi, GOOGLEDOC_URL))["_content"]
  })
  it ('should use docimages', async () => {
    let doc2 = JSON.parse(JSON.stringify(doc))
    let res = await docimages(new AWS.S3(), doc2, {
      bucket: process.env.FUNC_S3_IMAGE_BUCKET,
      prefix: process.env.FUNC_S3_IMAGE_PREFIX,
      base_url: process.env.FUNC_CLOUDFRONT_IMAGE_BASE_URL
    })
  })
  it ('should fetch docs for cols and docs', async () => {
    let ctx = { 
      state: {
        s3: new AWS.S3()
      },
      env: {
        FUNC_S3_IMAGE_BUCKET: process.env.FUNC_S3_IMAGE_BUCKET,
        FUNC_S3_IMAGE_PREFIX: process.env.FUNC_S3_IMAGE_PREFIX,
        FUNC_CLOUDFRONT_IMAGE_BASE_URL: process.env.FUNC_CLOUDFRONT_IMAGE_BASE_URL
      }
    }
    let cols = [ "doc" ]
    let docs = [ { "doc": { "_content": doc } } ]
    let metadata = { config: { datatypes: { "doc": "GoogleDoc" } } }
    await fetchImages(ctx, metadata, cols, docs)
    let uri = jessy('inlineObjectProperties.embeddedObject.imageProperties.contentUri', docs[0]["doc"]["_content"].inlineObjects["kix.uj9vxj4wrzep"])
    expect(uri).toEqual(expect.stringContaining("https://images.supersheets.io/"))
  })
})