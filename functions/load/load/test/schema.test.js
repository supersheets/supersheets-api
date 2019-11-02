require('dotenv').config()

const {
  constructSchema,
  mergeSheetSchemaColumns,
  mergeSheetSchemaDocs,
  constructSheetSchema,
  constructDocSchemas,
  updateConfig
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
          "sample": "world",
          "reserved": false
        },
        {
          "name": "key",
          "datatype": "String",
          "sample": "value",
          "reserved": false
        }
      ]
    })
    expect(schemas["doc2"]).toEqual({
      "name": "doc2",
      "fields": [
        {
          "name": "foo",
          "datatype": "Int",
          "sample": 123,
          "reserved": false
        },
        {
          "name": "key",
          "datatype": "String",
          "sample": "value",
          "reserved": false
        }
      ]
    })
  })
  // check "title.0" bug
  it ('should create StringList doc field type', async () => {
    let cols = [ 'doc' ]
    let docs = [ {
        'doc': {
          "hello": [ "world" ],
        }
      }
    ]
    let datatypes = {
      "doc": "GoogleDoc",
      "doc.hello": "StringList"
    }
    let schema = constructDocSchemas(cols, docs, datatypes)
    expect(schema).toEqual({
      "doc": {
        "name": "doc",
        "fields": [
          {
            "name": "hello",
            "datatype": "StringList",
            "sample": [
              "world"
            ],
            "reserved": false
          }
        ]
      }
    })
  })
  it ('should create reserved fields', async () => {
    let cols = [ 'doc' ]
    let docs = [ {
        'doc': {
          "_docid": "my-google-doc-id",
          "_url": "https://link.to.google.doc",
          "hello": [ "world" ]
        }
      }
    ]
    let datatypes = {
      "doc": "GoogleDoc",
      "doc.hello": "StringList"
    }
    let schema = constructDocSchemas(cols, docs, datatypes)
    expect(schema).toEqual({
      "doc": {
        "name": "doc",
        "fields": [
          {
            "name": "_docid",
            "datatype": "String",
            "sample": "my-google-doc-id",
            "reserved": true
          },
          {
            "name": "_url",
            "datatype": "String",
            "sample": "https://link.to.google.doc",
            "reserved": true
          },
          {
            "name": "hello",
            "datatype": "StringList",
            "sample": [
              "world"
            ],
            "reserved": false
          }
        ]
      }
    })
  })
})

describe('constructSheetSchema', () => {
  let cols = [ 'col1', 'col2', 'doc1' ]
  let docs = [ {
    '_id': 'id',
    '_sheet': "Sheet1",
    '_row': 1,
    '_errors': [ ],
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
  let usercolumns = schema.columns.filter(col => !col.reserved)
  let reserved = schema.columns.filter(col => col.reserved)
  expect(usercolumns).toEqual([
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
        "sample": "world",
        "reserved": false
      }, {
        "name": "key",
        "datatype": "Int",
        "sample": 123,
        "reserved": false
      } ]
    } ])

  expect(reserved).toEqual([
    {
      "name": "_id",
      "datatype": "String",
      "sample": "id",
      "reserved": true
    },
    {
      "name": "_sheet",
      "datatype": "String",
      "sample": "Sheet1",
      "reserved": true
    },
    {
      "name": "_row",
      "datatype": "Int",
      "sample": 1,
      "reserved": true
    },
    {
      "name": "_errors",
      "datatype": "StringList",
      "sample": [],
      "reserved": true
    }
  ])
})

describe('updateConfig', () => {
  it ('should init config for new metadata as UNFORMATTED', async () => {
    let metadata = { }
    let config = updateConfig(metadata)
    expect(config).toMatchObject({
      mode: "UNFORMATTED"
    })
  })
  it ('should use existing datatypes', async () => {
    let metadata = { config: { datatypes: { "col1": "Int" } } }
    let config = updateConfig(metadata)
    expect(config).toMatchObject({
      datatypes: {
        "col1": "Int"
      }
    })
  })
  it ('should init config.datatypes with column schema si.e. new columns', async () => {
    let metadata = { 
      config: { 
        datatypes: { "col1": "Int" } 
      },
      schema: {
        columns: [ 
          { name: "_id", datatype: "String" },
          { name: "col1", datatype: "String" },
          { name: "col2", datatype: "Int" }
        ]
      }
    }
    let config = updateConfig(metadata)
    expect(config).toMatchObject({
      datatypes: {
        "col1": "Int",
        "col2": "Int"
      }
    })
  })
})
