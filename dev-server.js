import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Iniciando Sistema Gestão Total + Ponte de Impressão...');

// 1. Iniciar a Ponte de Impressão
const bridge = spawn('node', ['print-bridge.js'], {
    stdio: 'inherit',
    shell: true
});

// 2. Iniciar o Vite (Frontend)
const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
});

process.on('SIGINT', () => {
    bridge.kill();
    vite.kill();
    process.exit();
});
