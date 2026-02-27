import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Starting fetch...");
    const { data: ads, error: adsError } = await supabase.from('addons').select('*');
    console.log('ADDONS:', ads?.length, adsError);

    // Test product specifically to see if allowedAddOns is returned
    const { data: prods, error: prodsError } = await supabase.from('products').select('id, name, allowed_add_ons').limit(5);
    console.log('PRODS:', prods, prodsError);
}

run().catch(console.error);
