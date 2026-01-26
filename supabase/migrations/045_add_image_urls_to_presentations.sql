-- Migration: Add image_urls[] column to presentations for storing image-based presentation pages
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Optionally, add a trigger to keep image_urls in sync if needed (not required for MVP)

-- No data migration needed if this is a new feature.
