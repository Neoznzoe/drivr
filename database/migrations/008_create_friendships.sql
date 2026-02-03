-- Migration: Create friendships table
-- Description: Relations d'amitié entre utilisateurs

CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');

CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status friendship_status DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Contrainte: pas d'auto-amitié
    CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);

-- Index pour les recherches
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Index unique pour éviter les doublons (dans les deux sens)
CREATE UNIQUE INDEX idx_friendships_unique_pair
    ON friendships(LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
