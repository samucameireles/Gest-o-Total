import net from 'net';
import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const BRIDGE_PORT = 3005;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204); res.end(); return;
    }

    if (req.method === 'GET' && req.url === '/printers') {
        exec('powershell "Get-Printer | Select-Object Name | ConvertTo-Json"', (err, stdout) => {
            if (err) {
                res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(stdout);
        });
        return;
    }

    if (req.method === 'POST') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            let data = Buffer.concat(body);
            const printerName = req.headers['x-printer-name'];
            const encoding = req.headers['x-encoding'];

            console.log(`[HTTP] Recebido ${data.length} bytes. Encoding: ${encoding || 'RAW'}. Impressora: ${printerName || 'Emulador'}`);

            // Decodifica se for Base64 (garante integridade total)
            if (encoding === 'base64') {
                data = Buffer.from(data.toString('utf-8'), 'base64');
                console.log(`[DEBUG] Base64 decodificado: ${data.length} bytes reais.`);
            } else {
                // Tenta corrigir se o navegador mandou números em texto (27, 64...)
                const dataStr = data.toString('utf-8').trim();
                const isNumeric = /^[0-9, \n\r]+$/.test(dataStr);
                if (isNumeric && (dataStr.includes(',') || dataStr.split('\n').length > 5)) {
                    console.log('[DEBUG] Formato numérico detectado. Reconstruindo...');
                    const tokens = dataStr.includes(',') ? dataStr.split(',') : dataStr.split('\n');
                    data = Buffer.from(tokens.map(t => parseInt(t.trim())).filter(t => !isNaN(t)));
                }
            }

            // Simulação de Negrito para PDF/Texto (Out-Printer)
            // Se detectarmos os bytes de BOLD_ON (ESC ! 0x08 ou ESC E 1), 
            // vamos marcar o texto para o PDF.
            let pdfText = data.toString('utf-8');

            // Regex para capturar texto entre comandos de Negrito ESC/POS
            // 27 33 8 (BOLD_ON) e 27 33 0 (BOLD_OFF)
            const BOLD_ON_ESC = String.fromCharCode(27, 33, 8);
            const BOLD_OFF_ESC = String.fromCharCode(27, 33, 0);
            const BOLD_ON_ALT = String.fromCharCode(27, 69, 1);
            const BOLD_OFF_ALT = String.fromCharCode(27, 69, 0);

            // Substitui na string para o PDF
            let cleanPdfText = pdfText
                .split(BOLD_ON_ESC).join(' **')
                .split(BOLD_OFF_ESC).join('** ')
                .split(BOLD_ON_ALT).join(' **')
                .split(BOLD_OFF_ALT).join('** ')
                .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

            // 1. MODO EMULADOR (TCP)
            if (!printerName || printerName.trim() === '') {
                const targetIp = '127.0.0.1';
                const targetPort = 9100;
                console.log(`[TCP] Enviando para Emulador em ${targetIp}:${targetPort}...`);
                const client = new net.Socket();
                client.connect(targetPort, targetIp, () => {
                    client.write(data, () => {
                        setTimeout(() => { client.end(); res.writeHead(200); res.end('OK'); }, 200);
                    });
                });
                client.on('error', () => { res.writeHead(200); res.end('Erro'); });
                return;
            }

            // MODO LOCAL
            const isVirtual = /PDF|Writer|Document|OneNote|XPS/i.test(printerName);
            const tempFile = path.join(process.cwd(), `print_${Date.now()}.bin`);
            let psScript = '';

            if (isVirtual) {
                // PDF/Virtual: Usa a string processada com as marcações de negrito
                console.log(`[LOCAL TEXTO] Gerando saída legível para: ${printerName}`);
                fs.writeFileSync(tempFile, cleanPdfText, 'utf-8');
                psScript = `Get-Content '${tempFile}' -Encoding UTF8 | Out-Printer -Name '${printerName}'`;
            } else {
                // MODO RAW PARA IMPRESSORA TÉRMICA REAL
                console.log(`[LOCAL RAW] Enviando comandos térmicos para: ${printerName}`);
                fs.writeFileSync(tempFile, data);
                psScript = `
                    $bytes = [System.IO.File]::ReadAllBytes('${tempFile}');
                    $printerName = '${printerName}';
                    $type = Add-Type -Name 'RawPrinter' -PassThru -MemberDefinition @'
                        [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Auto)]
                        public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
                        [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Auto)]
                        public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA pDocInfo);
                        [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Auto)]
                        public static extern bool StartPagePrinter(IntPtr hPrinter);
                        [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Auto)]
                        public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
                        [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Auto)]
                        public static extern bool EndPagePrinter(IntPtr hPrinter);
                        [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Auto)]
                        public static extern bool EndDocPrinter(IntPtr hPrinter);
                        [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Auto)]
                        public static extern bool ClosePrinter(IntPtr hPrinter);
                        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
                        public struct DOCINFOA {
                            [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
                            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
                            [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
                        }
'@ | Out-Null
                    $hPrinter = [IntPtr]::Zero;
                    if ([RawPrinter]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)) {
                        $docInfo = New-Object RawPrinter+DOCINFOA;
                        $docInfo.pDocName = "Impressao PDV";
                        $docInfo.pDatatype = "RAW";
                        if ([RawPrinter]::StartDocPrinter($hPrinter, 1, [ref]$docInfo)) {
                            [void][RawPrinter]::StartPagePrinter($hPrinter);
                            $written = 0;
                            [void][RawPrinter]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written);
                            [void][RawPrinter]::EndPagePrinter($hPrinter);
                            [void][RawPrinter]::EndDocPrinter($hPrinter);
                        }
                        [void][RawPrinter]::ClosePrinter($hPrinter);
                    }
                `;
            }

            const psFile = `print_script_${Date.now()}.ps1`;
            fs.writeFileSync(psFile, psScript);

            exec(`powershell -ExecutionPolicy Bypass -File ${psFile}`, (err, stdout, stderr) => {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                if (fs.existsSync(psFile)) fs.unlinkSync(psFile);

                if (err) {
                    console.error(`[LOCAL ERROR] ${err.message}`);
                } else {
                    console.log(`[LOCAL] Concluído.`);
                }
                res.writeHead(200); res.end('OK');
            });
        });
    }
});

server.listen(BRIDGE_PORT, '0.0.0.0', () => {
    console.log('\n=========================================');
    console.log('      PONTE RAW PRO (SEM JANELAS)        ');
    console.log('=========================================');
    console.log(`Ponte ativa na porta ${BRIDGE_PORT}`);
    console.log('=========================================\n');
});
