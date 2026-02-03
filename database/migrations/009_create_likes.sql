-- Migration: Create likes table
-- Description: Likes sur les sessions

CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_session_id ON likes(session_id);

-- Un seul like par utilisateur par session
CREATE UNIQUE INDEX idx_likes_unique ON likes(user_id, session_id);
