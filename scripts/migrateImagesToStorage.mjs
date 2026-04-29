import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Fetching artworks from database...');
    const { data: artworks, error } = await supabase.from('artworks').select('id, image_url, title');
    
    if (error) {
        console.error("Failed to fetch artworks:", error);
        return;
    }
    
    console.log(`Found ${artworks.length} artworks. Checking for Base64 images...`);
    let updated = 0;
    
    for (const art of artworks) {
        if (art.image_url && art.image_url.startsWith('data:image')) {
            console.log(`[Processing] ${art.title} (${art.id})`);
            
            try {
                // Extract base64 and mime type
                const matches = art.image_url.match(/^data:(.+?);base64,(.+)$/);
                if (matches) {
                    const mimeString = matches[1];
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    const extMatch = mimeString.match(/\/([a-zA-Z0-9]+)/);
                    const ext = extMatch ? extMatch[1] : 'jpg';
                    const fileName = `artworks/${art.id}_${Date.now()}.${ext}`;
                    
                    // Upload to Storage
                    const { error: uploadError } = await supabase.storage.from('images').upload(fileName, buffer, {
                        contentType: mimeString,
                        cacheControl: '3600',
                        upsert: false
                    });
                    
                    if (uploadError) {
                        console.error(`[Upload Error] ${art.title}:`, uploadError.message);
                        continue;
                    }
                    
                    // Get Public URL
                    const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(fileName);
                    const publicUrl = publicUrlData.publicUrl;
                    
                    // Update Database
                    const { error: updateError } = await supabase.from('artworks').update({ image_url: publicUrl }).eq('id', art.id);
                    if (updateError) {
                        console.error(`[Update Error] ${art.title}:`, updateError.message);
                    } else {
                        console.log(`[Success] Migrated ${art.title}`);
                        updated++;
                    }
                }
            } catch (err) {
                console.error(`[Exception] Processing ${art.title}:`, err);
            }
        }
    }
    console.log(`\nMigration complete. Successfully moved ${updated} images to Supabase Storage.`);
}

migrate();
