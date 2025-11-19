import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Conexión a Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Solamente para probar en desarrollo loca, valida que no se ejecute en producción, hay que eliminar este bloque para producción
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Servidor local corriendo en http://localhost:${port}`);
  });
}

// Ruta de prueba
app.get("/api", (req, res) => {
  res.json({ message: "Backend funcionando correctamente en Vercel 🚀" });
});

// Ejemplo de endpoint
app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, score FROM scores ORDER BY score DESC LIMIT 10"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al consultar leaderboard" });
  }
});

// --- REGISTRO ---
app.post("/api/register", async (req, res) => {
  const { username, email, password, display_name } = req.body;

  // Validar campos obligatorios
  if (!username || !email || !password || !display_name) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await pool.query(
      'SELECT * FROM "User" WHERE username = $1',
      [username]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const newUser = await pool.query(
      `INSERT INTO "User" (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, username, created_at`,
      [username, email, hashedPassword]
    );

    // Crear el perfil asociado
    await pool.query(
      `INSERT INTO "Profile" (user_id, display_name)
       VALUES ($1, $2)`,
      [newUser.rows[0].user_id, display_name]
    );

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error("Error en /api/register:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


// --- LOGIN ---
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  // Validar campos
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM "User" WHERE username = $1',
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Usuario o contraseña incorrectos" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Obtener datos del perfil
    const profileResult = await pool.query(
      'SELECT display_name, monedas FROM "Profile" WHERE user_id = $1',
      [user.user_id]
    );

    res.json({
      message: "Inicio de sesión exitoso",
      user: {
        user_id: user.user_id,
        username: user.username,
        created_at: user.created_at,
        profile: profileResult.rows[0]
      }
    });

  } catch (error) {
    console.error("Error en /api/login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Exportación obligatoria para Vercel
export default app;
