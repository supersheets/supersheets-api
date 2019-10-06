const path = require('path')
const fs = require('fs')
const { gql } = require('apollo-server-lambda')
const { GraphQLScalarType, buildSchema } = require('graphql') 
const { Kind } = require('graphql/language')
const { DateTime } = require('luxon')

async function fetchSchema(axios) {
  let res = (await axios.get(`graphql/schema`)).data
  const schemastr = res.schema
  let typeDefs =  gql`${schemastr}`
  return typeDefs 
}

function createResolvers({ typeDefs }) {
  let standard = {
    Query: {
      find: createFindResolver(),
      findOne: createFindOneResolver()
    },
    RowConnection: {
      edges: createRowConnectionEdgesResolver(),
      totalCount: createRowConnectionTotalCountResolver(),
      pageInfo: async () => {
        return {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null
        }
      }
    },
    Date: dateScalarType(),
    Datetime: datetimeScalarType()
  }
  let dateFormatResolvers = createDateFormatResolvers(typeDefs)
  return Object.assign(standard, dateFormatResolvers)
}

function getGraphQLFieldNameAndType(field) {
  let name = field.name.value
  let type = field.type && field.type.name && field.type.name.value || null
  return { name, type }
}

// typeDefs {
//   kind: "Document",
//   definitions: [ ... ],
//   loc: {
//     start: 0
//     end: 2858
//   }
// }
function createDateFormatResolvers(typeDefs) {
  let resolvers = { }
  let objectTypes = typeDefs.definitions.filter(def => def.kind == "ObjectTypeDefinition")
  let objectTypesWithDateFields = objectTypes.filter(def => {
    let types = def.fields.map(field => getGraphQLFieldNameAndType(field).type)
    return types.includes("Date") || types.includes("Datetime") || false
  })
  for (let def of objectTypesWithDateFields) {
    let fieldName = def.name.value
    if (!resolvers[fieldName]) {
      resolvers[fieldName] = { }
    }
    for (let field of def.fields) {
      let { name, type } = getGraphQLFieldNameAndType(field)
      console.log("name", name, "type", type)
      if (type == "Date" || type == "Datetime") {
        resolvers[fieldName][name] = createDateFormatResolver()
        console.log('added date resolver', name, resolvers[fieldName][name])
      }
    }
  }
  console.log("resolvers", JSON.stringify(resolvers, null, 2))
  return resolvers
}

function createFindResolver() {
  return async (parent, args, context, info) => {
    context.logger.info(`find args: ${JSON.stringify(args, null, 2)}`)
    let { query, options } = createQuery(args)
    context.logger.info(`findOne query: ${JSON.stringify(query, null, 2)}`)
    return { query, options }
  }
}

function createFindOneResolver() {
  return async (parent, args, context, info) => {
    context.logger.info(`findOne args: ${JSON.stringify(args, null, 2)}`)
    let { query } = createQuery(args)
    context.logger.info(`findOne query: ${JSON.stringify(query, null, 2)}`)
    return await context.collection.findOne(query)
  }
}

function createRowConnectionEdgesResolver() {
  return async ({ query, options }, args, context, info) => {
    let collection = context.collection
    let data = await collection.find(query, options).toArray()
    return data.map(node => ({ node }))
  }
}

function createDateFormatResolver() {
  return async (parent, args, context, { returnType, parentType, path }) => {
    let key = path.key
    let opts = { 
      zone: args.zone || 'utc'
    }
    if (args.locale) {
      opts.locale = args.locale
    }
    let d = DateTime.fromISO(parent[key].toISOString(), opts)
    if (args.formatString) {
      value = d.toFormat(args.formatString)
    } else if (args.fromNow) {
      value = d.toRelative()
    } else if (args.difference) {
      value = d.diff(args.difference).toISO()
    } else {
      value = d.toISO()
      if (returnType == "Date") {
        value = value.split("T")[0]
      }
    }
    console.log("dateformatresolver", value, parent[key], args, { key, returnType, parentType })
    return value
  }
}


function createRowConnectionTotalCountResolver() {
  return async ({ query, options }, args, context, info) => {
    let collection = context.collection
    let n = await collection.countDocuments(query)
    return n
  }
}

