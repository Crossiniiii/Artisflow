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

async function check() {
    console.log('Checking artworks in Supabase...');
    const { data: artworks, error } = await supabase.from('artworks').select('id, image_url, title');
    
    if (error) {
        console.error("Failed to fetch artworks:", error);
        return;
    }
    
    console.log(`\nTotal Artworks found in database: ${artworks.length}`);
    let badCount = 0;
    
    for (const art of artworks) {
        if (art.image_url && art.image_url.startsWith('data:image')) {
            badCount++;
            console.log(`- Still exists: ${art.title} (${art.id}) with Base64 image.`);
        }
    }
    
    if (badCount === 0) {
        console.log(`\nSUCCESS! Zero Base64 artworks found. The deletion was perfectly synced.`);
    } else {
        console.log(`\nWARNING: Found ${badCount} artworks still containing Base64 images.`);
    }
}

check();
