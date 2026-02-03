-- Migration: Create session points table
-- Description: Points GPS enregistrés pendant une session

CREATE TABLE session_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    -- Position GPS
    point GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    altitude DECIMAL(8, 2),

    -- Données au moment du point
    speed_kmh DECIMAL(6, 2),
    heading DECIMAL(5, 2), -- Direction en degrés
    accuracy DECIMAL(6, 2), -- Précision GPS en mètres

    -- Timestamp
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index séquentiel pour ordonner les points
    sequence_number INTEGER NOT NULL
);

CREATE INDEX idx_session_points_session_id ON session_points(session_id);
CREATE INDEX idx_session_points_recorded_at ON session_points(recorded_at);
CREATE INDEX idx_session_points_sequence ON session_points(session_id, sequence_number);
CREATE INDEX idx_session_points_point ON session_points USING GIST(point);