function createQuery(args) {
  let query = { }
  let options = { }
  if (args.filter) {
    //console.log('args.filter', JSON.stringify(args.filter, null, 2))
    query = formatFieldNames(formatOperators(args.filter))
    //console.log('query', JSON.stringify(query, null, 2))
  }
  if (args.skip) {
    options.skip = args.skip
  }
  if (args.limit) {
    options.limit = args.limit
  }
  if (args.sort) {
    options.sort = formatSort(args.sort)
  }
  if (args.projection) {
    options.projection = args.projection
  }
  return { query, options }
}

async function makeRequest(axios, query) {
  let data = (await axios.post(`find`, query)).data
  return data.result
}

function dateScalarType() {
  return new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return value // value from the client
    },
    serialize(value) {
      console.log('date serialize', JSON.stringify(value, null, 2))
      return value
      // return value && value.toISOString().split('T')[0] || null; // "2019-08-01"  // value sent to the client
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

// https://docs.mongodb.com/manual/reference/operator/query/
const OPERATORS = [
  // Comparison
  'eq', 'gt', 'gte', 'in', 'lt', 'lte', 'ne', 'nin',
  // Logical
  'and', 'not', 'nor', 'or',
  // Element
  'exists', 'type',
  // Evaluation
  'expr', 'jsonSchema', 'mod', 'regex', 'options', 'text', 'where',
  // Geospatial
  'geoIntersects', 'geoWithin', 'near', 'nearSphere',
  // Array
  'all', 'elemMatch', 'size',
  // Bitwise
  'bitsAllClear', 'bitsAllSet$bitsAnyClear$bitsAnySet',
  // Comments
  'comment',
  // Projection
  // '$' not sure how to support his
  'elemMatch', 'meta', 'slice'
]

function addDollarIfOperator(k) {
  return OPERATORS.includes(k) && `$${k}` || k
}

function formatOperators(filter) {
  let formatted = { }
  for (let k in filter) {
    switch (typeof filter[k]) {
      case "object": 
        if (isDateObject(filter[k])) {
          formatted[addDollarIfOperator(k)] = filter[k]
        } else if (Array.isArray(filter[k])) {
          formatted[addDollarIfOperator(k)] = filter[k]
        } else {
          formatted[addDollarIfOperator(k)] = formatOperators(filter[k])
        }
        break
      default:
        formatted[addDollarIfOperator(k)] = filter[k]
    }
  }
  return formatted
}

function formatFieldNames(filter) {
  let formatted = { }
  for (let k in filter) {
    switch (typeof filter[k]) {
      case "object": 
        if (isDateObject(filter[k])) {
          formatted[dotNotation(k)] = filter[k]
        } else if (Array.isArray(filter[k])) {
          formatted[dotNotation(k)] = filter[k]
        } else {
          formatted[dotNotation(k)] = formatFieldNames(filter[k])
        }
        break
      default:
        formatted[dotNotation(k)] = filter[k]
    }
  }
  return formatted
}

function dotNotation(k) {
  if (k && k.includes("___")) {
    return k.replace(/___/g, '.')
  }
  return k
}

function isDateObject(obj) {
  return obj instanceof Date
}

// { fields: [ ], order: [ 'ASC', 'DESC' ] } => [ [ field1, asc ], [ field2, desc ] ]
function formatSort(sort) {
  let formatted = [ ]
  for (let i = 0; i<sort.fields.length; i++) {
    formatted.push([ sort.fields[i], (sort.order[i] || 'ASC') ])
  }
  return formatted
}

module.exports = {
  fetchSchema,
  createResolvers
}

// All the resolvers need to do is translate the query to
// something we can use to make a http find request 
// const resolvers = {
//   Query: {
//     find: findResolver,
//     findOne: findOneResolver
//   },
//   Date: dateScalarType()
// }

// async function findResolver(parent, args, context, info) {
//   let id = context.event.pathParameters.spreadsheetid
//   let query = createQuery(args)
//   console.log(`find: ${JSON.stringify(query, null, 2)}`)
//   return await makeRequest(id, query)
// }

// async function findOneResolver(parent, args, context, info) {
//   let id = context.event.pathParameters.spreadsheetid
//   let query = createQuery(args)
//   query.one = true
//   console.log(`findOne: ${JSON.stringify(query, null, 2)}`)
//   return await makeRequest(id, query)
// }
