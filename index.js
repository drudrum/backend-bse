import express from 'express'
import cookieParser from 'cookie-parser'
import connectMongo from './stuff/connectMongo.js'
import asyncHandler from 'express-async-handler'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

async function start () {
  console.log('Connecting to database')
  const [mdb] = await connectMongo()
  console.log('database connection success')

  const app = express()
  const port = process.env.PORT || 3000

  app.use(cookieParser())
  app.use(express.json())
  app.get('/', (req, res) => {
    res.send('Hello World!')
  })

  app.post(
    '/register',
    asyncHandler(async (req, res) => {
      console.log('register', req.body)
      const { password } = req.body
      const login = req.body?.login?.toLowerCase()
      if (!login) {
        res.status(500).send('login required')
        return
      }
      const existsUser = await mdb.collection('users').findOne({ login })
      if (existsUser) {
        res.status(500).send(`login ${login} exists`)
        return
      }

      const shasum = crypto.createHash('sha1')
      shasum.update(password)
      const passwordHash = shasum.digest('hex')

      await mdb.collection('users').insertOne({
        login,
        passwordHash
      })

      res.status(200).send('success')
    })
  )

  app.post(
    '/login',
    asyncHandler(async (req, res) => {
      console.log('login', req.body, req.cookies)
      const { password } = req.body
      const login = req.body?.login?.toLowerCase()
      if (!login) {
        res.status(500).send('login required')
      }
      const existsUser = await mdb.collection('users').findOne({ login })
      if (!existsUser) {
        res.status(500).send(`login ${login} does not exists`)
        return
      }

      const shasum = crypto.createHash('sha1')
      shasum.update(password)
      const passwordHash = shasum.digest('hex')

      if (passwordHash !== existsUser.passwordHash) {
        res.status(403).send('bad password')
        return
      }

      const access = jwt.sign({ id: existsUser._id.toString() }, process.env.SECRET || 'secret', {
        expiresIn: '30m'
      })

      res.cookie('access', access, { maxAge: 60000 * 30, httpOnly: true })
      res.status(200).send('success')
    })
  )

  app.get(
    '/properties',
    asyncHandler(async (req, res) => {
      try {
        jwt.verify(req.cookies.access, process.env.SECRET || 'secret')
      } catch (err) {
        res.status(403).send('You must be authorized user')
        return
      }

      const list = await mdb.collection('property').find({}).toArray()
      res.status(200).send(JSON.stringify(list))
    })
  )

  const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })

  let exitInProgress = false
  async function shutdown () {
    if (exitInProgress) {
      console.log('Shutdown in progress')
      return
    }
    exitInProgress = true
    server.close()
    console.log('All incoming connections closed')

    // graceful shutdown
    // then exit
    process.exit(0)
  }
  process.removeAllListeners('SIGINT')
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start()
