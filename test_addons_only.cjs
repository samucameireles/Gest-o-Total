// test_addons_only.cjs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
(async () => {
    const { data, error } = await supabase.from('addons').select('*').limit(5);
    if (error) {
        console.error('Error fetching addons', error);
        return;
    }
    console.log('Addons:', JSON.stringify(data, null, 2));
})();
