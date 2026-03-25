const express = require('express');
const db = require('../db');
const router = express.Router();

// Start tracking session
router.post('/start', async (req, res) => {
    const { userId } = req.body;
    try {
        const startTime = new Date();
        const [result] = await db.query(
            'INSERT INTO ScreenTime (user_id, start_time) VALUES (?, ?)',
            [userId, startTime]
        );
        res.status(201).json({ message: 'Session started', sessionId: result.insertId, startTime });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Stop tracking session and calculate duration
router.post('/stop', async (req, res) => {
    const { sessionId } = req.body;
    try {
        const endTime = new Date();
        const [sessionRows] = await db.query('SELECT start_time FROM ScreenTime WHERE id = ?', [sessionId]);
        if (sessionRows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        const startTime = new Date(sessionRows[0].start_time);
        const durationMs = endTime - startTime;
        const durationMinutes = Math.floor(durationMs / 1000 / 60);

        await db.query(
            'UPDATE ScreenTime SET end_time = ?, duration_minutes = ? WHERE id = ?',
            [endTime, durationMinutes, sessionId]
        );
        res.json({ message: 'Session stopped', durationMinutes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to stop session' });
    }
});

// Get today's total usage (in minutes) for a user
router.get('/today/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        // Find total duration today
        const [rows] = await db.query(`
            SELECT IFNULL(SUM(duration_minutes), 0) as totalMinutes 
            FROM ScreenTime 
            WHERE user_id = ? AND DATE(start_time) = CURDATE()
        `, [userId]);
        
        res.json({ totalMinutes: rows[0].totalMinutes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve today\'s usage' });
    }
});

// Get weekly usage for a user
router.get('/weekly/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [rows] = await db.query(`
            SELECT DATE(start_time) as date, IFNULL(SUM(duration_minutes), 0) as totalMinutes
            FROM ScreenTime
            WHERE user_id = ? AND start_time >= DATE(NOW() - INTERVAL 7 DAY)
            GROUP BY DATE(start_time)
            ORDER BY DATE(start_time) ASC
        `, [userId]);
        
        res.json({ weeklyData: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve weekly usage' });
    }
});

module.exports = router;
