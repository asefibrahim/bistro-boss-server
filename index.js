const express = require('express')
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.Token, (error, decoded) => {
        if (error) {
            return res.status(402).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
    })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.Db_pass}@cluster0.5niozn3.mongodb.net/?retryWrites=true&w=majority`;

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
        await client.connect();

        const menuCOllection = client.db('Bistrodb').collection('menu')
        const reviewCOllection = client.db('Bistrodb').collection('review')
        const cartsCollection = client.db('Bistrodb').collection('carts')
        const UsersCollection = client.db('Bistrodb').collection('users')


        // jwt related APIS

        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.Token, {
                expiresIn: '1h'
            })
            res.send({ token })
        })

        // verify Admin 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await UsersCollection.findOne(query)
            if (user.role !== 'Admin') {
                return res.status(403).send({ error: true, message: 'Unauthorized Access' })
            }
            next()
        }





        // user related Apis

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await UsersCollection.find().toArray()
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const users = req.body
            const query = { email: users.email }
            const alreadyExist = await UsersCollection.findOne(query)
            if (alreadyExist) {
                return res.send({ message: 'user already exist' })
            }


            const result = await UsersCollection.insertOne(users)
            res.send(result)
        })



        // admin reelated

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await UsersCollection.findOne(query)
            const result = { admin: user?.role == 'Admin' }
            res.send(result)



        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'Admin'
                }
            }
            const result = await UsersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })




        // menu related apis

        app.get('/menu', async (req, res) => {
            const result = await menuCOllection.find().toArray()
            res.send(result)
        })
        app.get('/review', async (req, res) => {
            const result = await reviewCOllection.find().toArray()
            res.send(result)

        })

        app.post('/carts', async (req, res) => {
            const item = req.body
            const result = await cartsCollection.insertOne(item)
            res.send(result)
        })
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email
            console.log(email);
            if (!email) {
                res.send([])
            }

            const decodedEmail = req.decoded.email
            if (email !== decodedEmail) {
                return res.status(401).send({ error: true, message: 'Email Did not match' })
            }

            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)

        })
        // delete
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
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
    res.send('Booss is running......')
})
app.listen(port)