import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    try {
        // Try inserting a dummy product with recipe to see if column exists
        const { error } = await supabase.from('products').insert([{
            name: 'Test Product',
            price: 10,
            category: 'BURGER',
            tenant_id: 'dummy',
            recipe: []
        }]);

        if (error && error.code === 'PGRST204') { // Column not found
            console.log("Column 'recipe' is missing.");
            // Now we know we need to create it. We can do so via SQL if we have service role key, or via Supabase dashboard.
            // Since we only have anon key, we'll try to execute raw SQL if allowed, or instruct user.
            console.log("Error details:", error);
        } else {
            console.log("Column 'recipe' seems to exist or another error occurred:", error);
        }
    } catch (e) {
        console.error(e);
    }
}

main();
