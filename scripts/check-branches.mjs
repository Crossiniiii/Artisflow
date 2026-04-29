import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkBranches() {
    const { data, error } = await supabase.from('branches').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Branches in DB:', JSON.stringify(data, null, 2));
    }
}

checkBranches();
