require('dotenv').config()
const { 
  generateGraphQLNames,
  generateFindQuery,
  generateFindOneQuery,
  generate, 
  generateTypeField,
  generateInputField 
} = require('../lib/sheet') 

describe('generateGraphQLNames', () => {
  let sheet = getTestSheet()
  let s = generateGraphQLNames(sheet)
  expect(s).toEqual({ 
    name: 'Posts',
    type: 'Post',
    docs: { 
      content: { 
        name: 'content',
        type: 'PostContentDoc',
        input: 'PostContentDocFilterInput',
        sort: 'PostContentDocSortInput'
      } 
    },
    connection: 'PostConnection',
    enumfields: 'PostFieldsEnum',
    edge: 'PostEdge',
    input: 'PostFilterInput',
    find: 'findPosts',
    findOne: 'findOnePost',
    sort: 'PostSortInput'
  })
})

describe('generate', () => {  
  let sheet = getTestSheet()
  let s = generate(sheet, { level: 0 })
  //console.log(s)
})

describe('generateTypeField', () => {
  it ('should generate an ID field', async () => {
    let field = { name: "_id" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual('_id: ID!')
  })
  it('should generate a standard field', async () => {
    let field = { name: "title", datatype: "String" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual('title: String')
  })
  it ('should generate a date field', async () => {
    let field = { name: "published", datatype: "Date" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual(`published(
    formatString: String
    fromNow: Boolean
    difference: String
    locale: String
    zone: String
): Date`)
  })
  it ('should generate a datetime field', async () => {
    let field = { name: "published", datatype: "Datetime" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual(`published(
    formatString: String
    fromNow: Boolean
    difference: String
    locale: String
    zone: String
): Datetime`)
  })
  it ('should generate a GoogleDoc field', async () => {
    let field = { name: "content", datatype: "GoogleDoc" }
    let names = {
      docs: {
        "content": {
          type: 'ContentDoc'
        }
      }
    }
    let s = generateTypeField(field, { level: 0, names })
    expect(s).toEqual('content: ContentDoc')
  })
})

describe('generateFilterField', () => {
  it('should generate a standard field', async () => {
    let field = { name: "title", datatype: "String" }
    let s = generateInputField(field, { level: 0 })
    expect(s).toEqual('title: StringQueryOperatorInput')
  })
  it ('should generate a GoogleDoc field', async () => {
    let field = { name: "content", datatype: "GoogleDoc" }
    let names = {
      docs: {
        "content": {
          input: 'ContentDocFilterInput'
        }
      }
    }
    let s = generateInputField(field, { level: 0, names })
    expect(s).toEqual('content: ContentDocFilterInput')
  })
})

describe('generate queries', () => {
  it('should generate a find query', async () => {
    let sheet = getTestSheet()
    let names = generateGraphQLNames(sheet)
    let s = generateFindQuery(sheet, { level: 0, names })
    expect(s).toEqual(`findPosts(
    filter: PostFilterInput
    limit: Int
    skip: Int
    sort: PostSortInput
): PostConnection`)
  })
  it('should generate a findOne query', async () => {
    let sheet = getTestSheet()
    let names = generateGraphQLNames(sheet)
    let s = generateFindOneQuery(sheet, { level: 0, names })
    expect(s).toEqual(`findOnePost(
    filter: PostFilterInput
    limit: Int
    skip: Int
    sort: PostSortInput
): Post`)
  })
})

function getTestSheet() {
  return {
    title: "Posts",
    schema: {
      columns: [
        { name: "_id", datatype: "String" },
        { name: "title", datatype: "String" },
        { name: "content", datatype: "GoogleDoc" },
        { name: "published", datatype: "Datetime" },
      ],
      docs: {
        'content': {
          fields: [ 
            { name: "body", datatype: "String" },
            { name: "description", datatype: "String" } 
          ]
        }
      }
    }
  }
}