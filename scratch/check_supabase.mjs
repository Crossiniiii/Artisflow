import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Anon Key:', supabaseAnonKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables. Make sure .env or .env.local is populated.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  try {
    // 1. Test database ping
    console.log('\n--- Checking Database ---');
    const { data: artworks, count, error: dbError } = await supabase
      .from('artworks')
      .select('id, title, code', { count: 'exact' })
      .limit(5);

    if (dbError) {
      console.error('❌ Database Connection Error:', dbError.message);
    } else {
      console.log('✅ Database Connection Success!');
      console.log(`Total artworks count: ${count}`);
      console.log('Sample artworks:', artworks);
    }

    // 2. Test storage ping
    console.log('\n--- Checking Storage Buckets ---');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.error('❌ Storage Connection Error:', storageError.message);
    } else {
      console.log('✅ Storage Connection Success!');
      console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    }

    // 3. Check for schema or data inconsistencies
    console.log('\n--- Checking for Data Inconsistencies ---');
    if (artworks && artworks.length > 0) {
      const { data: allArtworks, error: allErr } = await supabase.from('artworks').select('*');
      if (allErr) {
        console.error('❌ Failed to fetch artworks for consistency check:', allErr.message);
      } else {
        console.log(`Analyzing ${allArtworks.length} artwork records...`);
        let missingCodes = 0;
        let missingBranches = 0;
        let invalidStatus = 0;
        let nullPrices = 0;

        allArtworks.forEach(art => {
          if (!art.code) missingCodes++;
          if (!art.current_branch) missingBranches++;
          if (!art.status) invalidStatus++;
          if (art.price === null || art.price === undefined) nullPrices++;
        });

        if (missingCodes === 0 && missingBranches === 0 && invalidStatus === 0 && nullPrices === 0) {
          console.log('✅ Data Consistency: Excellent! All records have code, branch, status, and price.');
        } else {
          console.warn('⚠️ Data Inconsistencies Identified:');
          if (missingCodes > 0) console.warn(`   - ${missingCodes} artworks are missing a unique 'code'.`);
          if (missingBranches > 0) console.warn(`   - ${missingBranches} artworks are missing a 'current_branch'.`);
          if (invalidStatus > 0) console.warn(`   - ${invalidStatus} artworks are missing 'status'.`);
          if (nullPrices > 0) console.warn(`   - ${nullPrices} artworks have null prices.`);
        }
      }
    } else {
      console.log('⚠️ No artworks found in database to analyze for consistency.');
    }

  } catch (err) {
    console.error('❌ Unexpected Connection Error:', err);
  }
}

checkConnection();
