import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://izwpthubencimzsgervo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d3B0aHViZW5jaW16c2dlcnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTgyMzMsImV4cCI6MjA4ODI5NDIzM30.KIJHWcgwLGTSUa6qSJoh2tPMrzkdO9jVe87BOF-7Ey4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
