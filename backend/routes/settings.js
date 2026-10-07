const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settingsList = await all('SELECT * FROM settings');
    const settingsMap = {};
    settingsList.forEach(item => {
      settingsMap[item.key] = item.value;
    });
    res.json(settingsMap);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// PUT /api/settings (Admin only)
router.put('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const settingsObj = req.body;
    for (const [key, value] of Object.entries(settingsObj)) {
      await run(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `, [key, String(value)]);
    }

    res.json({ message: 'College settings updated successfully.' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

module.exports = router;
