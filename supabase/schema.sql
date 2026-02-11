-- Add baby_names column to stays table
ALTER TABLE stays 
ADD COLUMN IF NOT EXISTS baby_names TEXT[] DEFAULT '{}';

-- Optional: Update existing records to have empty array if null (though default handles new ones)
UPDATE stays SET baby_names = '{}' WHERE baby_names IS NULL;

-- Wanted Offs Table
CREATE TABLE IF NOT EXISTS wanted_offs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  wanted_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(staff_id, wanted_date)
);

-- RLS Policies (if enabled/needed)
ALTER TABLE wanted_offs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to wanted_offs for authenticated" ON wanted_offs FOR ALL USING (auth.role() = 'authenticated');
