const zlib = require('zlib')
const { GraphQLScalarType } = require('graphql') 
const { Kind } = require('graphql/language')
const { DateTime } = require('luxon')
const remark = require('remark')
const html = require('remark-html')
const { markdown } = require('@supersheets/docdown')
const { getSheetSchemas, generateGraphQLNames } = require('./schema')
const { createImageUrl, createDataUrl, createBlurredSVGDataUrl } = require('./image')
const { createQuery } = require('./mongodb')

const DEFAULT_LENGTH = 128

function createResolvers({ metadata }) {
  let sheetschemas = getSheetSchemas(metadata)
  let sheetresolvers = sheetschemas.map(sheet => createSheetResolvers(sheet, sheet.options))
  let resolvers = sheetresolvers.reduce((resolvers, sheet) => {
    Object.assign(resolvers.Query, sheet.Query)
    delete sheet.Query
    Object.assign(resolvers, sheet)
    return resolvers
  }, { Query: { } })
  return Object.assign(resolvers, createDataTypeResolvers(), createImageTypeResolver())
}

function createSheetResolvers(sheet, { names }) {
  names = Object.assign(generateGraphQLNames(sheet), names || { })
  return Object.assign(
    createSheetQueryResolvers(sheet, { names }),
    createSheetConnectionResolvers(sheet, { names }),
    createSheetFieldResolvers(sheet, { names }),
    createGoogleDocResolvers(sheet, { names })
  )
}

function createSheetQueryResolvers(sheet, { names }) {
  let resolvers = { Query: { } }
  let args = { }
  if (sheet.title != 'Rows') {
    // Kind of hacky, but we know that the schema names
    // the top-level spreadsheet datatype 'Rows' 
    // anything else is an actual sheet
    args['_sheet'] = sheet.title 
  }
  resolvers.Query[names['find']] = createFindResolver(args)
  resolvers.Query[names['findOne']] = createFindOneResolver(args)
  return resolvers
}

function createSheetConnectionResolvers(sheet, { names }) {
  let resolvers = { }
  resolvers[names['connection']] = {
    rows: createRowConnectionEdgesResolver(),
    totalCount: createRowConnectionTotalCountResolver(),
    pageInfo: createRowConnectionPageInfoResolver()
  }
  return resolvers
}

function createSheetFieldResolvers(sheet, { names }) {
  let resolvers = { }
  let typefields = { }
  let columns = sheet.schema.columns
  for (let col of columns) {
    if (col.relationship) {
      let relationship = sheet.schema.relationships && sheet.schema.relationships[col.name]
      if (relationship) {
        typefields[col.name] = createRelationshipResolver(relationship)
      } // how to handle if no relationship schema? Throw?
    } else {
      switch(col.datatype) {
        case "Date":
          typefields[col.name] = createDateFormatResolver()
          break
        case "Datetime":
          typefields[col.name] = createDatetimeFormatResolver()
          break
        case "ImageUrl":
          typefields[col.name] = createImageResolver()
          break
      }
    }
  }
  resolvers[names['type']] = typefields
  return resolvers
}



function createGoogleDocResolvers(sheet, { names }) {
  let resolvers = { }
  for (let col in names.docs) {
    let { type } = names.docs[col]
    resolvers[type] = {
      html: createGoogleDocHtmlResolver(),
      markdown: createGoogleDocMarkdownResolver(),
      excerpt: createGoogleDocExcerptResolver(),
      text: createGoogleDocTextResolver()
    }
  }
  return resolvers
}

function createDataTypeResolvers() {
  return {
    Date: dateScalarType(),
    Datetime: datetimeScalarType()
  }
}

function createFindResolver(queryargs) {
  return async (parent, args, context, info) => {
    context.logger.info(`find args: ${JSON.stringify(args, null, 2)}`)
    let { query, options } = createQuery(args)
    Object.assign(query, queryargs || { })
    context.logger.info(`findOne query: ${JSON.stringify(query, null, 2)}`)
    return { query, options }
  }
}

function createFindOneResolver(queryargs) {
  return async (parent, args, context, info) => {
    context.logger.info(`findOne args: ${JSON.stringify(args, null, 2)}`)
    let { query } = createQuery(args)
    Object.assign(query, queryargs || { })
    context.logger.info(`findOne query: ${JSON.stringify(query, null, 2)}`)
    return await context.collection.findOne(query)
  }
}

function createRowConnectionEdgesResolver() {
  return async ({ query, options }, args, context, info) => {
    let collection = context.collection
    let data = await collection.find(query, options).toArray()
    return data.map(row => ({ row }))
  }
}

function createRowConnectionTotalCountResolver() {
  return async ({ query, options }, args, context, info) => {
    let collection = context.collection
    let n = await collection.countDocuments(query)
    return n
  }
}

function createRowConnectionPageInfoResolver() {
  return async () => {
    return {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null
    }
  }
}

function createDatetimeFormatResolver() {
  return async (parent, args, context, { returnType, parentType, path }) => {
    let key = path.key
    let jsdate = parent[key]
    if (!jsdate) return null

    let { formatString, fromNow, locale, zone, difference } = args
    let opts = { 
      zone: (zone || 'utc'),
      locale: locale || 'en-US'  // noop for now: luxon locale support seems to need additional setup
    }
    
    let d = DateTime.fromISO(jsdate.toISOString(), opts)

    if (formatString) {
      return d.toFormat(formatString)
    } else if (fromNow) {
      return d.toRelative()
    } else if (difference) {
      return d.diff(args.difference).toISO()
    } else {
      return d.toISO()
    }
  }
}

