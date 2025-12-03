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

pool.on('error', (err) => {
  console.error('🔴 Error inesperado en el cliente de base de datos:', err);
  // No salimos del proceso (process.exit) para intentar mantenerlo vivo
});

// 1. Verificar conexión a DB al iniciar
pool.connect()
  .then(client => {
    console.log("✅ Conexión a Base de Datos exitosa");
    client.release();
  })
  .catch(err => {
    console.error("❌ ERROR FATAL DE BASE DE DATOS:", err.message);
  });

// 2. Atrapar errores silenciosos que matan el servidor
process.on('uncaughtException', (error) => {
  console.error('🔥 ERROR NO CAPTURADO (Excepción):', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 ERROR NO CAPTURADO (Promesa):', reason);
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

app.get("/api/rewards/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Traemos TODOS los logros posibles
    // Hacemos LEFT JOIN con los logros del jugador para saber si ya lo tiene y si ya lo cobró
    const query = `
      SELECT 
        a.achievement_id,
        a.name,
        a.description,
        a.reward_monedas,
        CASE WHEN pa.user_id IS NOT NULL THEN true ELSE false END as achieved,
        pa.unlocked_at,
        pa.claimed_at
      FROM "Achievement" a
      LEFT JOIN "Player_Achievement" pa 
        ON a.achievement_id = pa.achievement_id AND pa.user_id = $1
      ORDER BY a.reward_monedas ASC
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);

  } catch (error) {
    console.error("Error al obtener recompensas:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

// B. Reclamar una recompensa
app.post("/api/rewards/claim", async (req, res) => {
  const { userId, achievementId } = req.body;

  if (!userId || !achievementId) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificar que el logro existe, está desbloqueado y NO ha sido reclamado
    const checkQuery = `
      SELECT * FROM "Player_Achievement" 
      WHERE user_id = $1 AND achievement_id = $2
    `;
    const checkRes = await client.query(checkQuery, [userId, achievementId]);

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "No has desbloqueado este logro aún." });
    }

    if (checkRes.rows[0].claimed_at !== null) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Ya reclamaste esta recompensa." });
    }

    // 2. Obtener cuánto vale el premio
    const rewardQuery = `SELECT reward_monedas FROM "Achievement" WHERE achievement_id = $1`;
    const rewardRes = await client.query(rewardQuery, [achievementId]);
    const monto = rewardRes.rows[0].reward_monedas;

    // 3. Marcar como reclamado (Poner fecha en claimed_at)
    await client.query(`
      UPDATE "Player_Achievement"
      SET claimed_at = NOW()
      WHERE user_id = $1 AND achievement_id = $2
    `, [userId, achievementId]);

    // 4. Sumar monedas al perfil
    await client.query(`
      UPDATE "Profile"
      SET monedas = monedas + $1
      WHERE user_id = $2
    `, [monto, userId]);

    // 5. Obtener nuevo saldo para devolverlo al front
    const balanceRes = await client.query(`SELECT monedas FROM "Profile" WHERE user_id = $1`, [userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: "Recompensa reclamada",
      new_balance: balanceRes.rows[0].monedas
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al reclamar recompensa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    client.release();
  }
});

// --- 7. GUARDAR PARTIDA (GAME OVER) ---
app.post("/api/game/save-run", async (req, res) => {
  const { userId, score, coins } = req.body;

  // Validación básica
  if (!userId || score === undefined || coins === undefined) {
    return res.status(400).json({ error: "Faltan datos de la partida" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      UPDATE "Profile"
      SET monedas = monedas + $1,
          races_played = races_played + 1
      WHERE user_id = $2
    `, [coins, userId]);

    // 2. Manejar el Puntaje (High Score)
    // Intentamos insertar el nuevo puntaje. 
    // Si ya existe un registro para este usuario+mapa, actualizamos SOLO si el nuevo es mayor.
    await client.query(`
      INSERT INTO "Player_Score" (user_id, high_score)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        high_score = GREATEST("Player_Score".high_score, EXCLUDED.high_score)
    `, [userId, score]);

    // 3. (Opcional) Verificar Logros al vuelo
    // Por simplicidad, lo dejamos para otra lógica o trigger.

    await client.query('COMMIT');

    // Devolvemos el nuevo saldo para que el juego lo actualice en la UI
    const profileRes = await client.query(
      'SELECT monedas, races_played FROM "Profile" WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: "Partida guardada",
      new_total_coins: profileRes.rows[0].monedas,
      races_played: profileRes.rows[0].races_played
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al guardar partida:", error);
    res.status(500).json({ error: "Error interno al guardar progreso" });
  } finally {
    client.release();
  }
});

app.put("/api/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const { username, email, display_name } = req.body;

  if (!username && !email && !display_name) {
    return res.status(400).json({ error: "No se enviaron datos para actualizar" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Actualizar datos de la tabla "User" (Credenciales)
    if (username || email) {
      await client.query(`
        UPDATE "User"
        SET username = COALESCE($1, username),
            email = COALESCE($2, email)
        WHERE user_id = $3
      `, [username || null, email || null, userId]);
    }

    // 2. Actualizar datos de la tabla "Profile" (Públicos)
    if (display_name) {
      await client.query(`
        UPDATE "Profile"
        SET display_name = $1
        WHERE user_id = $2
      `, [display_name, userId]);
    }

    await client.query('COMMIT');

    // 3. Devolver los datos actualizados
    const updatedUser = await client.query(`
      SELECT u.username, u.email, p.display_name
      FROM "User" u
      JOIN "Profile" p ON u.user_id = p.user_id
      WHERE u.user_id = $1
    `, [userId]);

    res.json({
      message: "Perfil actualizado correctamente",
      user: updatedUser.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al actualizar perfil:", error);

    // Manejo de errores específicos (Duplicados)
    if (error.code === '23505') {
      if (error.detail.includes('username')) {
        return res.status(409).json({ error: "Ese nombre de usuario ya está ocupado" });
      }
      if (error.detail.includes('email')) {
        return res.status(409).json({ error: "Ese correo ya está registrado" });
      }
    }

    res.status(500).json({ error: "Error interno al actualizar" });
  } finally {
    client.release();
  }
});

// --- 9. ELIMINAR CUENTA (DELETE) ---
app.delete("/api/profile/:userId", async (req, res) => {
  const { userId } = req.params;

  try {

    const result = await pool.query('DELETE FROM "User" WHERE user_id = $1', [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Cuenta eliminada permanentemente. ¡Te extrañaremos!" });

  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({ error: "Error interno al eliminar cuenta" });
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
