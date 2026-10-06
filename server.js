const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const db = new sqlite3.Database('./social.db');

// INCREASE LIMIT TO MAXIMUM FOR LARGE PHOTOS
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database Tables 
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, username TEXT UNIQUE, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, content TEXT, mediaData TEXT, mediaType TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.run("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id INTEGER, content TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS likes (user_id INTEGER, post_id INTEGER, PRIMARY KEY(user_id, post_id))");
    db.run("CREATE TABLE IF NOT EXISTS follows (follower_id INTEGER, following_id INTEGER, PRIMARY KEY(follower_id, following_id))");
    db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER, receiver_id INTEGER, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
});

// Auth Routes
app.post('/api/register', (req, res) => {
    const { name, username, password } = req.body;
    db.run("INSERT INTO users (name, username, password) VALUES (?, ?, ?)", [name, username, password], function(err) {
        if (err) return res.status(400).json({ error: "Username already exists!" });
        res.json({ success: true, id: this.lastID, username, name });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(400).json({ error: "Invalid Username or Password!" });
        res.json({ success: true, id: user.id, username: user.username, name: user.name });
    });
});

// Post Routes
app.get('/api/posts', (req, res) => {
    const query = `
        SELECT p.*, u.username, u.name, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount
        FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.timestamp DESC
    `;
    db.all(query, [], (err, posts) => {
        if (err) return res.status(500).json({error: err.message});
        
        // FIXED HERE: Added u.name to the SELECT query for comments
        db.all(`SELECT c.*, u.username, u.name FROM comments c JOIN users u ON c.user_id = u.id`, [], (err, comments) => {
            posts.forEach(p => p.comments = comments.filter(c => c.post_id === p.id));
            res.json(posts);
        });
    });
});

app.post('/api/posts', (req, res) => {
    const { user_id, content, mediaData, mediaType } = req.body;
    db.run("INSERT INTO posts (user_id, content, mediaData, mediaType) VALUES (?, ?, ?, ?)", [user_id, content, mediaData, mediaType], function(err) { 
        if(err) return res.status(500).json({error: "Failed to post"});
        res.json({ success: true }); 
    });
});

// Actions Routes
app.post('/api/posts/:id/like', (req, res) => {
    const { user_id } = req.body;
    db.get("SELECT * FROM likes WHERE user_id = ? AND post_id = ?", [user_id, req.params.id], (err, row) => {
        if (row) db.run("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [user_id, req.params.id], () => res.json({liked: false}));
        else db.run("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", [user_id, req.params.id], () => res.json({liked: true}));
    });
});

app.post('/api/posts/:id/comment', (req, res) => {
    db.run("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)", [req.params.id, req.body.user_id, req.body.content], () => res.json({success: true}));
});

// Users & Follows
app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, name FROM users", [], (err, users) => res.json(users));
});

app.get('/api/follows', (req, res) => {
    db.all("SELECT * FROM follows", [], (err, follows) => res.json(follows));
});

app.post('/api/users/:id/follow', (req, res) => {
    const { follower_id } = req.body;
    db.get("SELECT * FROM follows WHERE follower_id = ? AND following_id = ?", [follower_id, req.params.id], (err, row) => {
        if (row) db.run("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [follower_id, req.params.id], () => res.json({followed: false}));
        else db.run("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)", [follower_id, req.params.id], () => res.json({followed: true}));
    });
});

// Messaging Routes
app.post('/api/messages', (req, res) => {
    const { sender_id, receiver_id, content } = req.body;
    db.run("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)", [sender_id, receiver_id, content], () => res.json({success: true}));
});

app.get('/api/messages/:u1/:u2', (req, res) => {
    const { u1, u2 } = req.params;
    db.all("SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY timestamp ASC", [u1, u2, u2, u1], (err, msgs) => res.json(msgs));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));