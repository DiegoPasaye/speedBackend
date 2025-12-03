-- ==========================================
-- SCRIPT DE POBLADO MASIVO (SEEDING) - V14 (Nombres Reales)
-- ==========================================

-- 0. ACTIVAR EXTENSIÓN
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. AJUSTES DE ESQUEMA
ALTER TABLE "Car" DROP COLUMN IF EXISTS "base_agarre";
ALTER TABLE "Player_Car" DROP COLUMN IF EXISTS "level_agarre";
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "base_aceleracion" FLOAT NOT NULL DEFAULT 1.0;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "races_played" INT NOT NULL DEFAULT 0;

-- Aseguramos descripciones
ALTER TABLE "Map" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 2. LIMPIEZA
TRUNCATE "User", "Map", "Car", "Achievement", "Group" RESTART IDENTITY CASCADE;

-- 3. INSERTAR MAPAS (TEMÁTICA URBANA)
INSERT INTO "Map" (name, cost_to_unlock, description) VALUES 
(
    'Circuito Residencial', 
    0, 
    'El punto de partida. Un recorrido tranquilo por las afueras de la ciudad con calles anchas, zonas verdes y curvas suaves. Ideal para probar la velocidad de tu coche sin demasiados riesgos. El asfalto está en perfectas condiciones.'
),
(
    'Parque Central', 
    2500, 
    'Un circuito técnico que atraviesa el pulmón verde de la metrópolis. Aunque el paisaje es relajante, las curvas cerradas alrededor de los lagos y árboles pondrán a prueba tu manejo. Cuidado con los bordillos.'
),
(
    'Distrito Financiero', 
    5000, 
    'Carreras a alta velocidad entre rascacielos y oficinas. Este mapa presenta un trazado complejo con intersecciones en ángulo recto y rectas cortas que exigen una aceleración brutal y frenos precisos.'
),
(
    'Ruta Periférica', 
    10000, 
    'El desafío urbano definitivo. Una combinación frenética de tramos de autopista y desvíos estrechos en las afueras industriales. Diseñado para los coches más rápidos, donde un error de cálculo te enviará contra las barreras.'
);

-- 4. INSERTAR LOGROS
INSERT INTO "Achievement" (name, description, reward_monedas) VALUES 
('Primeros Pasos', 'Termina tu primera carrera', 100),
('Ahorrador', 'Acumula 5,000 monedas', 500),
('Coleccionista', 'Ten 2 coches en tu garaje', 1000),
('Explorador', 'Desbloquea un mapa nuevo', 800),
('Mecánico', 'Realiza tu primera mejora de vehículo', 300);

-- 5. INSERTAR COCHES (4 Modelos x 4 Colores)
INSERT INTO "Car" (name, cost_to_unlock, base_motor, base_durabilidad, base_aceleracion, description) VALUES 

-- MODELO 1: "Street Tuner"
('Street Tuner Rojo', 0, 1.0, 1.0, 1.0, 'El clásico indiscutible de las carreras callejeras. Su pintura rojo fuego añade carácter a este hatchback equilibrado.'),
('Street Tuner Verde', 500, 1.0, 1.0, 1.0, 'Con un acabado verde lima neón, este compacto grita "mírame". Diseñado para destacar en las reuniones nocturnas.'),
('Street Tuner Púrpura', 500, 1.0, 1.0, 1.0, 'El rey de la noche. Su tono púrpura metalizado refleja las luces de la ciudad mientras derrapas.'),
('Street Tuner Amarillo', 500, 1.0, 1.0, 1.0, 'Ágil como una avispa. Este Tuner amarillo es imposible de ignorar y su manejo nervioso lo hace ideal para curvas cerradas.'),

-- MODELO 2: "Terra SUV"
('Terra SUV Rojo', 2000, 0.8, 2.0, 0.7, 'Inspirado en vehículos de rescate. Su chasis reforzado color carmesí puede atravesar muros sin abollarse.'),
('Terra SUV Verde', 2000, 0.8, 2.0, 0.7, 'Edición táctica militar. Pintado en verde oliva mate. Sus neumáticos aplastan cualquier obstáculo urbano.'),
('Terra SUV Púrpura', 2000, 0.8, 2.0, 0.7, 'Una bestia urbana personalizada. Llantas cromadas y pintura púrpura profunda para dominar el bulevar.'),
('Terra SUV Amarillo', 2000, 0.8, 2.0, 0.7, 'Construido como maquinaria pesada. Su color amarillo industrial advierte peligro en cada cruce.'),

-- MODELO 3: "Phantom GT"
('Phantom GT Rojo', 5000, 1.8, 0.8, 1.2, 'La leyenda del semáforo. Un muscle car clásico con motor V8 que ruge como un león en rojo sangre.'),
('Phantom GT Verde', 5000, 1.8, 0.8, 1.2, 'Una rareza exótica. Este GT edición especial en verde esmeralda combina fuerza bruta con estilo.'),
('Phantom GT Púrpura', 5000, 1.8, 0.8, 1.2, 'El verdadero Fantasma. Su carrocería púrpura oscuro se camufla en las sombras de los túneles.'),
('Phantom GT Amarillo', 5000, 1.8, 0.8, 1.2, 'Nacido para la pista. Su color amarillo brillante asegura que tus rivales te vean por el retrovisor.'),

