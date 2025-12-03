import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all favorites for current user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [favorites] = await db.query(
      `SELECT f.id, f.city_id, f.created_at, 
              c.city_name, c.state_code, c.population, c.crime_rate, 
              c.cost_of_living_index, c.school_rating, c.median_home_price
       FROM favorites f
       JOIN cities c ON f.city_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// Add a city to favorites
router.post("/", authenticateToken, async (req, res) => {
  const { city_id } = req.body;

  if (!city_id) {
    return res.status(400).json({ error: "City ID is required" });
  }

  try {
    // Check if already favorited
    const [existing] = await db.query(
      "SELECT id FROM favorites WHERE user_id = ? AND city_id = ?",
      [req.user.id, city_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "City already in favorites" });
    }

    // Add to favorites
    const [result] = await db.query(
      "INSERT INTO favorites (user_id, city_id) VALUES (?, ?)",
      [req.user.id, city_id]
    );

    // Get the full favorite data to return
    const [favorite] = await db.query(
      `SELECT f.id, f.city_id, f.created_at,
              c.city_name, c.state_code
       FROM favorites f
       JOIN cities c ON f.city_id = c.id
       WHERE f.id = ?`,
      [result.insertId]
    );

    res.json({ success: true, favorite: favorite[0] });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

// Remove a city from favorites
router.delete("/:cityId", authenticateToken, async (req, res) => {
  const { cityId } = req.params;

  try {
    const [result] = await db.query(
      "DELETE FROM favorites WHERE user_id = ? AND city_id = ?",
      [req.user.id, cityId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    res.json({ success: true, message: "Favorite removed" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

export default router;
