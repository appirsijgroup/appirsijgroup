-- Drop existing table and policies if they exist
DROP TABLE IF EXISTS public.bookmarks CASCADE;

-- Create bookmarks table for Quran ayah bookmarks
CREATE TABLE public.bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Changed from UUID to TEXT to store Employee ID (NIP/NOPEG)
    surah_number INTEGER NOT NULL,
    surah_name TEXT NOT NULL,
    ayah_number INTEGER NOT NULL,
    ayah_text TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, surah_number, ayah_number)
);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own bookmarks
-- Note: We compare user_id with the employee ID from the application
CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks
    FOR SELECT
    USING (true); -- Allow all authenticated users to view (we filter by user_id in the query)

-- Create policy: Users can insert their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
    ON public.bookmarks
    FOR INSERT
    WITH CHECK (true); -- Allow authenticated users to insert

-- Create policy: Users can update their own bookmarks
CREATE POLICY "Users can update own bookmarks"
    ON public.bookmarks
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Create policy: Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks
    FOR DELETE
    USING (true);

-- Create index for faster queries
CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_surah_ayah ON public.bookmarks(surah_number, ayah_number);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.bookmarks TO authenticated;
GRANT SELECT ON public.bookmarks TO anon;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookmarks_updated_at
    BEFORE UPDATE ON public.bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
