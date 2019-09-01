require('dotenv').config()

const {
  constructSchema,
  mergeSheetSchemaColumns,
  mergeSheetSchemaDocs,
  constructSheetSchema,
  constructDocSchemas
} = require('../lib/schema')

describe('constructSchemna', () => {
  it ('should merge from updated sheets', async () => {
    let sheet1 = { schema: { 
      columns: [ { name: "col1", datatype: "String", sample: null } ],
      docs: { 'doc1': { name: 'doc1', fields: [ { name: "hello", datatype: "String", sample: null } ] } }
    }}
    let sheet2 = { schema: {
      columns: [ { name: "col1", datatype: "String", sample: "a" },  { name: "col2", datatype: "String", sample: "b" } ],
      docs: { 'doc1': { name: 'doc1', fields: [ { name: "hello", datatype: "String", sample: "foo" }, { name: "world", datatype: "String", sample: "bar" } ] } }
    }}
    let metadata = { sheets: [ sheet1, sheet2 ] }
    let { columns, docs } = constructSchema(metadata)
    expect(columns).toEqual([
      {
        "name": "col1",
        "datatype": "String",
        "sample": "a"
      },
      {
        "name": "col2",
        "datatype": "String",
        "sample": "b"
      }
    ])
    expect(docs).toEqual({
      "doc1": {
        "name": "doc1",
        "fields": [
          {
            "name": "hello",
            "datatype": "String",
            "sample": "foo"
          },
          {
            "name": "world",
            "datatype": "String",
            "sample": "bar"
          }
        ]
      }
    })
  })
})

describe('mergeSheetSchemaColumns', () => {
  it ('should merge different columns', async () => {
    let schemas = [ 
      [ { name: "col1", datatype: "String", sample: "a" } ],
      [ { name: "col2", datatype: "String", sample: "b" } ]
    ]
    let merged = mergeSheetSchemaColumns(schemas)
    expect(merged).toEqual([
      {
        "name": "col1",
        "datatype": "String",
        "sample": "a"
      },
      {
        "name": "col2",
        "datatype": "String",
        "sample": "b"
      }
    ])
  })
  it ('should merge same column across sheets', async () => {
    let schemas = [ 
      [ { name: "col1", datatype: "String", sample: null },  ],
      [ { name: "col1", datatype: "String", sample: "b" } ]
    ]
    let merged = mergeSheetSchemaColumns(schemas)
    expect(merged).toEqual([
      {
        "name": "col1",
        "datatype": "String",
        "sample": "b"
      }
    ])
  })
})

describe('mergeSheetSchemaDocs', () => {
  it ('should merge two different docs', async () => {
    let schemas = [ {
      'doc1': {
        name: "doc1",
        fields: [ { name: "number", datatype: "Int", sample: 123 } ]
      } 
    }, {
      'doc2': {
        name: "doc2",
        fields: [ { name: "number", datatype: "Int", sample: 123 } ]
      }
    } ]
    let merged = mergeSheetSchemaDocs(schemas)
    expect(merged).toEqual({
      "doc1": {
        "name": "doc1",
        "fields": [
          {
            "name": "number",
            "datatype": "Int",
            "sample": 123  
          }
        ]
      },
      "doc2": {
        "name": "doc2",
        "fields": [
          {
            "name": "number",
            "datatype": "Int",
            "sample": 123
          }
        ]
      }
    })
  })
  it ('should merge different fields for same doc schema across sheets', async () => {
    let docs = [ {
      'doc1': {
        name: "doc1",
        fields: [ { name: "number", datatype: "Int", sample: null } ]
      } 
    }, {
      'doc1': {
        name: "doc1",
        fields: [ 
          { name: "string", datatype: "String", sample: "hello" },
          { name: "number", datatype: "Int", sample: 123 }
        ]
      }
    } ]
    let merged = mergeSheetSchemaDocs(docs)
    expect(merged).toEqual({
      "doc1": {
        "name": "doc1",
        "fields": [
          {
            "name": "number",
            "datatype": "Int",
            "sample": 123
          },
          {
            "name": "string",
            "datatype": "String",
            "sample": "hello"
          }
        ]
      }
    })
  })
})

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

describe('constructSheetSchema', () => {
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
  let schema = constructSheetSchema(cols, docs, datatypes)
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
        },
        "fields": [ {
          "name": "hello",
          "datatype": "String",
          "sample": "world"
        }, {
          "name": "key",
          "datatype": "Int",
          "sample": 123
        } ]
      }
    ]
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