import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_schema_details');
    if (error) {
        // If RPC doesn't exist, try a direct query via the REST API if permitted
        console.log("RPC failed, trying raw query...");
        const queries = [
            "SELECT * FROM information_schema.key_column_usage WHERE table_name = 'branches'",
            "SELECT * FROM pg_policies WHERE tablename = 'branches'"
        ];
        // Note: Direct queries to information_schema via standard anon key often fail unless the user has bypass-RLS or it's exposed.
    } else {
        console.log('Schema:', JSON.stringify(data, null, 2));
    }
}
checkSchema();
