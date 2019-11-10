require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createImageUrl, createDataUrl, createBlurredSVGDataUrl } = require('../lib/image')
const fileType = require('file-type')
const fetch = require('node-fetch')
const { promisify } = require('util')

const BASE_URL = process.env.FUNC_CLOUDFRONT_BASE_URL
const IMAGE = {
  "_original": "https://images.unsplash.com/photo-1423347834838-5162bb452ca7",
  "_url": "https://images.supersheets.io/eyJrZXkiOiJ0ZXN0LzU2NTAxMGU0MWM2OTQ5NDczZGZjYzM0MWFiMTMwM2MwNTE1NDkzMDcucG5nIn0=",
  "_mediatype": "image/jpeg",
  "_length": 1994229,
  "_bucket": "images.supersheets.io",
  "_key": "test/565010e41c6949473dfcc341ab1303c051549307.png",
  "_etag": "\"7479486ef7dfa55ec32dc24e2c757701\""
}
const DATA_URL = "data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAbACgDASIAAhEBAxEB/8QAGgAAAgMBAQAAAAAAAAAAAAAAAAUDBgcCBP/EACoQAAIBAwIDBwUAAAAAAAAAAAECAwAEEQUhEjFBBiIjUWFxsTJCgZHh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAH/xAAVEQEBAAAAAAAAAAAAAAAAAAAAEf/aAAwDAQACEQMRAD8AtWlaqFiUFunnTJ9ZCLktj2NZfaau3CArA+9TXt0tzYXEbO6u8ZAZGIwem435iqrQrDtPDe2yTQvIFYkDjGDscH4qSbVzj6zWYdnr/gsJoUbEayEhCOQYA/Oa9kmot9rEehORSC2ahrDbgv7b0VQ77UWdCG/BFFBW7G7jkUeOgPrkUyjMuMoyuvoaz6xmk4B3z0p3buxjB4iD5jarEOIrh4LuSPLZK7Ajlg/2pHvnx3s/qkoupo7qEJId9jnfNO4ZnkhDSEMcHmBSBdeagcHBoru+ijdQWQEkCiqP/9k="
const SVG_DATA_URL = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='400' height='240' viewBox='0 0 400 240'%3e %3cfilter id='blur' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3e %3cfeGaussianBlur stdDeviation='20 20' edgeMode='duplicate' /%3e %3cfeComponentTransfer%3e %3cfeFuncA type='discrete' tableValues='1 1' /%3e %3c/feComponentTransfer%3e %3c/filter%3e %3cimage filter='url(%23blur)' xlink:href='data:image/jpeg%3bbase64%2c/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAYACgDASIAAhEBAxEB/8QAGgABAAIDAQAAAAAAAAAAAAAAAAYHAgMEBf/EADEQAAEDAgQCBQ0AAAAAAAAAAAEAAgMEEQUGEiEHExQxQUJxFSJRUmFjgoORobKzwf/EABYBAQEBAAAAAAAAAAAAAAAAAAABAv/EABYRAQEBAAAAAAAAAAAAAAAAAAABEf/aAAwDAQACEQMRAD8A87gjiPRsg4Yy9rGX9r1Y7sdaxty8dXpVDcN8RdT5UoY2ki3M3v7xyl5r2VEEkU1pGyNLXA%2b0WVVYWH5qjraXnM5jGa3Mu49oNusLZNjRI2efqqtwKuMFPNDcsIeHAA7bix%2b4XXJiB9a3gmDHjNihqMh4rC519XK2%2bawoohxHrDNletY4gk6PzaiiI7kzEmQYRTxPbfTq71u8SpZFX0rxfVIzw3RFoamSs6Y4xyxhr29ZOkmx2/q6JGzht2vY4dhDkRBE85un8jVIkaQ3zd/iCIilH//Z' x='0' y='0' height='100%25' width='100%25'/%3e %3c/svg%3e"

//https://css-tricks.com/the-blur-up-technique-for-loading-background-images/

describe('createDataUrl', () => {
  it ('should create preview image data url', async () => {
    let image = {
      bucket: IMAGE["_bucket"],
      key: IMAGE["_key"],
      edits: {
        resize: {
          width: 40,
          fit: "contain"
        }
      }
    }
    let url = await createDataUrl(BASE_URL, image)
    expect(url).toEqual(DATA_URL)
  })
})

describe('createBlurredSVGDataUrl', () => {
  it ('should create preview image data url', async () => {
    let image = {
      bucket: IMAGE["_bucket"],
      key: IMAGE["_key"],
      edits: {
        resize: {
          width: 40,
          height: 24,
          fit: "contain"
        }
      }
    }
    let url = await createDataUrl(BASE_URL, image)
    let svg = createBlurredSVGDataUrl(url, { width: 400, height: 240 })
    expect(svg).toEqual(SVG_DATA_URL)
  })
})


