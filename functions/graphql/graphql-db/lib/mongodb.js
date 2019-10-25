const OPERATORS = [
  // https://docs.mongodb.com/manual/reference/operator/query/
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

function addDollarIfOperator(k) {
  return OPERATORS.includes(k) && `$${k}` || k
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
    formatted.push([ dotNotation(sort.fields[i]), (sort.order && sort.order[i] || 'ASC') ])
  }
  return formatted
}


module.exports = {
  createQuery,
  formatFieldNames,
  formatOperators,
  formatSort
}