// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' folder (adjust if your folder is named differently)
app.use(express.static(path.join(__dirname, '..', 'public')));

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

// Fallback to serve index.html for SPA routing (optional, only if you need it)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
