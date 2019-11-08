const { JSONPath } = require('jsonpath-plus')


const convertToPlainText = (v) => {
  if (typeof v === 'string') {
    if (v.trim() === "") return null
    return v
  }
  let path = "$..elements..textRun..content"
  let lines = JSONPath(path, v)
  let val = lines.join('').trim()
  if (val === "") return null
  return val
}

module.exports = {
  convertToPlainText
}