const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, email, password, age, occupation } = req.body;
    try {
        const [existingUser] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO Users (username, email, password_hash, age, occupation) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, age, occupation || 'Normal User']
        );
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error while registering user' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                age: user.age,
                occupation: user.occupation
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error during login' });
    }
});

module.exports = router;
