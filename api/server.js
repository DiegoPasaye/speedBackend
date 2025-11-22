import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

// CONFIGURACIÓN DE CORS cors
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

// --- RUTA DE PRUEBA DB ---
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "OK", db_time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: "ERROR", error: error.message });
  }
});

// --- REGISTRO ---
app.post("/api/register", async (req, res) => {

  const { username, email, password, display_name } = req.body;

  if (!username || !email || !password || !display_name) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const client = await pool.connect(); // Usamos cliente para transacción

  try {
    await client.query('BEGIN');

    // Verificar duplicados
    const existingUser = await client.query(
      'SELECT * FROM "User" WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "El usuario o correo ya existen" });
    }

    // Encriptar
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear Usuario
    const newUserRes = await client.query(
      `INSERT INTO "User" (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, username, created_at`,
      [username, email, hashedPassword]
    );
    const newUser = newUserRes.rows[0];

    // Crear Perfil
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
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    client.release();
  }
});


// --- LOGIN ---
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



// --- LEADERBOARD GLOBAL (Suma de todos los mapas) ---
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
export default app;


if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}