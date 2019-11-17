const sift = require('sift').default
const DataLoader = require('dataloader')

function createBatchQueryFn() {
  return async (collection, queries) => {
    let q = { "$or": queries }
    let results = await collection.find(q).toArray()
    return queries.map(query => results.filter(sift(query)))
  }
}

// authors:email 'danieljyoo@gmail.com'  => { _sheet: 'Authors', email: 'danieljyoo@gmail.com' }
// tags:name:in [ 'Metadata', 'Test file' ] => { _sheet: 'Tags', name: { $in: [ 'Metadata', 'Test file' ] } }
function createLoader(collection) {
  let batchQueryFn = createBatchQueryFn()
  return new DataLoader(queries => batchQueryFn(collection, queries), {
    cacheKeyFn: query => JSON.stringify(query)
  })
}

module.exports = {
  createBatchQueryFn,
  createLoader
}

// https://sayasuhendra.github.io/graphql-js/7-using-data-loaders/n
// // 1
// async function batchUsers (Users, keys) {
//   return await Users.find({_id: {$in: keys}}).toArray();
// }

// // 2
// module.exports = ({Users}) =>({
//   // 3
//   userLoader: new DataLoader(
//     keys => batchUsers(Users, keys),
//     {cacheKeyFn: key => key.toString()},
//   ),
// });