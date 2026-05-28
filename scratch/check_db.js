import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env
const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

console.log('URL:', url);
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('sales').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Sample sale record:', data);
  }
}
run();
