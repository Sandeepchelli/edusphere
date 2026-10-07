const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/transport
// View all drivers and routes (accessible to students, parents, staff, admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const drivers = await all(`
      SELECT s.id as staff_id, s.staff_id as driver_id, s.vehicle_number, s.route, s.bus_stops,
             u.name as driver_name, u.phone as driver_phone, u.email as driver_email
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.role = 'driver' AND u.status = 'active'
      ORDER BY s.route ASC
    `);
    res.json(drivers);
  } catch (err) {
    console.error('Error fetching transport info:', err);
    res.status(500).json({ error: 'Failed to fetch transport information.' });
  }
});

// PUT /api/transport/:staff_id (Admin or Driver)
router.put('/:staff_id', authenticateToken, async (req, res) => {
  try {
    const { vehicle_number, route, bus_stops } = req.body;
    
    // Check permissions
    if (req.user.role !== 'admin') {
      const driver = await get('SELECT id FROM staff WHERE user_id = ? AND role = "driver"', [req.user.id]);
      if (!driver || driver.id != req.params.staff_id) {
        return res.status(403).json({ error: 'Unauthorized to modify this vehicle/route.' });
      }
    }

    await run(`
      UPDATE staff
      SET vehicle_number = COALESCE(?, vehicle_number),
          route = COALESCE(?, route),
          bus_stops = COALESCE(?, bus_stops)
      WHERE id = ? AND role = 'driver'
    `, [vehicle_number, route, bus_stops, req.params.staff_id]);

    res.json({ message: 'Transport route details updated successfully.' });
  } catch (err) {
    console.error('Error updating transport details:', err);
    res.status(500).json({ error: 'Failed to update transport details.' });
  }
});

module.exports = router;
