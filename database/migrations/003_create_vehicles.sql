-- Migration: Create vehicles table
-- Description: Véhicules associés aux utilisateurs

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Informations du véhicule
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    color VARCHAR(50),
    license_plate VARCHAR(20),
    photo_url TEXT,

    -- Spécifications
    engine_type VARCHAR(50), -- essence, diesel, electrique, hybride
    horsepower INTEGER,

    -- Stats du véhicule
    total_distance_km DECIMAL(10, 2) DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Statut
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_brand_model ON vehicles(brand, model);

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Un seul véhicule primaire par utilisateur
CREATE UNIQUE INDEX idx_vehicles_primary_per_user
    ON vehicles(user_id)
    WHERE is_primary = true;
