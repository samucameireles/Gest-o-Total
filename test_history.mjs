import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const envKey = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(envUrl, envKey);
async function run() {
    const { data: orders } = await supabase.from('orders').select('total, created_at, status, is_paid');
    const paid = orders?.filter(o => o.is_paid || o.status === 'ARCHIVED') || [];
    const map = {};
    paid.forEach(o => {
        const d = new Date(o.created_at);
        const ds = d.toLocaleDateString('pt-BR');
        map[ds] = (map[ds] || 0) + o.total;
    });
    console.log('--- ALL PAID ORDERS IN DB ---');
    console.log(map);
    const total = paid.reduce((s, o) => s + o.total, 0);
    console.log('TOTAL:', total);
}
run();
