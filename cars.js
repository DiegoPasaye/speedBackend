import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const checkAllData = async () => {
    try {
        console.log("🔍 --- 1. CATÁLOGO DE COCHES DISPONIBLES ---");
        const cars = await pool.query(
            'SELECT name, cost_to_unlock, base_motor, base_aceleracion FROM "Car" ORDER BY cost_to_unlock ASC'
        );
        console.table(cars.rows);

        console.log("\n👥 --- 2. RESUMEN GENERAL DE LOS 30 USUARIOS ---");
        // Esta consulta agrupa los conteos para que la tabla sea legible
        const usersSummary = await pool.query(`
            SELECT 
                u.username, 
                u.email,
                p.monedas,
                (SELECT COUNT(*) FROM "Player_Car" pc WHERE pc.user_id = u.user_id) as "Coches",
                (SELECT COUNT(*) FROM "Player_Map_Inventory" pm WHERE pm.user_id = u.user_id) as "Mapas",
                (SELECT COUNT(*) FROM "Player_Achievement" pa WHERE pa.user_id = u.user_id) as "Logros"
            FROM "User" u
            JOIN "Profile" p ON u.user_id = p.user_id
            ORDER BY u.created_at ASC
        `);
        console.table(usersSummary.rows);

        console.log("\n🕵️ --- 3. AUDITORÍA PROFUNDA (Muestra detallada de los primeros 3 usuarios) ---");
        console.log("Aquí verificamos que tengan sus mejoras, puntajes y relaciones correctas:\n");

        // Esta consulta usa JSON_AGG para traer los objetos anidados (coches con sus niveles, mapas con sus scores)
        const detailedUsers = await pool.query(`
            SELECT 
                u.username,
                p.monedas,
                (
                    SELECT json_agg(json_build_object('Modelo', c.name, 'Nvl Motor', pc.level_motor, 'Nvl Durabilidad', pc.level_durabilidad))
                    FROM "Player_Car" pc 
                    JOIN "Car" c ON pc.car_id = c.car_id 
                    WHERE pc.user_id = u.user_id
                ) as "GARAJE (Coches y Mejoras)",
                (
                    SELECT json_agg(json_build_object('Mapa', m.name, 'Récord', ps.high_score))
                    FROM "Player_Score" ps 
                    JOIN "Map" m ON ps.map_id = m.map_id 
                    WHERE ps.user_id = u.user_id
                ) as "PROGRESO (Mapas y Récords)"
            FROM "User" u
            JOIN "Profile" p ON u.user_id = p.user_id
            ORDER BY u.username ASC
            LIMIT 3
        `);

        // Usamos console.dir con depth null para que se vea todo el árbol JSON expandido
        console.dir(detailedUsers.rows, { depth: null, colors: true });

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await pool.end();
    }
};

checkAllData();