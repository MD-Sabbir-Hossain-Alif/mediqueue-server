// dns server for mongodb connection
const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]); // Cloudflare + Google DNS

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");


app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

// medilware
const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization
    // console.log(authHeader)
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const token = authHeader.split(" ")[1]
    // console.log(token)

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    try {
        const { payload } = await jwtVerify(token, JWKS)
        // console.log(payload)
        next()
    } catch (error) {
        // console.log('Token validation failed:', error)
        return res.status(401).json({ message: "Forbidden" })
    }
}

async function run() {
    try {
        // todo: comment it when deploying to production
        await client.connect();

        const db = client.db('mediqueue-db')
        const tutorCollection = db.collection("tutors")
        const bookedTutor = db.collection("booked")

        app.get('/tutors', async (req, res) => {
            const result = await tutorCollection.find().toArray()
            res.json(result)
        });

        app.get('/tutors/:id', verifyToken, async (req, res) => {
            const id = await req.params.id
            const result = await tutorCollection.findOne({ _id: new ObjectId(id) })
            res.json(result)
        });

        app.post('/tutors', verifyToken, async (req, res) => {
            const tutor = req.body
            const result = await tutorCollection.insertOne(tutor)
            res.json(result)
        });

        app.patch('/tutors/:id', verifyToken, async (req, res) => {
            const id = await req.params.id
            const tutor = req.body
            const result = await tutorCollection.updateOne({ _id: new ObjectId(id) }, { $set: tutor })
            res.json(result)
        });

        app.delete('/tutors/:id', verifyToken, async (req, res) => {
            const id = await req.params.id
            const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) })
            res.json(result)
        });

        //booked api
        app.post('/booked', verifyToken, async (req, res) => {
            const booked = await req.body
            const result = await bookedTutor.insertOne(booked)
            res.json(result)
        })

        app.get('/booked', verifyToken, async (req, res) => {
            const result = await bookedTutor.find().toArray()
            res.json(result)
        });

        app.delete('/booked/:id', verifyToken, async (req, res) => {
            const id = await req.params.id
            const result = await bookedTutor.deleteOne({ _id: new ObjectId(id) })
            res.json(result)
        });

        // todo: comment it when deploying to production
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World! Sabbir')
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})