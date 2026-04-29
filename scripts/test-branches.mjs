import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: branches, error } = await supabase.from('branches').select('*');
    if (error) {
        fs.writeFileSync('db_branches.json', JSON.stringify({ error }));
    } else {
        fs.writeFileSync('db_branches.json', JSON.stringify(branches, null, 2));
    }
}

run();
