import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Conexión a la Base de Datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Nombre del usuario que quieres checar
const targetUsername = process.argv[2] || '095e3397-1cbe-46bd-8ea4-8b1406073d3e'; // Por defecto busca 'nomatech'

const checkUserStats = async () => {
    try {
        console.log(`\n🔍 Buscando estadísticas para el usuario: "${targetUsername}"...`);

        // 1. Obtener Usuario y Perfil (Monedas)
        const userQuery = `
            SELECT u.user_id, u.username, u.email, p.display_name, p.monedas, p.races_played
            FROM "User" u
            JOIN "Profile" p ON u.user_id = p.user_id
            WHERE u.user_id = $1
        `;
        const userRes = await pool.query(userQuery, [targetUsername]);

        if (userRes.rows.length === 0) {
            console.error(`❌ Error: No se encontró ningún usuario con el user_id "${targetUsername}".`);
            return;
        }

        const user = userRes.rows[0];
        console.log("\n👤 --- PERFIL ---");
        console.table([{
            ID: user.user_id,
            Usuario: user.username,
            Nombre: user.display_name,
            Monedas: user.monedas, // <--- AQUÍ ESTÁN LAS MONEDAS
            Carreras: user.races_played
        }]);

        // 2. Obtener Puntajes por Mapa (High Scores)
        const scoresQuery = `
            SELECT m.name as "Mapa", ps.high_score as "Puntaje Récord"
            FROM "Player_Score" ps
            JOIN "Map" m ON ps.map_id = m.map_id
            WHERE ps.user_id = $1
            ORDER BY ps.high_score DESC
        `;
        const scoresRes = await pool.query(scoresQuery, [user.user_id]);

        console.log("\n🏆 --- RÉCORDS POR MAPA ---");
        if (scoresRes.rows.length > 0) {
            console.table(scoresRes.rows);
        } else {
            console.log("   (Este usuario aún no tiene puntajes registrados)");
        }

    } catch (error) {
        console.error("❌ Error al consultar la base de datos:", error);
    } finally {
        await pool.end();
    }
};

checkUserStats();