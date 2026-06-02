import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kvmheirckuhngouanphl.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_WeIBkH-QohbFnBTgrlR4uw_PXWuyQOu'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
