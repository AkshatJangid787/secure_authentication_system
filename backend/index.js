import express from 'express'
import dotenv from 'dotenv'
import connectDb from './config/db.js'
import {createClient} from 'redis'

const app = express()
dotenv.config()
await connectDb();

const redisUrl = process.env.REDIS_URI

if(!redisUrl){
    console.log("Missing redis url");
    process.exit(1);
}

export const redisClient = createClient({
    url: redisUrl,
});

redisClient.connect().then(()=>
    console.log("connected to redis")).catch(console.error)

//middleware
app.use(express.json());  

//importing routes
import userRoutes from './routes/user.js'

//using routes
app.use("/api/v1", userRoutes);

const port = process.env.PORT || 5000

app.listen(port, ()=>{
    console.log(`Server is running on ${port}`)
})