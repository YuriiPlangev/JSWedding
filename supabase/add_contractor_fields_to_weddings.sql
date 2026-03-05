-- Add contractor-related fields to weddings table
-- This configures token + password based access for contractors per event.

-- Add token/password fields for contractor access
ALTER TABLE weddings
ADD COLUMN IF NOT EXISTS contractor_token UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS contractor_password_hash TEXT;

-- Add contractor settings fields
ALTER TABLE weddings
ADD COLUMN IF NOT EXISTS contractor_dress_code TEXT,
ADD COLUMN IF NOT EXISTS contractor_organizer_contacts TEXT,
ADD COLUMN IF NOT EXISTS contractor_coordinator_contacts TEXT;

-- Add index for faster lookups by link token
CREATE INDEX IF NOT EXISTS idx_weddings_contractor_token ON weddings(contractor_token);

-- Add comments
COMMENT ON COLUMN weddings.contractor_token IS 'Unique access token for contractor link';
COMMENT ON COLUMN weddings.contractor_password_hash IS 'Hashed contractor access password';
COMMENT ON COLUMN weddings.contractor_dress_code IS 'Dress code information visible to contractors';
COMMENT ON COLUMN weddings.contractor_organizer_contacts IS 'Organizer contact information for contractors';
COMMENT ON COLUMN weddings.contractor_coordinator_contacts IS 'Coordinator contact information for contractors';
