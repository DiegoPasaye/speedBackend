-- -- ==========================================
-- -- SCRIPT DE POBLADO MASIVO (SEEDING) - V10 (Mapas con Lore)
-- -- ==========================================

-- -- 0. ACTIVAR EXTENSIÓN
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -- 1. AJUSTES DE ESQUEMA (Correcciones y Nuevos Campos)
-- ALTER TABLE "Car" DROP COLUMN IF EXISTS "base_agarre";
-- ALTER TABLE "Player_Car" DROP COLUMN IF EXISTS "level_agarre";
-- ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "base_aceleracion" FLOAT NOT NULL DEFAULT 1.0;
-- ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "races_played" INT NOT NULL DEFAULT 0;

-- -- ¡NUEVO! Agregamos descripción a los mapas
-- ALTER TABLE "Map" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- -- 2. LIMPIEZA
-- TRUNCATE "User", "Map", "Car", "Achievement", "Group" RESTART IDENTITY CASCADE;

-- -- 3. INSERTAR MAPAS (Con Descripciones Épicas)
-- INSERT INTO "Map" (name, cost_to_unlock, description) VALUES 
-- (
--     'Cañón Desértico', 
--     0, 
--     'Un terreno árido e implacable donde solo los más resistentes sobreviven. Dunas traicioneras, calor extremo y saltos mortales sobre abismos de roca roja. El campo de pruebas perfecto para novatos.'
-- ),
-- (
--     'Montaña Nevada', 
--     2500, 
--     'Picos congelados donde la tracción es un lujo. Enfréntate a ventiscas cegadoras y pendientes de hielo resbaladizo. Solo los vehículos con mejor control lograrán llegar a la cima sin deslizarse al vacío.'
-- ),
-- (
--     'Ciudad Neón', 
--     5000, 
--     'Una metrópolis cyberpunk suspendida en la noche eterna. Autopistas de alta velocidad iluminadas por neón, loopings que desafían la física y rampas tecnológicas. Aquí, la velocidad pura es la única ley.'
-- ),
-- (
--     'Superficie Lunar', 
--     10000, 
--     'La frontera final. Experimenta la baja gravedad en un paisaje de cráteres silenciosos y polvo gris. Los saltos aquí son eternos, pero cuidado con perder el control y flotar hacia la nada.'
-- );

-- -- 4. INSERTAR LOGROS
-- INSERT INTO "Achievement" (name, description, reward_monedas) VALUES 
-- ('Primeros Pasos', 'Termina tu primera carrera', 100),
-- ('Ahorrador', 'Acumula 5,000 monedas', 500),
-- ('Coleccionista', 'Ten 2 coches en tu garaje', 1000),
-- ('Explorador', 'Desbloquea un mapa nuevo', 800),
-- ('Mecánico', 'Realiza tu primera mejora de vehículo', 300);

-- -- 5. INSERTAR COCHES (4 Modelos x 4 Colores)
-- INSERT INTO "Car" (name, cost_to_unlock, base_motor, base_durabilidad, base_aceleracion) VALUES 

-- -- MODELO 1: "Street Tuner"
-- ('Street Tuner Rojo', 0, 1.0, 1.0, 1.0),
-- ('Street Tuner Verde', 500, 1.0, 1.0, 1.0),
-- ('Street Tuner Púrpura', 500, 1.0, 1.0, 1.0),
-- ('Street Tuner Amarillo', 500, 1.0, 1.0, 1.0),

-- -- MODELO 2: "Terra SUV"
-- ('Terra SUV Rojo', 2000, 0.8, 2.0, 0.7),
-- ('Terra SUV Verde', 2000, 0.8, 2.0, 0.7),
-- ('Terra SUV Púrpura', 2000, 0.8, 2.0, 0.7),
-- ('Terra SUV Amarillo', 2000, 0.8, 2.0, 0.7),

-- -- MODELO 3: "Phantom GT"
-- ('Phantom GT Rojo', 5000, 1.8, 0.8, 1.2),
-- ('Phantom GT Verde', 5000, 1.8, 0.8, 1.2),
-- ('Phantom GT Púrpura', 5000, 1.8, 0.8, 1.2),
-- ('Phantom GT Amarillo', 5000, 1.8, 0.8, 1.2),

