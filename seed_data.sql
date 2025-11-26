-- ==========================================
-- SCRIPT DE POBLADO MASIVO (SEEDING) - V13 (Recompensas garantizadas)
-- ==========================================

-- 0. ACTIVAR EXTENSIÓN
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. AJUSTES DE ESQUEMA (Correcciones y Nuevos Campos)
ALTER TABLE "Car" DROP COLUMN IF EXISTS "base_agarre";
ALTER TABLE "Player_Car" DROP COLUMN IF EXISTS "level_agarre";
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "base_aceleracion" FLOAT NOT NULL DEFAULT 1.0;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "races_played" INT NOT NULL DEFAULT 0;

-- ¡NUEVO! Agregamos descripciones a Mapas y Coches
ALTER TABLE "Map" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 2. LIMPIEZA
TRUNCATE "User", "Map", "Car", "Achievement", "Group" RESTART IDENTITY CASCADE;

-- 3. INSERTAR MAPAS (Con Descripciones)
INSERT INTO "Map" (name, cost_to_unlock, description) VALUES 
(
    'Cañón Desértico', 
    0, 
    'Un terreno árido e implacable. Dunas traicioneras, calor extremo y saltos mortales sobre abismos de roca roja. El campo de pruebas perfecto para novatos.'
),
(
    'Montaña Nevada', 
    2500, 
    'Picos congelados donde la tracción es un lujo. Enfréntate a ventiscas y pendientes de hielo resbaladizo. Solo los mejores logran llegar a la cima.'
),
(
    'Ciudad Neón', 
    5000, 
    'Una metrópolis cyberpunk suspendida en la noche. Autopistas de alta velocidad, loopings que desafían la física y luces de neón. Aquí, la velocidad es la ley.'
),
(
    'Superficie Lunar', 
    10000, 
    'La frontera final. Baja gravedad, cráteres silenciosos y el vacío del espacio. Los saltos son eternos, pero cuidado con perder el control y flotar hacia la nada.'
);

-- 4. INSERTAR LOGROS
INSERT INTO "Achievement" (name, description, reward_monedas) VALUES 
('Primeros Pasos', 'Termina tu primera carrera', 100),
('Ahorrador', 'Acumula 5,000 monedas', 500),
('Coleccionista', 'Ten 2 coches en tu garaje', 1000),
('Explorador', 'Desbloquea un mapa nuevo', 800),
('Mecánico', 'Realiza tu primera mejora de vehículo', 300);

-- 5. INSERTAR COCHES (Con Descripciones ÚNICAS por color)
INSERT INTO "Car" (name, cost_to_unlock, base_motor, base_durabilidad, base_aceleracion, description) VALUES 

-- MODELO 1: "Street Tuner" (Hatchback - Inicial)
('Street Tuner Rojo', 0, 1.0, 1.0, 1.0, 'El clásico indiscutible de las carreras callejeras. Su pintura rojo fuego añade carácter a este hatchback equilibrado. Perfecto para quemar llanta en el asfalto caliente.'),
('Street Tuner Verde', 500, 1.0, 1.0, 1.0, 'Con un acabado verde lima neón, este compacto grita "mírame". Diseñado para destacar en las reuniones nocturnas y deslizarse con estilo entre el tráfico urbano.'),
('Street Tuner Púrpura', 500, 1.0, 1.0, 1.0, 'El rey de la noche. Su tono púrpura metalizado refleja las luces de la ciudad mientras derrapas. Equipado con un sistema de sonido que hace vibrar el chasis.'),
('Street Tuner Amarillo', 500, 1.0, 1.0, 1.0, 'Ágil como una avispa. Este Tuner amarillo es imposible de ignorar y su manejo nervioso lo hace ideal para curvas cerradas en entornos difíciles.'),

-- MODELO 2: "Terra SUV" (Tanque - Resistente)
('Terra SUV Rojo', 2000, 0.8, 2.0, 0.7, 'Inspirado en vehículos de rescate de alta montaña. Su chasis reforzado color carmesí puede atravesar muros de ladrillo sin abollarse. La seguridad ante todo.'),
('Terra SUV Verde', 2000, 0.8, 2.0, 0.7, 'Edición táctica militar. Pintado en verde oliva mate para operaciones en la jungla profunda. Sus neumáticos de gran tamaño aplastan cualquier obstáculo natural.'),
('Terra SUV Púrpura', 2000, 0.8, 2.0, 0.7, 'Una bestia urbana personalizada. Llantas cromadas y pintura púrpura profunda para dominar el bulevar. Lento, pero con una presencia que intimida a cualquier deportivo.'),
('Terra SUV Amarillo', 2000, 0.8, 2.0, 0.7, 'Construido como maquinaria pesada. Su color amarillo industrial advierte peligro. Ideal para demoliciones controladas y carreras donde el contacto es inevitable.'),

-- MODELO 3: "Phantom GT" (Muscle - Potente)
('Phantom GT Rojo', 5000, 1.8, 0.8, 1.2, 'La leyenda del cuarto de milla. Un muscle car clásico con un motor V8 que ruge como un león. Pura potencia americana en rojo sangre para dominar las rectas.'),
('Phantom GT Verde', 5000, 1.8, 0.8, 1.2, 'Una rareza exótica. Este GT edición especial en verde esmeralda combina la fuerza bruta con un estilo envidiable. Perfecto para quienes buscan algo diferente.'),
('Phantom GT Púrpura', 5000, 1.8, 0.8, 1.2, 'El verdadero Fantasma. Su carrocería púrpura oscuro se camufla en las sombras hasta que enciende sus faros. Elegancia, misterio y potencia desmedida.'),
('Phantom GT Amarillo', 5000, 1.8, 0.8, 1.2, 'Nacido para la pista. Su color amarillo brillante asegura que tus rivales te vean claramente por el retrovisor antes de ser rebasados. Optimizado para alta competencia.'),

