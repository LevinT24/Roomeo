-- Room Photos Database Schema
-- This creates the room_photos table and associated policies for the Roomio app

-- Create room_photos table
CREATE TABLE IF NOT EXISTS room_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 1,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_room_photos_user_id ON room_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_room_photos_primary ON room_photos(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_room_photos_order ON room_photos(user_id, display_order);

-- Enable Row Level Security
ALTER TABLE room_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view room photos for discovery
CREATE POLICY "Anyone can view room photos" ON room_photos
    FOR SELECT 
    USING (true);

-- RLS Policy: Users can manage their own room photos
CREATE POLICY "Users can manage own room photos" ON room_photos
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create a function to ensure only one primary photo per user
CREATE OR REPLACE FUNCTION ensure_single_primary_photo()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a photo as primary, unset all other primary photos for this user
    IF NEW.is_primary = true THEN
        UPDATE room_photos 
        SET is_primary = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce single primary photo
DROP TRIGGER IF EXISTS trigger_ensure_single_primary_photo ON room_photos;
CREATE TRIGGER trigger_ensure_single_primary_photo
    BEFORE INSERT OR UPDATE ON room_photos
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_photo();

-- Create a function to automatically set display order
CREATE OR REPLACE FUNCTION set_room_photo_display_order()
RETURNS TRIGGER AS $$
BEGIN
    -- If no display_order provided, set it to the next available number
    IF NEW.display_order IS NULL OR NEW.display_order = 1 THEN
        SELECT COALESCE(MAX(display_order), 0) + 1 
        INTO NEW.display_order 
        FROM room_photos 
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto display order
DROP TRIGGER IF EXISTS trigger_set_room_photo_display_order ON room_photos;
CREATE TRIGGER trigger_set_room_photo_display_order
    BEFORE INSERT ON room_photos
    FOR EACH ROW
    EXECUTE FUNCTION set_room_photo_display_order();

-- Create storage bucket for room photos (this needs to be run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('room-photos', 'room-photos', true);

-- Grant permissions on the room_photos table to authenticated users
GRANT ALL ON room_photos TO authenticated;
GRANT ALL ON room_photos TO anon;

-- Create helper function to get room photos for a user
CREATE OR REPLACE FUNCTION get_user_room_photos(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    photo_url TEXT,
    caption TEXT,
    is_primary BOOLEAN,
    display_order INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.id,
        rp.photo_url,
        rp.caption,
        rp.is_primary,
        rp.display_order,
        rp.uploaded_at
    FROM room_photos rp
    WHERE rp.user_id = target_user_id
    ORDER BY rp.display_order ASC, rp.uploaded_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_room_photos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_room_photos(UUID) TO anon;

-- Create helper function to get primary room photo for a user
CREATE OR REPLACE FUNCTION get_primary_room_photo(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    photo_url TEXT,
    caption TEXT,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.id,
        rp.photo_url,
        rp.caption,
        rp.display_order
    FROM room_photos rp
    WHERE rp.user_id = target_user_id AND rp.is_primary = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_primary_room_photo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_primary_room_photo(UUID) TO anon;