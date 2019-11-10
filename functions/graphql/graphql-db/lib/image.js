const fetch = require('node-fetch')
const fileType = require('file-type')
const svgToMiniDataURI = require('mini-svg-data-uri')

function encodeEdits(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

function createImageUrl(host, obj) {
  if (host.startsWith("http")) {
    return `${host}/${encodeEdits(obj)}`
  }
  return `https://${host}/${encodeEdits(obj)}`
}

async function createDataUrl(host, obj) {
  let url = createImageUrl(host, obj)
  return await fetchIntoDataUrl(url)
}

async function fetchIntoDataUrl(url) {
  let res = await fetch(url)
  let buffer = await res.buffer()
  let imageType = fileType(buffer)
  let data = buffer.toString('base64')
  return `data:${imageType.mime};base64,${data}`
}

function createBlurredSVGDataUrl(data, options) {
  options = options || { }
  let width = options.width
  let height = options.height
  let blur = options.blur || 20
  
  return svgToMiniDataURI(`<svg xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${width}" height="${height}"
      viewBox="0 0 ${width} ${height}">
    <filter id="blur" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="${blur} ${blur}" edgeMode="duplicate" />
      <feComponentTransfer>
        <feFuncA type="discrete" tableValues="1 1" />
      </feComponentTransfer>
    </filter>
    <image filter="url(#blur)"
          xlink:href="${data}"
          x="0" y="0"
          height="100%" width="100%"/>
  </svg>`)
}

module.exports = {
  encodeEdits,
  createImageUrl,
  createDataUrl,
  fetchIntoDataUrl,
  createBlurredSVGDataUrl
}