-- MODELO 4: "Solaris Supercar" (Hiperauto - Veloz)
('Solaris Supercar Rojo', 8000, 2.2, 0.5, 2.0, 'Pasión italiana convertida en máquina. Fibra de carbono y aerodinámica activa pintada en el rojo más veloz del espectro visible. Un sueño sobre ruedas.'),
('Solaris Supercar Verde', 8000, 2.2, 0.5, 2.0, 'Prototipo de energía limpia pero sucia velocidad. Su acabado verde eléctrico sugiere tecnología experimental de alto voltaje bajo el capó.'),
('Solaris Supercar Púrpura', 8000, 2.2, 0.5, 2.0, 'La joya de la corona. Un hiperauto exclusivo en color amatista. Tan caro que da miedo conducirlo, pero tan rápido que es imposible resistirse.'),
('Solaris Supercar Amarillo', 8000, 2.2, 0.5, 2.0, 'El hijo del sol. Diseñado para romper la barrera del sonido. Su pintura dorada refleja la victoria. Frágil como el cristal, rápido como la luz.');


-- 6. GENERAR 30 USUARIOS (Simulación)
DO $$
DECLARE
    curr_user_id UUID;
    curr_car_id UUID;
    curr_map_id UUID;
    curr_ach_id UUID;
    i INT;
    j INT;
    rand_coins INT;
    rand_races INT;
    num_cars_extra INT;
    num_maps_extra INT;
    num_achs_extra INT;
BEGIN
    FOR i IN 1..30 LOOP
        
        INSERT INTO "User" (username, email, password_hash) 
        VALUES ('usuario' || i, 'usuario' || i || '@speed.com', crypt('123456', gen_salt('bf')))
        RETURNING user_id INTO curr_user_id;

        rand_coins := floor(random() * 80000);
        rand_races := floor(random() * 200);
        
        INSERT INTO "Profile" (user_id, display_name, monedas, races_played)
        VALUES (curr_user_id, 'Corredor ' || i, rand_coins, rand_races);

        -- Coche Inicial
        SELECT car_id INTO curr_car_id FROM "Car" WHERE name = 'Street Tuner Rojo';
        INSERT INTO "Player_Car" (user_id, car_id, level_motor, level_durabilidad)
        VALUES (curr_user_id, curr_car_id, floor(random()*3), floor(random()*3));

        -- Coches Extra
        num_cars_extra := floor(random() * 5);
        IF num_cars_extra > 0 THEN
            FOR j IN 1..num_cars_extra LOOP
                SELECT car_id INTO curr_car_id FROM "Car" WHERE name != 'Street Tuner Rojo' ORDER BY random() LIMIT 1;
                BEGIN
                    INSERT INTO "Player_Car" (user_id, car_id, level_motor, level_durabilidad)
                    VALUES (curr_user_id, curr_car_id, floor(random()*10), floor(random()*10));
                EXCEPTION WHEN unique_violation THEN END; 
            END LOOP;
        END IF;

        -- Mapa Inicial
        SELECT map_id INTO curr_map_id FROM "Map" WHERE name = 'Cañón Desértico';
        INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
        INSERT INTO "Player_Score" (user_id, map_id, high_score) 
        VALUES (curr_user_id, curr_map_id, floor(random() * 2000));

        -- Mapas Extra
        num_maps_extra := floor(random() * 4);
        IF num_maps_extra > 0 THEN
            FOR curr_map_id IN SELECT map_id FROM "Map" WHERE name != 'Cañón Desértico' ORDER BY random() LIMIT num_maps_extra LOOP
                BEGIN
                    INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
                    INSERT INTO "Player_Score" (user_id, map_id, high_score) 
                    VALUES (curr_user_id, curr_map_id, floor(random() * 15000));
                EXCEPTION WHEN unique_violation THEN END;
            END LOOP;
        END IF;

        -- G. Logros
        -- Modificado: Los primeros 15 usuarios siempre tendrán al menos un logro completado SIN reclamar
        num_achs_extra := floor(random() * 6);
        
        -- Aseguramos que al menos tenga 1 logro para asignar
        IF num_achs_extra = 0 AND i <= 15 THEN
            num_achs_extra := 1;
        END IF;

        IF num_achs_extra > 0 THEN
            FOR curr_ach_id IN SELECT achievement_id FROM "Achievement" ORDER BY random() LIMIT num_achs_extra LOOP
                BEGIN
                    INSERT INTO "Player_Achievement" (user_id, achievement_id, unlocked_at, claimed_at)
                    VALUES (
                        curr_user_id, 
                        curr_ach_id, 
                        NOW(), 
                        -- Para los primeros 15 usuarios, forzamos al menos uno sin reclamar (NULL)
                        -- Para los demas es aleatorio
                        CASE 
                            WHEN i <= 15 THEN NULL 
                            ELSE CASE WHEN random() > 0.4 THEN NOW() ELSE NULL END 
                        END
                    );
                EXCEPTION WHEN unique_violation THEN END;
            END LOOP;
        END IF;

    END LOOP;
END $$;