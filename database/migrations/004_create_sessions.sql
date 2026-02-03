-- Migration: Create sessions table
-- Description: Sessions de conduite

CREATE TYPE session_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
CREATE TYPE session_visibility AS ENUM ('private', 'friends', 'public');

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

    -- Statut
    status session_status DEFAULT 'active',
    visibility session_visibility DEFAULT 'private',

    -- Données de la session
    title VARCHAR(200),
    description TEXT,

    -- Points de départ/arrivée (PostGIS)
    start_point GEOGRAPHY(POINT, 4326),
    end_point GEOGRAPHY(POINT, 4326),
    start_address TEXT,
    end_address TEXT,

    -- Statistiques
    distance_km DECIMAL(10, 2) DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    avg_speed_kmh DECIMAL(6, 2) DEFAULT 0,
    max_speed_kmh DECIMAL(6, 2) DEFAULT 0,

    -- Tracé complet (LineString)
    route GEOGRAPHY(LINESTRING, 4326),

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paused_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_vehicle_id ON sessions(vehicle_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_visibility ON sessions(visibility);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_sessions_route ON sessions USING GIST(route);

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
