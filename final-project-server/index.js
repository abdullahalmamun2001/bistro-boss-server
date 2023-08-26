const express = require('express');
const app = express()
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())


const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true,message:"unauthorized access"})
  }
  const token=authorization.split(' ')[1]
  jwt.verify(token,process.env.JWT_WEB_CODE,(err,decode)=>{
    if(err){
      res.status(401).send({error:true,message:"unauthorized access"})
    }
    req.decode=decode;
    next();
  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kbqlzif.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const menuCollection = client.db("bossDB").collection("menu");
    const reviewsCollection = client.db("bossDB").collection("reviews");
    const cartsCollection = client.db("bossDB").collection("carts");
    const usersCollection = client.db("bossDB").collection("users");


    // jwt apis 
    app.post('/jwt',(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user, process.env.JWT_WEB_CODE, { expiresIn: '1h' });
      res.send({token})
    })

    // user apis 
    app.put('/user/:email', async (req, res) => {
      const user=req.body;
      const email=req.params.email;
      const query={email:email}
      const doc={
        $set:user
      }
      const option={upsert:true}
      const result=await usersCollection.updateOne(query,doc,option)
      res.send(result)
      
    })


    app.get('/user', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })


    app.patch('/user/admin/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result=await usersCollection.updateOne(query,updateDoc);
      res.send(result)
    })
    //cart collection
    app.get('/cart',verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const decodedEmail=req.decode.email;
      if(email!==decodedEmail){
        res.status(403).send({error:true,message:"Forbidden access"})
      }
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/cart', async (req, res) => {
      const body = req.body;
      const result = await cartsCollection.insertOne(body)
      res.send(result)
    })

    // cart delete 
    app.delete('/cart/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result=await cartsCollection.deleteOne(query)
      res.send(result)
    })


    // collection data


    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result)
    })
    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('server is running')
})
app.listen(port, () => {
  console.log(`server is running with port ${port}`);
})