// Cargar variables de entorno (el DATABASE_URL)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Driver de Postgres

// --- 1. Configuración Inicial ---
const app = express();
const port = process.env.PORT || 3000;

// --- 2. Conexión a Neon (Postgres) ---
// Usa la variable de entorno para conectarse
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para Neon
  }
});

// --- 3. Middlewares ---
// Habilita CORS para que tu app de Angular (ej. localhost:4200)
// pueda hacer peticiones a este servidor (ej. localhost:3000)
app.use(cors()); 

// Permite al servidor entender JSON
app.use(express.json());

// --- 4. API ENDPOINTS (Rutas) ---

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ message: '¡El backend está funcionando!' });
});

/*
 * EJEMPLO: Endpoint para tu <app-leaderboard>
 * Asume que tienes una tabla llamada 'scores'
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Consulta a la base de datos de Neon
    const result = await pool.query(
      'SELECT username, score FROM scores ORDER BY score DESC LIMIT 10'
    );
    
    // Envía los resultados como JSON
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el leaderboard' });
  }
});

// --- 5. Iniciar Servidor ---
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
