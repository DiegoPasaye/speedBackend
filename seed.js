import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const seedDatabase = async () => {
    try {
        console.log("🌱 Leyendo archivo seed_data.sql...");
        const sqlPath = path.join(__dirname, "seed_data.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");

        console.log("🚀 Ejecutando inserciones...");
        await pool.query(sql);

        console.log("✅ ¡ÉXITO! 30 usuarios creados con mapas, coches y logros.");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await pool.end();
    }
};

seedDatabase();