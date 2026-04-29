import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);

async function check() {
  console.log('Checking framer_records...');
  const { data, error } = await supabase.from('framer_records').select('*').limit(5);
  console.log('Fetch Result:', data);
  console.log('Fetch Error:', error);

  console.log('Testing Insert...');
  const { data: iData, error: iError } = await supabase.from('framer_records').insert({
    artwork_id: '00000000-0000-0000-0000-000000000000',
    damage_details: 'Test',
    status: 'Open',
    artwork_snapshot: {}
  });
  console.log('Insert Error:', iError);
}

check();
