import { Order, PrinterSettings, StoreSettings } from '../types';

export class PrinterService {
    /**
     * Limpa o texto para garantir compatibilidade com impressoras térmicas
     */
    private static cleanText(text: string, forceUppercase: boolean = true): string {
        if (!text) return '';
        let sanitized = text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x20-\x7E\n]/g, ' ');

        return forceUppercase ? sanitized.toUpperCase() : sanitized;
    }

    private static formatLine(left: string, right: string, width: number): string {
        const spaces = width - left.length - right.length;
        return left + ' '.repeat(Math.max(1, spaces)) + right;
    }

    /**
     * Gera o Buffer binário do recibo
     */
    static async generateReceipt(order: Order, settings: PrinterSettings, storeSettings?: StoreSettings): Promise<Uint8Array> {
        const isCompact = settings.font_type === 'COMPACT';
        const forceUpper = settings.force_uppercase !== false;

        // Font A: 42 (80mm) ou 32 (58mm)
        // Font B: 56 (80mm) ou 42 (58mm)
        let width = settings.paper_size === '80mm' ? 42 : 32;
        if (isCompact) {
            width = settings.paper_size === '80mm' ? 56 : 42;
        }

        const dividerString = '-'.repeat(width);

        const encoder = new TextEncoder();
        const chunks: Uint8Array[] = [];

        // Comandos ESC/POS
        // Comandos ESC/POS (Compatibilidade Máxima para Emuladores e Hardware)
        const ESC = [0x1B];
        const GS = [0x1D];
        const RESET = new Uint8Array([...ESC, 0x40]);
        const CENTER = new Uint8Array([...ESC, 0x61, 0x01]);
        const LEFT = new Uint8Array([...ESC, 0x61, 0x00]);

        // Muitos emuladores (como o ESC/POS Emulator) usam modos diferentes para negrito.
        // Vamos enviar os 3 comandos mais comuns juntos para garantir o negrito:
        // ESC ! 8 (Emphasized), ESC E 1 (Bold), ESC G 1 (Double Strike)
        // Usamos ESC E (Emphasized) e ESC G (Double-strike) em vez de ESC !
        // Isso evita que o comando de negrito resete a fonte (A/B) selecionada no início.
        const BOLD_ON = new Uint8Array([...ESC, 0x45, 0x01, ...ESC, 0x47, 0x01]);
        const BOLD_OFF = new Uint8Array([...ESC, 0x45, 0x00, ...ESC, 0x47, 0x00]);

        const DOUBLE_SIZE = new Uint8Array([...ESC, 0x21, 0x30]); // Double Height + Width (Master Select)
        const RESET_SIZE = new Uint8Array([...ESC, 0x21, isCompact ? 0x01 : 0x00]); // Restaura o tamanho e a fonte correta

        const FONT_A = new Uint8Array([...ESC, 0x4D, 0x00]);
        const FONT_B = new Uint8Array([...ESC, 0x4D, 0x01]);
        const LINE_SPACE_STD = new Uint8Array([...ESC, 0x32]); // 1/6-inch line spacing (padrão)

        const CUT = new Uint8Array([...GS, 0x56, 0x01]);
        const FEED_6 = new Uint8Array([...ESC, 0x64, 0x06]);

        const addText = (txt: string) => chunks.push(encoder.encode(this.cleanText(txt, forceUpper).replace(/\n/g, '\r\n')));
        const addRaw = (arr: Uint8Array) => chunks.push(arr);

        // --- Montagem do Recibo ---
        addRaw(RESET);
        addRaw(LINE_SPACE_STD);
        addRaw(isCompact ? FONT_B : FONT_A);

        // --- Logotipo ---
        if (settings.print_logo && storeSettings?.logoUrl) {
            try {
                const logoBytes = await this.rasterizeLogo(storeSettings.logoUrl, settings.paper_size === '80mm' ? 384 : 256);
                if (logoBytes) {
                    addRaw(CENTER);
                    addRaw(logoBytes);
                    addText('\n');
                }
            } catch (err) {
                console.error('Logo Error:', err);
            }
        }

        // --- Cabeçalho do Restaurante ---
        if (storeSettings) {
            addRaw(CENTER);
            addRaw(BOLD_ON);
            addText(`${storeSettings.name}\n`);
            addRaw(BOLD_OFF);
            if (storeSettings.address) {
                addText(`${storeSettings.address}\n`);
            }
            addText(dividerString + '\n');
        }

        addRaw(CENTER);
        addRaw(BOLD_ON);
        addRaw(DOUBLE_SIZE);
        addText('PEDIDO\n');
        addRaw(RESET_SIZE);
        addRaw(BOLD_OFF);
        addText(dividerString + '\n');

        const storeType = order.type === 'DELIVERY' ? 'DELIVERY' : 'BALCAO';
        addRaw(BOLD_ON);
        addText(`*** ${storeType} ***\n\n`);
        addRaw(BOLD_OFF);

        addRaw(LEFT);
        addText(`ID: #${order.displayId}\n`);
        addText(`DATA: ${new Date(order.createdAt).toLocaleString('pt-BR')}\n`);
        if (order.customerName) addText(`CLIENTE: ${order.customerName}\n`);
        if (order.tableName) addText(`MESA: ${order.tableName}\n`);
        addText(dividerString + '\n');

        addRaw(BOLD_ON);
        addText(this.formatLine('QTD/ITEM', 'TOTAL', width) + '\n');
        addRaw(BOLD_OFF);
        addText(dividerString + '\n');

        order.items.forEach(item => {
            addText(`${item.quantity}UN ${item.name}`);
            addRaw(BOLD_ON);
            const priceText = ` ${(item.price * item.quantity).toFixed(2)}`;
            const spaces = width - (`${item.quantity}UN ${item.name}`).length - priceText.length;
            addText(' '.repeat(Math.max(1, spaces)) + priceText + '\n');
            addRaw(BOLD_OFF);

            if (item.notes) addText(`   * ${item.notes}\n`);
            if (item.selectedAddOns && item.selectedAddOns.length > 0) {
                item.selectedAddOns.forEach(a => addText(`   + ${a.quantity}UN ${a.name}\n`));
            }
        });

        addText(dividerString + '\n');

        // Exibição de taxas e descontos
        if (order.deliveryFee > 0 || order.discount > 0) {
            const subtotal = order.total - (order.deliveryFee || 0) + (order.discount || 0);
            addText(this.formatLine('SUBTOTAL', `R$ ${subtotal.toFixed(2)}`, width) + '\n');

            if (order.deliveryFee > 0) {
                addText(this.formatLine('TAXA ENTREGA', `R$ ${order.deliveryFee.toFixed(2)}`, width) + '\n');
            }
            if (order.discount > 0) {
                addText(this.formatLine('DESCONTO', `- R$ ${order.discount.toFixed(2)}`, width) + '\n');
            }
            addText(dividerString + '\n');
        }

        addRaw(BOLD_ON);
        addText(this.formatLine('TOTAL', `R$ ${order.total.toFixed(2)}`, width) + '\n');
        addRaw(BOLD_OFF);

        if (order.type === 'DELIVERY' && order.deliveryDetails) {
            const d = order.deliveryDetails;
            addText(dividerString + '\n');
            addRaw(BOLD_ON); addText('ENTREGA:\n'); addRaw(BOLD_OFF);
            addText(`${d.street}, ${d.number}\n`);
            if (d.complement) {
                addText(`COMPL.: ${d.complement}\n`);
            }
            addText(`${d.neighborhood}\n`);
            addText(`TEL: ${d.phone}\n`);
        }

        addRaw(FEED_6);
        addRaw(CUT);

        let totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
        let merged = new Uint8Array(totalLength);
        let offset = 0;
        chunks.forEach(c => { merged.set(c, offset); offset += c.length; });
        return merged;
    }

    /**
     * Converte uma imagem URL para o formato GS v 0 (Raster bit image) do ESC/POS
     */
    private static async rasterizeLogo(url: string, maxWidth: number): Promise<Uint8Array | null> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);

                // Redimensiona mantendo proporção
                const ratio = img.height / img.width;
                canvas.width = maxWidth;
                canvas.height = Math.floor(maxWidth * ratio);

                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imgData.data;

                // ESC/POS GS v 0 requer largura em bytes (8 pixels por byte)
                const widthBytes = Math.ceil(canvas.width / 8);
                const heightPixels = canvas.height;
                const data = new Uint8Array(8 + (widthBytes * heightPixels));

                // Comando: GS v 0 m xL xH yL yH
                data.set([0x1D, 0x76, 0x30, 0x00, widthBytes % 256, Math.floor(widthBytes / 256), heightPixels % 256, Math.floor(heightPixels / 256)]);

                let offset = 8;
                for (let y = 0; y < heightPixels; y++) {
                    for (let xByte = 0; xByte < widthBytes; xByte++) {
                        let byte = 0;
                        for (let bit = 0; bit < 8; bit++) {
                            const x = (xByte * 8) + bit;
                            if (x < canvas.width) {
                                const pos = (y * canvas.width + x) * 4;
                                // Grayscale conversion + Threshold (128)
                                const gray = (pixels[pos] + pixels[pos + 1] + pixels[pos + 2]) / 3;
                                if (gray < 170) { // Menor que 170 = "Preto" (mais sensível pra logos coloridos)
                                    byte |= (1 << (7 - bit));
                                }
                            }
                        }
                        data[offset++] = byte;
                    }
                }
                resolve(data);
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    static async sendToPrinter(order: Order, settings: PrinterSettings | null, storeSettings?: StoreSettings) {
        if (!settings) return;
        const isDelivery = order.type === 'DELIVERY';
        if (isDelivery && !settings.print_delivery_sales) return;
        if (!isDelivery && !settings.print_counter_sales) return;

        try {
            const receiptBytes = await this.generateReceipt(order, settings, storeSettings);
            const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' };
            let bodyData: any = new Blob([receiptBytes.buffer] as any, { type: 'application/octet-stream' });

            if (settings.connection_type === 'LOCAL') {
                headers['x-printer-name'] = settings.local_printer_name || '';
                headers['x-encoding'] = 'base64';
                // Converte Uint8Array para Base64 string (mais estável para LOCAL)
                const binary = String.fromCharCode.apply(null, Array.from(receiptBytes));
                bodyData = btoa(binary);
                headers['Content-Type'] = 'text/plain';
            }

            await fetch(`http://${settings.ip_address}:${settings.port}`, {
                method: 'POST',
                mode: 'cors',
                headers,
                body: bodyData
            });
            return true;
        } catch (e) {
            console.error('Print Error:', e);
            throw e;
        }
    }

    static async testConnection(settings: PrinterSettings, storeSettings?: StoreSettings) {
        const encoder = new TextEncoder();
        const ESC = [0x1B];
        const CENTER = new Uint8Array([...ESC, 0x61, 0x01]);
        const RESET = new Uint8Array([...ESC, 0x40]);
        const CUT = new Uint8Array([...ESC, 0x69]);
        const FONT_A = new Uint8Array([...ESC, 0x4D, 0x00]);
        const FONT_B = new Uint8Array([...ESC, 0x4D, 0x01]);
        const LINE_SPACE_STD = new Uint8Array([...ESC, 0x32]);

        const isCompact = settings.font_type === 'COMPACT';
        const forceUpper = settings.force_uppercase !== false;

        const chunks: Uint8Array[] = [RESET, LINE_SPACE_STD];

        // --- Logotipo no Teste ---
        if (settings.print_logo && storeSettings?.logoUrl) {
            try {
                const logoBytes = await this.rasterizeLogo(storeSettings.logoUrl, settings.paper_size === '80mm' ? 384 : 256);
                if (logoBytes) {
                    chunks.push(CENTER);
                    chunks.push(logoBytes);
                    chunks.push(encoder.encode('\r\n'));
                }
            } catch (err) {
                console.error('Test Logo Error:', err);
            }
        }

        const testText = '\r\n--- TESTE DE IMPRESSAO ---\r\nFONTE: ' +
            (isCompact ? 'COMPACTA (B)' : 'PADRAO (A)') +
            '\r\nCAIXA ALTA: ' + (forceUpper ? 'SIM' : 'NAO') +
            '\r\nLOGOTIPO: ' + (settings.print_logo ? 'SIM' : 'NAO') +
            '\r\n\r\nAbcdefghijklmnopqrstuvwxyz\r\n0123456789\r\n\r\n\r\n\r\n\r\n';

        const body = encoder.encode(this.cleanText(testText, forceUpper).replace(/\n/g, '\r\n'));
        const fontCmd = isCompact ? FONT_B : FONT_A;

        chunks.push(fontCmd);
        chunks.push(body);
        chunks.push(CUT);

        const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        chunks.forEach(c => { combined.set(c, offset); offset += c.length; });

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' };
            let bodyData: any = new Blob([combined.buffer] as any, { type: 'application/octet-stream' });

            if (settings.connection_type === 'LOCAL') {
                headers['x-printer-name'] = settings.local_printer_name || '';
                headers['x-encoding'] = 'base64';
                const binary = String.fromCharCode.apply(null, Array.from(combined));
                bodyData = btoa(binary);
                headers['Content-Type'] = 'text/plain';
            }

            await fetch(`http://${settings.ip_address}:${settings.port}`, {
                method: 'POST',
                mode: 'cors',
                headers,
                body: bodyData
            });
            return true;
        } catch (e) {
            console.error('Test Connection Error:', e);
            throw e;
        }
    }
}
