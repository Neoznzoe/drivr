-- Migration: Create segment records table
-- Description: Records/performances sur les segments

CREATE TABLE segment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

    -- Performance
    duration_seconds INTEGER NOT NULL,
    avg_speed_kmh DECIMAL(6, 2) NOT NULL,
    max_speed_kmh DECIMAL(6, 2),

    -- Timestamps du passage
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Ranking au moment de l'enregistrement
    rank_at_creation INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_segment_records_segment_id ON segment_records(segment_id);
CREATE INDEX idx_segment_records_user_id ON segment_records(user_id);
CREATE INDEX idx_segment_records_session_id ON segment_records(session_id);
CREATE INDEX idx_segment_records_vehicle_id ON segment_records(vehicle_id);
CREATE INDEX idx_segment_records_duration ON segment_records(segment_id, duration_seconds);

-- Index unique pour éviter les doublons session/segment
CREATE UNIQUE INDEX idx_segment_records_unique_session
    ON segment_records(segment_id, session_id);
