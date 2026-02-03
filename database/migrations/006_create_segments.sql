-- Migration: Create segments table
-- Description: Segments de route (cols, autoroutes, etc.)

CREATE TYPE segment_type AS ENUM ('col', 'autoroute', 'nationale', 'departementale', 'custom');

CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Créateur (null si segment officiel)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Informations
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type segment_type DEFAULT 'custom',

    -- Tracé du segment
    route GEOGRAPHY(LINESTRING, 4326) NOT NULL,
    start_point GEOGRAPHY(POINT, 4326) NOT NULL,
    end_point GEOGRAPHY(POINT, 4326) NOT NULL,

    -- Métadonnées
    distance_km DECIMAL(10, 2) NOT NULL,
    elevation_gain INTEGER, -- Dénivelé positif en mètres
    elevation_loss INTEGER, -- Dénivelé négatif en mètres

    -- Zone de détection (buffer autour du tracé)
    detection_zone GEOGRAPHY(POLYGON, 4326),

    -- Stats
    total_attempts INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Statut
    is_official BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_segments_type ON segments(type);
CREATE INDEX idx_segments_created_by ON segments(created_by);
CREATE INDEX idx_segments_route ON segments USING GIST(route);
CREATE INDEX idx_segments_start_point ON segments USING GIST(start_point);
CREATE INDEX idx_segments_detection_zone ON segments USING GIST(detection_zone);

CREATE TRIGGER update_segments_updated_at
    BEFORE UPDATE ON segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
