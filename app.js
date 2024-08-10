const express = require('express');
const mongoose = require('mongoose');
const argon2 = require('argon2');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb+srv://project:project@cluster0.kos1k7l.mongodb.net/tester?retryWrites=true&w=majority';

// Connect to MongoDB with updated options to avoid deprecation warnings
mongoose.connect(MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex: true, // Use createIndex to avoid deprecated ensureIndex
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Define User model
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    institution: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email, name, institution } = req.body;
        const hashedPassword = await argon2.hash(password);
        const user = new User({ username, password: hashedPassword, email, name, institution });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && await argon2.verify(user.password, password)) {
            req.session.user = user;
            res.redirect('/home');
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.redirect('/');
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
