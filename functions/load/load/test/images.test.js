require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const AWS = require('aws-sdk')
const jessy = require('jessy')

// Supersheets Public Doc Test Images v2
const GOOGLEDOC_URL = 'https://docs.google.com/document/d/1pfrL8KdvYGFrH1huKtcPbNy1qmJMBL_SIy1PZMf-tvw/edit'
const IMAGE_URL = 'https://images.unsplash.com/photo-1423347834838-5162bb452ca7'

const { fetchImages, isValidUrl, fetchImageUrls, fetchGoogleDocImages } = require('../lib/images')
const { fetchDoc } = require('../lib/docs')
const docimages = require('@supersheets/docimages')

describe('isValidUrl', () => {
  it('should accept a valid imageurl', async () => {
    let url = 'https://lh5.googleusercontent.com/JJvSYztcxweFafAZDxE4oARzgB1hHg0V_35taDdFZvo1hJcKDOcdU_8jtXmfrI3nfv6vuq6RmxI6w_YIsMJl16k0WN41PNpoKh50DiopB0_eC-rNwcQjXP1T8n-_YXUd3JRMhS2QrQNZv4k79g'
    let valid = isValidUrl(url)
    expect(valid).toBe(true)
  })
  it ('should not accept url without http(s)', async () => {
    let url = "www.google.com"
    let valid = isValidUrl(url)
    expect(valid).toBe(false)
  })
  it ('should accept url with file extension', async () => {
    let url = "https://this.com/is/my/image.png?blah=true"
    let valid = isValidUrl(url)
    expect(valid).toBe(true)
  })
})

describe('fetchImageUrls', () => {
  let s3 = null
  let options = null
  beforeAll(async () => {
    s3 = new AWS.S3()
    options = {
      Bucket: process.env.FUNC_S3_IMAGE_BUCKET,
      prefix: process.env.FUNC_S3_IMAGE_PREFIX,
      base_url: process.env.FUNC_CLOUDFRONT_IMAGE_BASE_URL
    }
  })
  it('should upload an image to asset bucket', async () => {
    let url = IMAGE_URL
    let cols = [ "cover_image" ]
    let docs = [ { "cover_image": url } ]
    let metadata = { config: { datatypes: { "cover_image": "ImageUrl" } } }
    await fetchImageUrls(s3, options, metadata, cols, docs)
    let image = docs[0]['cover_image']
    expect(image).toMatchObject({
      "_original": "https://images.unsplash.com/photo-1423347834838-5162bb452ca7",
      "_url": expect.stringMatching(/images.supersheets.io\/(.*)/),
      "_bucket": options.Bucket,
      "_mediatype": "image/jpeg",
      "_length": 1994229,
      "_key": expect.stringMatching(/^test\/(.*).png/),
      "_etag": expect.anything()
    })
  }, 30 * 1000)
})

describe('fetchGoogleDocImages', () => {
  let doc = null
  let s3 = null
  let options = null
  beforeAll(async () => {
    doc = await fetchTestDoc(GOOGLEDOC_URL)
    s3 = new AWS.S3()
    options = {
      bucket: process.env.FUNC_S3_IMAGE_BUCKET,
      prefix: process.env.FUNC_S3_IMAGE_PREFIX,
      base_url: process.env.FUNC_CLOUDFRONT_IMAGE_BASE_URL
    }
  })
  it ('should fetch docs for cols and docs', async () => {
    let cols = [ "doc" ]
    let docs = [ { "doc": { "_content": doc } } ]
    let metadata = { config: { datatypes: { "doc": "GoogleDoc" } } }
    await fetchGoogleDocImages(s3, options, metadata, cols, docs)
    let uri = jessy('inlineObjectProperties.embeddedObject.imageProperties.contentUri', docs[0]["doc"]["_content"].inlineObjects["kix.uj9vxj4wrzep"])
    expect(uri).toEqual(expect.stringContaining("https://images.supersheets.io/"))
  }, 30 * 1000)
})

describe('fetchImages', () => {
  let ctx = null
  let doc = null
  beforeAll(async () => {
    doc = await fetchTestDoc(GOOGLEDOC_URL)
  })
  beforeEach(async () => {
    ctx = { 
      state: {
        s3: new AWS.S3()
      },
      env: {
        FUNC_S3_IMAGE_BUCKET: process.env.FUNC_S3_IMAGE_BUCKET,
        FUNC_S3_IMAGE_PREFIX: process.env.FUNC_S3_IMAGE_PREFIX,
        FUNC_CLOUDFRONT_IMAGE_BASE_URL: process.env.FUNC_CLOUDFRONT_IMAGE_BASE_URL
      }
    }
  })
  it ('should fetch ImageUrl and Google Docs', async () => {
    let cols = [ "cover_image", "doc" ]
    let docs = [ { "cover_image": IMAGE_URL, "doc": { "_content": doc } } ]
    let metadata = { config: { datatypes: { "cover_image": "ImageUrl", "doc": "GoogleDoc" } } }
    await fetchImages(ctx, metadata, cols, docs)
    let uri = jessy('inlineObjectProperties.embeddedObject.imageProperties.contentUri', docs[0]["doc"]["_content"].inlineObjects["kix.uj9vxj4wrzep"])
    expect(uri).toEqual(expect.stringContaining("https://images.supersheets.io/"))

    let image = docs[0]['cover_image']
    expect(image).toMatchObject({
      "_original": "https://images.unsplash.com/photo-1423347834838-5162bb452ca7",
      "_url": expect.stringMatching(/images.supersheets.io\/(.*)/),
      "_mediatype": "image/jpeg",
      "_length": 1994229,
      "_key": expect.stringMatching(/^test\/(.*).png/),
      "_etag": expect.anything()
    })
  }, 30 * 1000)
})


async function fetchTestDoc(url) {
  let token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
  let docsapi = axios.create({
    baseURL: process.env.GOOGLEDOCS_BASE_URL
  })
  docsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  return (await fetchDoc(docsapi, url))["_content"]
}