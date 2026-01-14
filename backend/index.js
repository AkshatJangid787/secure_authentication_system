import express from 'express'
import dotenv from 'dotenv'
import connectDb from './config/db.js'
import { createClient } from 'redis'
import cookieParser from 'cookie-parser'
import cors from 'cors'

dotenv.config()

const app = express()

await connectDb()

const redisUrl = process.env.REDIS_URI

if (!redisUrl) {
  console.log("Missing redis url")
  process.exit(1)
}

/* Redis Client */
export const redisClient = createClient({
  url: redisUrl,
  socket: {
    tls: true,                 // REQUIRED for cloud redis
    rejectUnauthorized: false, // avoid cert issues
    keepAlive: 5000            // idle disconnect fix
  }
})

/* VERY IMPORTANT: error handler */
redisClient.on("error", (err) => {
  console.error("Redis Error:", err.message)
})

redisClient.on("connect", () => {
  console.log("Redis connected")
})

await redisClient.connect()

/* middleware */
app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}))

/* routes */
import userRoutes from './routes/user.js'
app.use("/api/v1", userRoutes)

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
