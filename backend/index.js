import express from 'express'
import dotenv from 'dotenv'
import { connect } from 'mongoose'
import connectDb from './config/db.js'

const app = express()
dotenv.config()
await connectDb();


//importing routes
import userRoutes from './routes/user.js'

//using routes
app.use("/api/v1", userRoutes);

const port = process.env.PORT || 5000

app.listen(port, ()=>{
    console.log(`Server is running on ${port}`)
})