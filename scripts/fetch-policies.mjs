import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fetchPolicies() {
    console.log("Fetching policies...");
    // Attempt standard RPC if it exists
    let { data: rpcData, error: rpcError } = await supabase.rpc('get_policies');
    
    if (rpcError) {
        console.log("No custom RPC found. Attempting direct query...");
        // This is a long shot if postgrest hasn't exposed pg_policies
        const { data: directData, error: directError } = await supabase
          .from('pg_policies')
          .select('*')
          .limit(100); // Note: pg_policies is usually not exposed by default on the public schema

        if (directError) {
            console.error("Direct query failed:", directError.message);
            console.log("\nWARNING: I cannot access 'pg_policies' automatically via the anon key.");
        } else {
            console.log("Policies:", JSON.stringify(directData, null, 2));
        }
    } else {
        console.log("Policies via RPC:", JSON.stringify(rpcData, null, 2));
    }
}

fetchPolicies();
