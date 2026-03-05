-- Create contractor_documents table
-- Stores documents that contractors can view/download for specific events

CREATE TABLE IF NOT EXISTS contractor_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name TEXT,
  name_en TEXT,
  name_ru TEXT,
  name_ua TEXT,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contractor_documents_wedding_id ON contractor_documents(wedding_id);

-- Add RLS policies
ALTER TABLE contractor_documents ENABLE ROW LEVEL SECURITY;

-- Organizers and main_organizer can manage contractor documents
-- Simplified: any user with organizer or main_organizer role can manage all documents
CREATE POLICY "Organizers can manage contractor documents"
ON contractor_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('organizer', 'main_organizer')
  )
);

-- Public contractor access is handled through secure RPC functions
-- (token + password verification), so direct anon SELECT is not enabled here.

-- Add comments
COMMENT ON TABLE contractor_documents IS 'Documents shared with contractors for specific events';
COMMENT ON COLUMN contractor_documents.wedding_id IS 'Reference to the wedding/event';
COMMENT ON COLUMN contractor_documents.link IS 'Google Drive, Dropbox, or other external link to document';
