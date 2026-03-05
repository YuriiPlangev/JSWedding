-- Update RLS policy for contractor_documents to allow all organizers to manage documents
-- (Not just the event creator)

-- Drop old policy
DROP POLICY IF EXISTS "Organizers can manage contractor documents" ON contractor_documents;

-- Create new simplified policy
-- Any user with organizer or main_organizer role can manage all contractor documents
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