-- MODELO 4: "Solaris Supercar"
('Solaris Supercar Rojo', 8000, 2.2, 0.5, 2.0, 'Pasión convertida en máquina. Fibra de carbono pintada en el rojo más veloz del espectro.'),
('Solaris Supercar Verde', 8000, 2.2, 0.5, 2.0, 'Prototipo de energía limpia. Su acabado verde eléctrico sugiere tecnología experimental.'),
('Solaris Supercar Púrpura', 8000, 2.2, 0.5, 2.0, 'La joya de la corona. Un hiperauto exclusivo en color amatista. Tan caro que da miedo conducirlo.'),
('Solaris Supercar Amarillo', 8000, 2.2, 0.5, 2.0, 'El hijo del sol. Diseñado para romper récords. Su pintura dorada refleja la victoria.');


-- 6. GENERAR 30 USUARIOS CON NOMBRES REALES
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
    
    -- Array de nombres reales
    names text[] := ARRAY[
        'Carlos_Racer', 'AnaSpeed', 'TurboDiego', 'SofiaDrift', 'MaxPower99', 
        'NitroLuis', 'ElenaGT', 'RayoMqueen', 'SpeedyGonz', 'MariaKart',
        'JuanPista', 'LolaV8', 'PedroNitro', 'CarmenRally', 'SergioF1',
        'LauraTurbo', 'JavierDrift', 'MartaSpeed', 'PabloRace', 'LuciaGo',
        'AndresMotor', 'RosaRuedas', 'FernandoAlonsoFake', 'ChecoPerezFan', 'HamiltonLover',
        'VerstappenKing', 'SainzOperator', 'NorrisGamer', 'LeclercFerrari', 'RicciardoSmile'
    ];
    curr_name text;
    curr_username text;
BEGIN
    FOR i IN 1..30 LOOP
        
        -- Seleccionar nombre del array (o generar uno si se acaban)
        IF i <= array_length(names, 1) THEN
            curr_name := names[i];
            curr_username := lower(names[i]); -- Username en minúsculas
        ELSE
            curr_name := 'Racer_' || i;
            curr_username := 'racer_' || i;
        END IF;

        -- Crear Usuario
        INSERT INTO "User" (username, email, password_hash) 
        VALUES (curr_username, curr_username || '@speed.com', crypt('123456', gen_salt('bf')))
        RETURNING user_id INTO curr_user_id;

        rand_coins := floor(random() * 80000);
        rand_races := floor(random() * 200);
        
        -- Crear Perfil con Nombre Real
        INSERT INTO "Profile" (user_id, display_name, monedas, races_played)
        VALUES (curr_user_id, curr_name, rand_coins, rand_races);

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

        -- Mapa Inicial (ACTUALIZADO)
        SELECT map_id INTO curr_map_id FROM "Map" WHERE name = 'Circuito Residencial';
        INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
        INSERT INTO "Player_Score" (user_id, map_id, high_score) 
        VALUES (curr_user_id, curr_map_id, floor(random() * 2000));

        -- Mapas Extra
        num_maps_extra := floor(random() * 4);
        IF num_maps_extra > 0 THEN
            FOR curr_map_id IN SELECT map_id FROM "Map" WHERE name != 'Circuito Residencial' ORDER BY random() LIMIT num_maps_extra LOOP
                BEGIN
                    INSERT INTO "Player_Map_Inventory" (user_id, map_id) VALUES (curr_user_id, curr_map_id);
                    INSERT INTO "Player_Score" (user_id, map_id, high_score) 
                    VALUES (curr_user_id, curr_map_id, floor(random() * 15000));
                EXCEPTION WHEN unique_violation THEN END;
            END LOOP;
        END IF;

        -- Logros (Recompensas pendientes para usuarios 1-15)
        num_achs_extra := floor(random() * 6);
        IF num_achs_extra = 0 AND i <= 15 THEN num_achs_extra := 1; END IF;

        IF num_achs_extra > 0 THEN
            FOR curr_ach_id IN SELECT achievement_id FROM "Achievement" ORDER BY random() LIMIT num_achs_extra LOOP
                BEGIN
                    INSERT INTO "Player_Achievement" (user_id, achievement_id, unlocked_at, claimed_at)
                    VALUES (
                        curr_user_id, 
                        curr_ach_id, 
                        NOW(), 
                        CASE WHEN i <= 15 THEN NULL ELSE CASE WHEN random() > 0.4 THEN NOW() ELSE NULL END END
                    );
                EXCEPTION WHEN unique_violation THEN END;
            END LOOP;
        END IF;

    END LOOP;
END $$;