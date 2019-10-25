const { GraphQLScalarType } = require('graphql') 
const { Kind } = require('graphql/language')
const { DateTime } = require('luxon')
const { getSheetSchemas, generateGraphQLNames } = require('./schema')
const { createQuery } = require('./mongodb')

function createResolvers({ metadata }) {
  let sheetschemas = getSheetSchemas(metadata)
  let sheetresolvers = sheetschemas.map(sheet => createSheetResolvers(sheet, sheet.options))
  let resolvers = sheetresolvers.reduce((resolvers, sheet) => {
    Object.assign(resolvers.Query, sheet.Query)
    delete sheet.Query
    Object.assign(resolvers, sheet)
    return resolvers
  }, { Query: { } })
  return Object.assign(resolvers, createDataTypeResolvers())
}

function createSheetResolvers(sheet, { names }) {
  names = Object.assign(generateGraphQLNames(sheet), names || { })
  return Object.assign(
    createSheetQueryResolvers(sheet, { names }),
    createSheetConnectionResolvers(sheet, { names }),
    createSheetFieldResolvers(sheet, { names })
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
    switch(col.datatype) {
      case "Date":
        typefields[col.name] = createDateFormatResolver()
        break
      case "Datetime":
        typefields[col.name] = createDatetimeFormatResolver()
        break
    }
  }
  resolvers[names['type']] = typefields
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


module.exports = {
  createResolvers,
  createSheetResolvers,
  createSheetQueryResolvers,
  createSheetConnectionResolvers,
  createSheetFieldResolvers,
  createDateFormatResolver,
  createDatetimeFormatResolver
}