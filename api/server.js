import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

// CONFIGURACIÓN DE CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Conexión a Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTA BASE ---
app.get("/api", (req, res) => {
  res.json({ message: "Backend Speed funcionando correctamente en Vercel 🚀" });
});

// --- 1. CATÁLOGO DE COCHES ---
app.get("/api/cars", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Car" ORDER BY cost_to_unlock ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener coches" });
  }
});

// --- 2. REGISTRO DE USUARIO ---
app.post("/api/register", async (req, res) => {
  const { username, email, password, display_name } = req.body;

  if (!username || !email || !password || !display_name) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingUser = await client.query(
      'SELECT * FROM "User" WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "El usuario o correo ya existen" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserRes = await client.query(
      `INSERT INTO "User" (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, username, created_at`,
      [username, email, hashedPassword]
    );
    const newUser = newUserRes.rows[0];

    await client.query(
      `INSERT INTO "Profile" (user_id, display_name)
       VALUES ($1, $2)`,
      [newUser.user_id, display_name]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user: newUser
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error en registro:", error);
    if (error.code === '23505') {
      return res.status(409).json({ error: "El usuario o correo ya existe." });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    client.release();
  }
});

// --- 3. LOGIN ---
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const result = await pool.query('SELECT * FROM "User" WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Usuario o contraseña incorrectos" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Usuario o contraseña incorrectos" });
    }

    const profileResult = await pool.query(
      'SELECT display_name, monedas FROM "Profile" WHERE user_id = $1',
      [user.user_id]
    );

    res.json({
      message: "Inicio de sesión exitoso",
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        profile: profileResult.rows[0]
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// --- LEADERBOARD GLOBAL (Suma de todos los mapass) ---
app.get("/api/leaderboard/global", async (req, res) => {
  try {
    const query = `
      SELECT 
        p.display_name,
        SUM(ps.high_score) as total_score
      FROM "Player_Score" ps
      JOIN "Profile" p ON ps.user_id = p.user_id
      GROUP BY p.user_id, p.display_name
      ORDER BY total_score DESC
      LIMIT 5
    `;

    const result = await pool.query(query);

    res.json({
      leaderboard: result.rows
    });

  } catch (error) {
    console.error("Error obteniendo leaderboard global:", error);
    res.status(500).json({ error: "Error al obtener el ranking global" });
  }
});

// Exportación para Vercel


// if (process.env.NODE_ENV !== 'production') {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//   });
// }
// --- 4. PERFIL COMPLETO (ESTE FALTABA) ---
app.get("/api/profile/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Datos del Usuario
    const userQuery = await pool.query(`
      SELECT u.username, u.created_at, p.display_name, p.monedas, p.races_played
      FROM "User" u
      JOIN "Profile" p ON u.user_id = p.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const userData = userQuery.rows[0];

    // Garaje
    const garageQuery = await pool.query(`
      SELECT c.*, 
             CASE WHEN pc.user_id IS NOT NULL THEN true ELSE false END as unlocked,
             COALESCE(pc.level_motor, 0) as level_motor,
             COALESCE(pc.level_durabilidad, 0) as level_durabilidad
      FROM "Car" c
      LEFT JOIN "Player_Car" pc ON c.car_id = pc.car_id AND pc.user_id = $1
      ORDER BY c.cost_to_unlock ASC
    `, [userId]);

    // Logros
    const trophiesQuery = await pool.query(`
      SELECT a.*, 
             CASE WHEN pa.user_id IS NOT NULL THEN true ELSE false END as achieved,
             pa.unlocked_at
      FROM "Achievement" a
      LEFT JOIN "Player_Achievement" pa ON a.achievement_id = pa.achievement_id AND pa.user_id = $1
      ORDER BY a.reward_monedas ASC
    `, [userId]);

    // Récords
    const recordsQuery = await pool.query(`
      SELECT m.name as map_name, ps.high_score, ps.score_id
      FROM "Player_Score" ps
      JOIN "Map" m ON ps.map_id = m.map_id
      WHERE ps.user_id = $1
      ORDER BY ps.high_score DESC
    `, [userId]);

    const garageValue = garageQuery.rows
      .filter(car => car.unlocked)
      .reduce((sum, car) => sum + car.cost_to_unlock, 0);

    res.json({
      user: {
        ...userData,
        level: Math.floor(userData.monedas / 3000) + 1,
        garage_value: garageValue,
        total_cars: garageQuery.rows.filter(c => c.unlocked).length,
        total_cars_available: garageQuery.rows.length,
        maps_completed: recordsQuery.rows.length
      },
      garage: garageQuery.rows,
      trophies: trophiesQuery.rows,
      records: recordsQuery.rows
    });

  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

// --- 5. WIKI DE MAPAS  ---
app.get("/api/maps/public", async (req, res) => {
  try {
    const query = `
      SELECT 
        m.map_id, 
        m.name, 
        m.cost_to_unlock,
        m.description,
        -- Récord Mundial (Máximo histórico de cualquier jugador)
        COALESCE((SELECT MAX(high_score) FROM "Player_Score" ps WHERE ps.map_id = m.map_id), 0) as world_record,
        -- Popularidad (Cuántos jugadores tienen este mapa)
        (SELECT COUNT(*) FROM "Player_Map_Inventory" pmi WHERE pmi.map_id = m.map_id) as total_owners
      FROM "Map" m
      ORDER BY m.cost_to_unlock ASC
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (error) {
    console.error("Error al obtener wiki pública:", error);
    res.status(500).json({ error: "Error interno" });
  }
});


// --- INICIAR SERVIDOR ---
// Solo arranca el servidor si NO estamos en Vercel
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Servidor local corriendo en http://localhost:${port}`);
  });
}

// Exportación obligatoria para Vercel
export default app;
