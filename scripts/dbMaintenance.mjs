import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
    console.log('--- STARTING DATABASE MAINTENANCE ---');
    
    // Check Artworks
    const { data: artworks, error: artError } = await supabase.from('artworks').select('id, title, code');
    if (artError) {
        console.error('Failed to fetch artworks:', artError);
    } else {
        const malformedArtworks = artworks.filter(a => !a.title || !a.code || a.title.trim() === '' || a.code.trim() === '');
        console.log(`Found ${malformedArtworks.length} malformed artworks (missing title or code).`);
        if (malformedArtworks.length > 0) {
            console.log(malformedArtworks.map(a => a.id));
        }
    }

    // Check Sales
    const { data: sales, error: salesError } = await supabase.from('sales').select('id, artwork_id, client_name');
    if (salesError) {
        console.error('Failed to fetch sales:', salesError);
    } else {
        const orphanedSales = sales.filter(s => !s.artwork_id);
        console.log(`Found ${orphanedSales.length} orphaned sales (missing artwork reference).`);
    }

    // Check Activity Logs
    const { data: logs, error: logsError } = await supabase.from('activity_logs').select('id, action, user_name');
    if (logsError) {
        console.error('Failed to fetch logs:', logsError);
    } else {
        // Find logs where action is completely null
        const badLogs = logs.filter(l => !l.action);
        console.log(`Found ${badLogs.length} corrupted activity logs (missing action).`);
    }
    
    console.log('--- MAINTENANCE CHECK COMPLETE ---');
}

clean();
