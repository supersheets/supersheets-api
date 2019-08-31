require('dotenv').config()

const {
  constructSchema,
  constructDocSchemas
} = require('../lib/schema')

describe('constructDocSchemas', () => {
  it ('should create schemas for google doc objects', async () => {
    let cols = [ 'doc1', 'doc2' ]
    let docs = [ {
        'doc1': {
          "hello": "world",
        }, 'doc2': {
          "foo": 123,
          "key": "value"
        }
      }, {
        'doc1': {
          "hello": "world",
          "key": "value" 
        }, 'doc2': {
          "foo": 456
        }
    } ]
    let datatypes = {
      "doc1": "GoogleDoc",
      "doc1.hello": "String",
      "doc2": "GoogleDoc",
      "doc2.foo": "Int",
      "doc2.key": "String"
    }
    let schemas = constructDocSchemas(cols, docs, datatypes)
    expect(schemas["doc1"]).toEqual({
      "name": "doc1",
      "fields": [
        {
          "name": "hello",
          "datatype": "String",
          "sample": "world"
        },
        {
          "name": "key",
          "datatype": "String",
          "sample": "value"
        }
      ]
    })
    expect(schemas["doc2"]).toEqual({
      "name": "doc2",
      "fields": [
        {
          "name": "foo",
          "datatype": "Int",
          "sample": 123
        },
        {
          "name": "key",
          "datatype": "String",
          "sample": "value"
        }
      ]
    })
  })
})

describe('constructSchemas', () => {
  let cols = [ 'col1', 'col2', 'doc1' ]
  let docs = [ {
    'col1': "Hello",
    'doc1': {
      "hello": "world",
    }
  }, {
    'col1': "World",
    'col2': 123,
    'doc1': {
      "hello": "world",
      "key": 123
    }
  } ]
  let datatypes = {
    "col1": "String",
    "col2": "Int",
    "doc1": "GoogleDoc",
    "doc1.hello": "String",
    "doc1.key": "Int"
  }
  let schema = constructSchema(cols, docs, datatypes)
  expect(schema).toMatchObject({
    "columns": [
      {
        "name": "col1",
        "datatype": "String",
        "sample": "Hello"
      },
      {
        "name": "col2",
        "datatype": "Int",
        "sample": 123
      },
      {
        "name": "doc1",
        "datatype": "GoogleDoc",
        "sample": {
          "hello": "world"
        }
      },
      {
        "name": "doc1.hello",
        "datatype": "String",
        "sample": "world"
      },
      {
        "name": "doc1.key",
        "datatype": "Int",
        "sample": 123
      }
    ],
  })
})

// From old doc.test.js
// 
// describe('Doc Schema', () => {
//   it ('should create a schema for a single google doc column', async () => {
//     let docs = [ { 
//       "passage": {
//         hello: "world",
//         foo: "bar"
//       }
//     } ]
//     let datatypes = { 
//       "passage": "GoogleDoc"
//     } 
//     let schema = createGoogleDocSchemas(docs, datatypes)
//     expect(schema).toMatchObject({
//       passage: {
//         name: "passage",
//         columns: [
//           {
//             "name": "hello",
//             "datatype": "String",
//             "sample": "world"
//           },
//           {
//             "name": "foo",
//             "datatype": "String",
//             "sample": "bar"
//           }
//         ]
//       }
//     })
//   })
//   it ('should create a schema for a multiple google doc columns', async () => {
//     let docs = [ { 
//       "passage": {
//         hello: "world",
//         foo: "bar"
//       },
//       "author": {
//         first: "daniel",
//         last: "yoo"
//       }
//     } ]
//     let datatypes = { 
//       "passage": "GoogleDoc",
//       "author": "GoogleDoc"
//     } 
//     let schema = createGoogleDocSchemas(docs, datatypes)
//     expect(schema['passage']).toMatchObject({
//       "name": "passage",
//       "columns": [
//         {
//           "name": "hello",
//           "datatype": "String",
//           "sample": "world"
//         },
//         {
//           "name": "foo",
//           "datatype": "String",
//           "sample": "bar"
//         }
//       ]
//     })
//     expect(schema['author']).toMatchObject({
//       "name": "author",
//       "columns": [
//         {
//           "name": "first",
//           "datatype": "String",
//           "sample": "daniel"
//         },
//         {
//           "name": "last",
//           "datatype": "String",
//           "sample": "yoo"
//         }
//       ]
//     })
//   })
//   it ('should set all falsy sample values as null', async () => {
//     let docs = [ 
//       { 
//         "passage": {
//           hello: "",
//           foo: null
//         }
//       }
//     ]
//     let datatypes = { 
//       "passage": "GoogleDoc"
//     } 
//     let schema = createGoogleDocSchemas(docs, datatypes)
//     expect(schema.passage.columns[0]).toMatchObject({
//       "name": "hello",
//       "datatype": "String",
//       "sample": null
//     })
//     expect(schema.passage.columns[1]).toMatchObject({
//       "name": "foo",
//       "datatype": "String",
//       "sample": null
//     })
//   })
//   it ('should find a non null sample if it exists', async () => {
//     let docs = [ 
//       { 
//         "passage": {
//           hello: "",
//           foo: null
//         }
//       }, 
//       {
//         "passage": {
//           hello: "world",
//           foo: "bar"
//         }
//       }
//     ]
//     let datatypes = { 
//       "passage": "GoogleDoc"
//     } 
//     let schema = createGoogleDocSchemas(docs, datatypes)
//     expect(schema.passage.columns[0]).toMatchObject({
//       "name": "hello",
//       "datatype": "String",
//       "sample": "world"
//     })
//     expect(schema.passage.columns[1]).toMatchObject({
//       "name": "foo",
//       "datatype": "String",
//       "sample": "bar"
//     })
//     docs = [ 
//       {
//         "passage": {
//           hello: "world",
//           foo: "bar"
//         }
//       },
//       { 
//         "passage": {
//           hello: null,
//           foo: ""
//         }
//       }
//     ]
//     schema = createGoogleDocSchemas(docs, datatypes)
//     expect(schema.passage.columns[0]).toMatchObject({
//       "name": "hello",
//       "datatype": "String",
//       "sample": "world"
//     })
//     expect(schema.passage.columns[1]).toMatchObject({
//       "name": "foo",
//       "datatype": "String",
//       "sample": "bar"
//     })
//   })
// })
