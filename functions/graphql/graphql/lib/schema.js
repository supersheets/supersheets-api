const path = require('path')
const fs = require('fs')
const { gql } = require('apollo-server-lambda')
const { GraphQLScalarType } = require('graphql') 

async function fetchSchema(axios) {
  let res = (await axios.get(`graphql/schema`)).data
  const schemastr = res.schema
  console.log(schemastr)
  let typeDefs =  gql`${schemastr}`
  let resolvers = createResolvers(axios)
  return { typeDefs, resolvers }
}

function createResolvers(axios) {
  return {
    Query: {
      find: createFindResolver(axios),
      findOne: createFindOneResolver(axios)
    },
    Date: dateScalarType()
  }
}

function createFindResolver(axios) {
  return async (parent, args, context, info) => {
    let query = createQuery(args)
    console.log(`find: ${JSON.stringify(query, null, 2)}`)
    return await makeRequest(axios, query)
  }
}

function createFindOneResolver(axios) {
  return async (parent, args, context, info) => {
    let query = createQuery(args)
    query.one = true
    console.log(`findOne: ${JSON.stringify(query, null, 2)}`)
    return await makeRequest(axios, query)
  }
}

function createQuery(args) {
  let find = { query: { } }
  if (args.filter) {
    find.query = formatFieldNames(formatOperators(args.filter))
  }
  if (args.skip) {
    find.skip = args.skip
  }
  if (args.limit) {
    find.limit = args.limit
  }
  if (args.sort) {
    find.sort = formatSort(args.sort)
  }
  return find
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
      return value.split('T')[0]; // "2019-08-01" 
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value) // ast value is always in string format
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
        if (Array.isArray(filter[k])) {
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
        if (Array.isArray(filter[k])) {
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

// { fields: [ ], order: [ 'ASC', 'DESC' ] } => [ [ field1, asc ], [ field2, desc ] ]
function formatSort(sort) {
  let formatted = [ ]
  for (let i = 0; i<sort.fields.length; i++) {
    formatted.push([ sort.fields[i], (sort.order[i] || 'ASC') ])
  }
  return formatted
}

module.exports = {
  fetchSchema
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
