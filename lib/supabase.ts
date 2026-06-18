// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Ye keys tumhari .env.local file se aayengi
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Ye client humare pure app mein database se baat karne ke kaam aayega
export const supabase = createClient(supabaseUrl, supabaseAnonKey)