-- -- MODELO 4: "Solaris Supercar"
-- ('Solaris Supercar Rojo', 8000, 2.2, 0.5, 2.0),
-- ('Solaris Supercar Verde', 8000, 2.2, 0.5, 2.0),
-- ('Solaris Supercar Púrpura', 8000, 2.2, 0.5, 2.0),
-- ('Solaris Supercar Amarillo', 8000, 2.2, 0.5, 2.0);


-- -- 6. GENERAR 30 USUARIOS (Simulación)
-- DO $$
-- DECLARE
--     curr_user_id UUID;
--     curr_car_id UUID;
--     curr_map_id UUID;
--     curr_ach_id UUID;
--     i INT;
--     j INT;
--     rand_coins INT;
--     rand_races INT;
--     num_cars_extra INT;
--     num_maps_extra INT;
--     num_achs_extra INT;
-- BEGIN
--     FOR i IN 1..30 LOOP
        
--         INSERT INTO "User" (username, email, password_hash) 
--         VALUES ('usuario' || i, 'usuario' || i || '@speed.com', crypt('123456', gen_salt('bf')))
--         RETURNING user_id INTO curr_user_id;

--         rand_coins := floor(random() * 80000);
--         rand_races := floor(random() * 200);
        
--         INSERT INTO "Profile" (user_id, display_name, monedas, races_played)
--         VALUES (curr_user_id, 'Corredor ' || i, rand_coins, rand_races);

--         -- Coche Inicial
--         SELECT car_id INTO curr_car_id FROM "Car" WHERE name = 'Street Tuner Rojo';
--         INSERT INTO "Player_Car" (user_id, car_id, level_motor, level_durabilidad)
--         VALUES (curr_user_id, curr_car_id, floor(random()*3), floor(random()*3));

--         -- Coches Extra
--         num_cars_extra := floor(random() * 5);
--         IF num_cars_extra > 0 THEN
--             FOR j IN 1..num_cars_extra LOOP
--                 SELECT car_id INTO curr_car_id FROM "Car" WHERE name != 'Street Tuner Rojo' ORDER BY random() LIMIT 1;
--                 BEGIN
--                     INSERT INTO "Player_Car" (user_id, car_id, level_motor, level_durabilidad)
--                     VALUES (curr_user_id, curr_car_id, floor(random()*10), floor(random()*10));
--                 EXCEPTION WHEN unique_violation THEN END; 
--             END LOOP;
--         END IF;

--         -- Mapa Inicial (Cañón)
--         SELECT map_id INTO curr_map_id FROM "Map" WHERE name = 'Cañón Desértico';
--         INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
--         INSERT INTO "Player_Score" (user_id, map_id, high_score) 
--         VALUES (curr_user_id, curr_map_id, floor(random() * 2000));

--         -- Mapas Extra
--         num_maps_extra := floor(random() * 4);
--         IF num_maps_extra > 0 THEN
--             FOR curr_map_id IN SELECT map_id FROM "Map" WHERE name != 'Cañón Desértico' ORDER BY random() LIMIT num_maps_extra LOOP
--                 BEGIN
--                     INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
--                     INSERT INTO "Player_Score" (user_id, map_id, high_score) 
--                     VALUES (curr_user_id, curr_map_id, floor(random() * 15000));
--                 EXCEPTION WHEN unique_violation THEN END;
--             END LOOP;
--         END IF;

--         -- Logros
--         num_achs_extra := floor(random() * 6);
--         IF num_achs_extra > 0 THEN
--             FOR curr_ach_id IN SELECT achievement_id FROM "Achievement" ORDER BY random() LIMIT num_achs_extra LOOP
--                 BEGIN
--                     INSERT INTO "Player_Achievement" (user_id, achievement_id, unlocked_at, claimed_at)
--                     VALUES (curr_user_id, curr_ach_id, NOW(), CASE WHEN random() > 0.4 THEN NOW() ELSE NULL END);
--                 EXCEPTION WHEN unique_violation THEN END;
--             END LOOP;
--         END IF;

--     END LOOP;
-- END $$;