function createDateFormatResolver() {
  return async (parent, args, context, { returnType, parentType, path }) => {
    let key = path.key
    let jsdate = parent[key]
    if (!jsdate) return null

    let { formatString, fromNow, locale, zone, difference } = args
    let opts = { 
      zone: zone || 'utc',
      setZone: true,
      locale: locale || 'en-US'  // noop for now: luxon locale support seems to need additional setup
    }

    // very hacky: we strip the 'Z' so that Luxon 
    // won't set to UTC and use opts.zone instead 
    // and opts.setZone so that it doesn't convert
    let d = DateTime.fromISO(jsdate.toISOString().replace("Z", ""), opts)

    if (formatString) {
      return d.toFormat(formatString)
    } else if (fromNow) {
      return d.toRelative()
    } else if (difference) {
      return d.diff(difference).toISO()
    } else {
      return d.toISO().split("T")[0]
    }
  }
}

function createGoogleDocHtmlResolver() {
  return async (parent, args, context,  { returnType, parentType, path }) => {
    if (!parent["_content"]) return null
    let doc = decompress(parent["_content"])
    return (await remark().use(html).process(markdown(doc))).toString()
  }
}

function createGoogleDocMarkdownResolver() {
  return async (parent, args, context, { returnType, parentType, path }) => {
    if (!parent["_content"]) return null
    let doc = decompress(parent["_content"])
    return markdown(doc)
  }
}

function createGoogleDocExcerptResolver() {
  return async (parent, args, context, { returnType, parentType, path }) => {
    if (!parent["_text"]) return null
    return excerpt(parent["_text"], { length: args.pruneLength || DEFAULT_LENGTH })
  } 
}

function createGoogleDocTextResolver() {
  return async (parent, args, context, { returnType, parentType, path }) => {
    return parent["_text"] || null
  }
}

function createImageResolver() {
  return async (parent, args, context, { returnType, parentType, path }) => {
    let key = path.key
    let image = parent[key]
    if (!image) return null
    return { image, edits: args.edits || null }
  }
}

function createImageTypeResolver() {
  return {
    Image: {
      src: createImageSrcResolver(),
      blurup: createImageBlurUpResolver()
    }
  }
}

function createImageSrcResolver() {
  return async ({ image, edits }, args, context, { returnType, parentType, path }) => {
    if (edits) {
      let requestBody = { 
        bucket: image["_bucket"],
        key: image["_key"],
        edits
      }
      return createImageUrl(image["_bucket"], requestBody)
    } else {
      return image["_url"]
    }
  }
}

function createImageBlurUpResolver() {
  return async ({ image, edits }, args, context, { returnType, parentType, path }) => {
    let request = { 
      bucket: image["_bucket"], 
      key: image["_key"],
      edits: edits || { }
    }
    let scale = args.scale || 0.05
    request.edits.resize = request.edits.resize || { }
    request.edits.resize.width = args.width || (edits.resize && edits.resize.width) || 800
    request.edits.resize.height = args.height || (edits.resize && edits.resize.height) || 600
    request.edits.resize.fit = request.edits.resize.fit || "contain"
    let thumbnail = JSON.parse(JSON.stringify(request))
    thumbnail.edits.resize.width = Math.round(thumbnail.edits.resize.width * scale)
    thumbnail.edits.resize.height = Math.round(thumbnail.edits.resize.height * scale)
    let data = await createDataUrl(image["_bucket"], thumbnail)
    if (args.format && args.format == "image") {
      return data
    } else {
      let svg = createBlurredSVGDataUrl(data, { width: request.edits.resize.width, height: request.edits.resize.height })
      return svg
    }
  }
}

function createRelationshipResolver(relationship) {
  // relationship: {
  //   sheet: "Authors",
  //   field: "email",
  //   operator: "eq"
  // }
  // val: "danieljyoo@gmail.com"
  return async (parent, args, context, { returnType, parentType, path }) => {
    let key = path.key
    let val = parent[key] 
    let query = { _sheet: relationship['sheet'] }
    query[relationship['field']] = { }
    query[relationship['field']][`$${relationship['operator']}`] = val
    context.logger.info(`relationship query: ${JSON.stringify(query, null, 2)}`)
    let res = await context.loader.load(query)
    return res || [ ]
  }
}

function decompress(data) {
  return JSON.parse(zlib.gunzipSync(Buffer.from(data, 'base64')))
}

function excerpt(s, options) {
  if (!s) return null
  maxlength = options.length || DEFAULT_LENGTH
  let suffix = options.suffix || ''
  let n = maxlength - suffix.length
  if (s.length > maxlength) {
    return `${s.substring(0, n)}${suffix}`
  }
  return s
}


function dateScalarType() {
  return new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return value // value from the client
    },
    serialize(value) {
      return value
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return ast.value && new Date(ast.value) || null // ast value is always in string format
      }
      return null;
    },
  })
}

function datetimeScalarType() {
  return new GraphQLScalarType({
    name: 'Datetime',
    description: 'Datetime custom scalar type',
    parseValue(value) {
      return value // value from the client
    },
    serialize(value) {
      return value
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return ast.value && new Date(ast.value) || null // ast value is always in string format
      }
      return null;
    },
  })
}

function encodeEdits(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

module.exports = {
  createResolvers,
  createSheetResolvers,
  createSheetQueryResolvers,
  createSheetConnectionResolvers,
  createSheetFieldResolvers,
  createDateFormatResolver,
  createDatetimeFormatResolver,
  createRelationshipResolver
}
