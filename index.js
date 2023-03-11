import express from "express";
import { MongoClient } from "mongodb";
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import cors from "cors";
dotenv.config();
console.log(process.env.MONGO_URL);
const app = express();
const PORT = process.env.PORT || 4000;
app.use(express.json());
const MONGO_URL = process.env.MONGO_URL;
app.use(cors());

async function createConnection() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("Mongo is connected");
    return client;
}
const client = await createConnection();

app.get("/", function (request, response) {    
    response.send("Welcome to Gmail Clone Backend");
});
app.post("/mailsin", async function (request, response) {     //api for posting incomming mails in inbox   
    const data = request.body;
    console.log(data);
    const result = await client.db("emails-data").collection("mails-in").insertMany(data);
    console.log(result);
    response.send(result);
});
app.get("/mailsin", async function (request, response) {   //api for getting incomming mails
    console.log(request.query);
    const mail_in = await client.db("emails-data").collection("mails-in").find(request.query).toArray();
    response.send(mail_in);
});

app.post('/mailsout',async function (request, response){    //api for posting outgoing mails 
    const data = request.body;
    console.log(data);
    const result = await client.db("emails-data").collection("mails-out").insertOne(data);
    console.log(result);
    response.send(result);
});
app.get("/mailsout", async function (request, response) {  //api for getting outgoing mails 
    console.log(request.query);
    const mail_out = await client.db("emails-data").collection("mails-out").find(request.query).toArray();
    response.send(mail_out);
});
async function genHashedPassword(password){      //generating hashed password
    const NO_OF_ROUNDS=10;
    const salt=await bcrypt.genSalt(NO_OF_ROUNDS);
    const hashedPassword= await bcrypt.hash(password,salt);
    return hashedPassword;
}

app.post("/users/signup", async function (request, response) {     //users sign up and authorization
 const {username,password}=request.body;
 const userFromDB= await client.db("emails-data")
 .collection("users")
 .findOne({username: username});
 if(userFromDB){
    response.status(400).send({msg:"User already exists"});
 } else{
    const hashedPassword= await genHashedPassword(password);
    console.log(hashedPassword);
    const result= await client.db("emails-data")
    .collection("users")
    .insertOne({username: username, password:hashedPassword});
    response.send(result);
 }
});
app.post("/users/login", async function (request, response) {       //checking for authentication and user login
    const {username,password}=request.body;
    const userFromDB= await client.db("emails-data")
    .collection("users")
    .findOne({username: username});
    if(!userFromDB){
       response.status(401).send({msg:"Invalid Credentials"});
    } else{
     const storePassword= userFromDB.password;
     const isPasswordMatch=await bcrypt.compare(password,storePassword);
     console.log(isPasswordMatch);

     if(isPasswordMatch){
       const token=jwt.sign({id:userFromDB._id},`${process.env.SECRET_KEY}`);
       response.send({msg:"Successful Login", token:token});
     } else{
        response.status(401).send({msg:"Invalid credentials"});
     }
    }
   });
app.listen(PORT, () => console.log(`App started in ${PORT}`));