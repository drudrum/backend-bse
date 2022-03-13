import mongodb from 'mongodb'
const { MongoClient } = mongodb

export default async () => {
  const dbClient = await MongoClient.connect(process.env.mongoDbUrl || 'mongodb://mongodb:27017', {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  const mdb = dbClient.db()
  return [mdb, dbClient]
}
