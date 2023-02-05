const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

require('dotenv').config();

const PORT=process.env.PORT || 8080;
const MONGODB_URL=process.env.MONGODB_URL;
const app = express();
app.use(express.json());

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdOn: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);
const User = mongoose.model('User', userSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const user = new User({ name, email, password });
  await user.save();

  const token = jwt.sign({ id: user._id }, 'secretkey');
  res.send({ token });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send('Invalid email or password.');

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) return res.status(400).send('Invalid email or password.');

  const token = jwt.sign({ id: user._id }, 'secretkey');
  res.send({ token });
});

// Middleware function to verify the token
const auth = async (req, res, next) => {
    try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, 'secretkey');
    req.user = await User.findById(decoded.id);
    next();
  } catch (e) {
    res.status(401).send('Access denied.');
  }
};

// Create blog post endpoint
app.post('/api/blog', auth, async (req, res) => {
    const { title, description } = req.body;
    const blogPost = new BlogPost({ title, description, createdBy: req.user._id });
    await blogPost.save();
    res.send({ message: 'Blog post created successfully' });
  });
  
  // Get all blog posts endpoint
  app.get('/api/blog', async (req, res) => {
    const blogPosts = await BlogPost.find({});
    res.send(blogPosts);
  });
  
  // Update blog post endpoint
  app.put('/api/blog/:id', auth, async (req, res) => {
    const { title, description } = req.body;
    const blogPost = await BlogPost.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, { title, description });
    if (!blogPost) {
        console.log("heree - >",blogPost)
        return res.status(404).send({ error: 'Blog post not found' });}

    res.send({ message: 'Blog post updated successfully' });
  });
  
  // Delete blog post endpoint
  app.delete('/api/blog/:id', auth, async (req, res) => {
    const blogPost = await BlogPost.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!blogPost) return res.status(404).send({ error: 'Blog post not found' });
    res.send({ message: 'Blog post deleted successfully' });
  });
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
  });