const {setGlobalOptions} = require("firebase-functions");
const functions = require("firebase-functions");
const express = require("express");
const app = express();

setGlobalOptions({maxInstances: 10});

app.use(express.json());

app.get("/posts", (req, res) => {
  res.send([{title: "Hello from Firebase!"}]);
});

app.post("/posts", (req, res) => {
  const newPost = req.body;
  res.status(201).send(newPost);
});

exports.api = functions.https.onRequest(app);
