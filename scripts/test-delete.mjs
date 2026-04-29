import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testDelete() {
    console.log("Attempting to delete 'Private Collection'...");
    const { data, error } = await supabase.from('branches').delete().eq('name', 'Private Collection');
    if (error) {
        console.error("DELETE ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS:", data);
    }
}

testDelete();
