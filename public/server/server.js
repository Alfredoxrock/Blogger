// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

// Define schema and model
const Post = mongoose.model('Post', {
    title: String,
    content: String,
});

// Create a new post
app.post('/api/posts', async (req, res) => {
    const { title, content } = req.body;
    const post = new Post({ title, content });
    await post.save();
    res.status(201).json(post);
});

// Get all posts
app.get('/api/posts', async (req, res) => {
    const posts = await Post.find().sort({ _id: -1 });
    res.json(posts);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});