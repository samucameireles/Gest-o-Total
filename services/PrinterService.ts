import { Order, PrinterSettings, StoreSettings } from '../types';

export class PrinterService {
    /**
     * Limpa o texto para garantir compatibilidade com impressoras térmicas
     */
    private static cleanText(text: string): string {
        if (!text) return '';
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x20-\x7E\n]/g, ' ')
            .toUpperCase();
    }

    private static formatLine(left: string, right: string, width: number): string {
        const spaces = width - left.length - right.length;
        return left + ' '.repeat(Math.max(1, spaces)) + right;
    }

    /**
     * Gera o Buffer binário do recibo
     */
    static generateReceipt(order: Order, settings: PrinterSettings, storeSettings?: StoreSettings): Uint8Array {
        const width = settings.paper_size === '80mm' ? 42 : 32;
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
        const BOLD_ON = new Uint8Array([...ESC, 0x21, 0x08, ...ESC, 0x45, 0x01, ...ESC, 0x47, 0x01]);
        const BOLD_OFF = new Uint8Array([...ESC, 0x21, 0x00, ...ESC, 0x45, 0x00, ...ESC, 0x47, 0x00]);

        const DOUBLE_SIZE = new Uint8Array([...ESC, 0x21, 0x30]); // Double Height + Width
        const RESET_SIZE = new Uint8Array([...ESC, 0x21, 0x00]);

        const CUT = new Uint8Array([...GS, 0x56, 0x01]);
        const FEED_6 = new Uint8Array([...ESC, 0x64, 0x06]);

        const addText = (txt: string) => chunks.push(encoder.encode(this.cleanText(txt).replace(/\n/g, '\r\n')));
        const addRaw = (arr: Uint8Array) => chunks.push(arr);

        // --- Montagem do Recibo ---
        addRaw(RESET);

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

    static async sendToPrinter(order: Order, settings: PrinterSettings | null, storeSettings?: StoreSettings) {
        if (!settings) return;
        const isDelivery = order.type === 'DELIVERY';
        if (isDelivery && !settings.print_delivery_sales) return;
        if (!isDelivery && !settings.print_counter_sales) return;

        try {
            const receiptBytes = this.generateReceipt(order, settings, storeSettings);
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

    static async testConnection(settings: PrinterSettings) {
        const encoder = new TextEncoder();
        const ESC = [0x1B];
        const RESET = new Uint8Array([...ESC, 0x40]);
        const CUT = new Uint8Array([...ESC, 0x69]); // Comando básico ESC i

        const testText = '\r\n\r\n\r\n--- TESTE DO SISTEMA ---\r\nIMP. TESTE SUCESSO\r\n\r\n\r\n\r\n\r\n\r\n';
        const body = encoder.encode(testText);

        const combined = new Uint8Array(RESET.length + body.length + CUT.length);
        let offset = 0;
        [RESET, body, CUT].forEach(c => { combined.set(c, offset); offset += c.length; });

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
