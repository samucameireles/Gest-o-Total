// test_allowed_addons.cjs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('Supabase URL not set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, name, allowed_add_ons')
        .limit(5);
    if (prodErr) {
        console.error('Error fetching products', prodErr);
        return;
    }
    console.log('Products:', JSON.stringify(products, null, 2));

    const { data: addons, error: addErr } = await supabase.from('addons').select('*');
    if (addErr) {
        console.error('Error fetching addons', addErr);
        return;
    }
    console.log('Addons:', JSON.stringify(addons, null, 2));
})();
