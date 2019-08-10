// Taken from Gatsby run-sift.js
// https://github.com/gatsbyjs/gatsby/blob/6dc8a14f8efc78425b1f225901dce7264001e962/packages/gatsby/src/redux/run-sift.js#L39
// Explained here:
// https://www.gatsbyjs.org/docs/schema-sift/

const _ = require(`lodash`)
const Minimatch = require(`minimatch`).Minimatch

function siftifyArgs(object) {
  const newObject = {}
  _.each(object, (v, k) => {
    if (_.isPlainObject(v)) {
      if (k === `elemMatch`) {
        k = `$elemMatch`
      }
      newObject[k] = siftifyArgs(v)
    } else {
      // Compile regex first.
      if (k === `regex`) {
        newObject[`$regex`] = prepareRegex(v)
      } else if (k === `glob`) {
        const Minimatch = require(`minimatch`).Minimatch
        const mm = new Minimatch(v)
        newObject[`$regex`] = mm.makeRe()
      } else {
        newObject[`$${k}`] = v
      }
    }
  })
  return newObject
}

// Build an object that excludes the innermost leafs,
// this avoids including { eq: x } when resolving fields.
const extractFieldsToSift = filter =>
  Object.keys(filter).reduce((acc, key) => {
    const value = filter[key]
    const k = Object.keys(value)[0]
    const v = value[k]
    if (key === `elemMatch`) {
      acc[k] = extractFieldsToSift(v)
    } else if (_.isPlainObject(value) && _.isPlainObject(v)) {
      acc[key] = extractFieldsToSift(value)
    } else {
      acc[key] = true
    }
    return acc
  }, {})

// From Gatsby 
// https://github.com/gatsbyjs/gatsby/blob/6dc8a14f8efc78425b1f225901dce7264001e962/packages/gatsby/src/utils/prepare-regex.js
function prepareRegex(str) {
  const exploded = str.split(`/`)
  const regex = new RegExp(
    exploded
      .slice(1, -1)
      .join(`/`)
      // Double escaping is needed to get past the GraphQL parser,
      // but single escaping is needed for the RegExp constructor,
      // i.e. `"\\\\w+"` for `/\w+/`.
      .replace(/\\\\/, `\\`),
    _.last(exploded)
  )
  return regex
}

module.exports = {
  siftifyArgs,
  extractFieldsToSift,
  prepareRegex
}