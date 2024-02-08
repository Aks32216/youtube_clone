import dotenv from "dotenv";
import connectDB from "./db/index.js";
dotenv.config({
    path: '../.env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Listening to port ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("mongoDB connection failed. ERROR: ",err);
})


/*

this is one approach to connect to db and require app

import express from "express";
const app=express();
import { DB_NAME } from "./constants";

(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error", (error)=>{
            console.log("Application not connected to database");
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log("App is listening to port ",process.env.PORT);
        })
    } catch (error) {
        console.log(error);
        throw error;
    }
})();

*/