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
    const { data, error } = await supabase
        .from('products')
        .select('id, name, allowed_addons')
        .limit(5);
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }
    console.log('Products with allowed_addons:', JSON.stringify(data, null, 2));
})();
