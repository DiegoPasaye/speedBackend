-- ==========================================
-- SCRIPT DE POBLADO MASIVO (SEEDING) - V7 (VARIABILIDAD REALISTA)
-- ==========================================

-- 0. ACTIVAR EXTENSIÓN DE ENCRIPTACIÓN
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. AJUSTES DE ESQUEMA
ALTER TABLE "Car" DROP COLUMN IF EXISTS "base_agarre";
ALTER TABLE "Player_Car" DROP COLUMN IF EXISTS "level_agarre";
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "base_aceleracion" FLOAT NOT NULL DEFAULT 1.0;

-- 2. LIMPIEZA DE DATOS
TRUNCATE "User", "Map", "Car", "Achievement", "Group" RESTART IDENTITY CASCADE;

-- 3. INSERTAR MAPAS
INSERT INTO "Map" (name, cost_to_unlock) VALUES 
('Cañón Desértico', 0),
('Montaña Nevada', 2500),
('Ciudad Neón', 5000),
('Superficie Lunar', 10000);

-- 4. INSERTAR LOGROS
INSERT INTO "Achievement" (name, description, reward_monedas) VALUES 
('Primeros Pasos', 'Termina tu primera carrera', 100),
('Ahorrador', 'Acumula 5,000 monedas', 500),
('Coleccionista', 'Ten 2 coches en tu garaje', 1000),
('Explorador', 'Desbloquea un mapa nuevo', 800),
('Mecánico', 'Realiza tu primera mejora de vehículo', 300);

-- 5. INSERTAR COCHES 
INSERT INTO "Car" (name, cost_to_unlock, base_motor, base_durabilidad, base_aceleracion) VALUES 
-- Buggies
('Buggy Rojo', 0, 1.0, 1.0, 1.0),
('Buggy Azul', 500, 1.0, 1.0, 1.0),
('Buggy Verde', 500, 1.0, 1.0, 1.0),
-- Monster Trucks
('Monster Truck Fuego', 2000, 0.8, 2.0, 0.7),
('Monster Truck Hielo', 2000, 0.8, 2.0, 0.7),
('Monster Truck Toxico', 2000, 0.8, 2.0, 0.7),
-- Deportivos
('Racer X Rojo', 5000, 2.0, 0.5, 1.8),
('Racer X Negro', 5000, 2.0, 0.5, 1.8),
('Racer X Blanco', 5000, 2.0, 0.5, 1.8),
-- Jeeps
('Jeep 4x4 Militar', 8000, 0.7, 1.8, 0.9),
('Jeep 4x4 Safari', 8000, 0.7, 1.8, 0.9),
('Jeep 4x4 Urbano', 8000, 0.7, 1.8, 0.9);

-- 6. GENERAR 30 USUARIOS (Lógica con Variabilidad)
DO $$
DECLARE
    curr_user_id UUID;
    curr_car_id UUID;
    curr_map_id UUID;
    curr_ach_id UUID;
    i INT;
    j INT;
    rand_coins INT;
    -- Variables para controlar la cantidad aleatoria de items por usuario
    num_cars_extra INT;
    num_maps_extra INT;
    num_achs_extra INT;
BEGIN
    FOR i IN 1..30 LOOP
        
        -- A. Crear Usuario
        INSERT INTO "User" (username, email, password_hash) 
        VALUES ('usuario' || i, 'usuario' || i || '@speed.com', crypt('123456', gen_salt('bf')))
        RETURNING user_id INTO curr_user_id;

        -- B. Crear Perfil (Monedas muy variadas: unos pobres, otros ricos)
        rand_coins := floor(random() * 80000); 
        INSERT INTO "Profile" (user_id, display_name, monedas)
        VALUES (curr_user_id, 'Corredor ' || i, rand_coins);

        -- C. Coche Inicial (Siempre tienen este)
        SELECT car_id INTO curr_car_id FROM "Car" WHERE name = 'Buggy Rojo';
        INSERT INTO "Player_Car" (user_id, car_id, level_motor, level_durabilidad)
        VALUES (curr_user_id, curr_car_id, floor(random()*3), floor(random()*3));

        -- D. Coches Extra (Aleatorio entre 0 y 4 coches más)
        num_cars_extra := floor(random() * 5); -- Da un número entre 0 y 4
        IF num_cars_extra > 0 THEN
            FOR j IN 1..num_cars_extra LOOP
                SELECT car_id INTO curr_car_id FROM "Car" WHERE name != 'Buggy Rojo' ORDER BY random() LIMIT 1;
                BEGIN
                    INSERT INTO "Player_Car" (user_id, car_id, level_motor, level_durabilidad)
                    VALUES (curr_user_id, curr_car_id, floor(random()*10), floor(random()*10));
                EXCEPTION WHEN unique_violation THEN END; 
            END LOOP;
        END IF;

        -- E. Mapa Inicial (Siempre tienen este)
        SELECT map_id INTO curr_map_id FROM "Map" WHERE name = 'Cañón Desértico';
        INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
        INSERT INTO "Player_Score" (user_id, map_id, high_score) 
        VALUES (curr_user_id, curr_map_id, floor(random() * 2000)); -- Puntuación baja en el inicial

        -- F. Mapas Extra (Aleatorio entre 0 y 3 mapas más)
        num_maps_extra := floor(random() * 4); -- Da un número entre 0 y 3
        IF num_maps_extra > 0 THEN
            FOR curr_map_id IN SELECT map_id FROM "Map" WHERE name != 'Cañón Desértico' ORDER BY random() LIMIT num_maps_extra LOOP
                BEGIN
                    INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
                    INSERT INTO "Player_Score" (user_id, map_id, high_score) 
                    VALUES (curr_user_id, curr_map_id, floor(random() * 15000)); -- Puntuaciones más altas
                EXCEPTION WHEN unique_violation THEN END;
            END LOOP;
        END IF;

        -- G. Logros (Aleatorio entre 0 y 5 logros)
        num_achs_extra := floor(random() * 6); -- Da un número entre 0 y 5
        IF num_achs_extra > 0 THEN
            FOR curr_ach_id IN SELECT achievement_id FROM "Achievement" ORDER BY random() LIMIT num_achs_extra LOOP
                BEGIN
                    INSERT INTO "Player_Achievement" (user_id, achievement_id, unlocked_at, claimed_at)
                    VALUES (curr_user_id, curr_ach_id, NOW(), CASE WHEN random() > 0.4 THEN NOW() ELSE NULL END);
                EXCEPTION WHEN unique_violation THEN END;
            END LOOP;
        END IF;

    END LOOP;
END $$;