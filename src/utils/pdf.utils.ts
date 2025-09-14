/**
 * PDF Generation Service for creating tickets and documents
 * @class PDFService
 * @description Handles PDF generation for tickets, invoices, and reports
 */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export interface TicketPDFData {
    ticketId: string;
    eventName: string;
    eventDate: Date;
    eventTime: string;
    venue: string;
    venueAddress: string;
    ticketType: string;
    seatNumber?: string;
    price: number;
    currency: string;
    userName: string;
    userEmail: string;
    orderNumber: string;
    qrCode: string;
    termsAndConditions?: string[];
    eventImage?: string;
    organizerName?: string;
}

export interface InvoicePDFData {
    invoiceNumber: string;
    orderNumber: string;
    issueDate: Date;
    dueDate?: Date;
    customerName: string;
    customerEmail: string;
    customerAddress?: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    subtotal: number;
    tax?: number;
    total: number;
    currency: string;
    notes?: string;
}

export interface PDFOptions {
    pageSize?: 'A4' | 'letter';
    margins?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    colors?: {
        primary: string;
        secondary: string;
        text: string;
        background: string;
    };
    fonts?: {
        regular: string;
        bold: string;
    };
}

class PDFService {
    private defaultOptions: PDFOptions = {
        pageSize: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        colors: {
            primary: '#2563eb',
            secondary: '#64748b',
            text: '#1e293b',
            background: '#ffffff'
        }
    };

    constructor(private options: PDFOptions = {}) {
        this.options = { ...this.defaultOptions, ...options };
    }

    /**
     * Generate a ticket PDF
     * @param ticketData - Ticket information
     * @returns Buffer containing the PDF
     */
    public async generateTicketPDF(ticketData: TicketPDFData): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: this.options.pageSize,
                    margins: this.options.margins
                });

                const chunks: Buffer[] = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                await this.createTicketLayout(doc, ticketData);
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate an invoice PDF
     * @param invoiceData - Invoice information
     * @returns Buffer containing the PDF
     */
    public async generateInvoicePDF(invoiceData: InvoicePDFData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: this.options.pageSize,
                    margins: this.options.margins
                });

                const chunks: Buffer[] = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                this.createInvoiceLayout(doc, invoiceData);
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Create ticket layout
     * @private
     */
    private async createTicketLayout(doc: any, data: TicketPDFData): Promise<void> {
        const { colors } = this.options;

        // Header with event name
        doc.fontSize(24)
            .fillColor(colors!.primary)
            .text(data.eventName, 50, 50, { align: 'center' });

        // Ticket ID and barcode section
        const qrBuffer = await QRCode.toBuffer(data.qrCode, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Draw ticket border
        doc.rect(40, 40, doc.page.width - 80, 300)
            .stroke(colors!.primary);

        // Event details section
        let y = 100;

        doc.fontSize(16)
            .fillColor(colors!.text)
            .text('EVENT DETAILS', 60, y, { underline: true });

        y += 30;
        doc.fontSize(12)
            .text(`Date: ${this.formatDate(data.eventDate)}`, 60, y)
            .text(`Time: ${data.eventTime}`, 300, y);

        y += 20;
        doc.text(`Venue: ${data.venue}`, 60, y);
        y += 15;
        doc.text(`Address: ${data.venueAddress}`, 60, y);

        // Ticket details section
        y += 40;
        doc.fontSize(16)
            .text('TICKET DETAILS', 60, y, { underline: true });

        y += 30;
        doc.fontSize(12)
            .text(`Ticket ID: ${data.ticketId}`, 60, y)
            .text(`Type: ${data.ticketType}`, 300, y);

        y += 20;
        if (data.seatNumber) {
            doc.text(`Seat: ${data.seatNumber}`, 60, y);
        }
        doc.text(`Price: ${data.currency} ${data.price.toFixed(2)}`, 300, y);

        // Holder details
        y += 40;
        doc.fontSize(16)
            .text('TICKET HOLDER', 60, y, { underline: true });

        y += 30;
        doc.fontSize(12)
            .text(`Name: ${data.userName}`, 60, y)
            .text(`Email: ${data.userEmail}`, 300, y);

        y += 20;
        doc.text(`Order: ${data.orderNumber}`, 60, y);

        // QR Code
        doc.image(qrBuffer, doc.page.width - 250, 120, { width: 150, height: 150 });

        // QR Code label
        doc.fontSize(10)
            .fillColor(colors!.secondary)
            .text('Scan for verification', doc.page.width - 250, 280, { width: 150, align: 'center' });

        // Terms and conditions
        if (data.termsAndConditions && data.termsAndConditions.length > 0) {
            y += 80;
            doc.fontSize(14)
                .fillColor(colors!.text)
                .text('TERMS & CONDITIONS', 60, y, { underline: true });

            y += 25;
            doc.fontSize(10)
                .fillColor(colors!.secondary);

            data.termsAndConditions.forEach((term, index) => {
                doc.text(`${index + 1}. ${term}`, 60, y, { width: doc.page.width - 120 });
                y += 15;
            });
        }

        // Footer
        doc.fontSize(8)
            .fillColor(colors!.secondary)
            .text('Please present this ticket at the venue entrance', 60, doc.page.height - 80, {
                align: 'center',
                width: doc.page.width - 120
            });

        // Organizer info
        if (data.organizerName) {
            doc.text(`Organized by: ${data.organizerName}`, 60, doc.page.height - 60, {
                align: 'center',
                width: doc.page.width - 120
            });
        }
    }

    /**
     * Create invoice layout
     * @private
     */
    private createInvoiceLayout(doc: any, data: InvoicePDFData): void {
        const { colors } = this.options;

        // Header
        doc.fontSize(28)
            .fillColor(colors!.primary)
            .text('INVOICE', 50, 50);

        // Invoice details
        let y = 100;
        doc.fontSize(12)
            .fillColor(colors!.text)
            .text(`Invoice #: ${data.invoiceNumber}`, 50, y)
            .text(`Order #: ${data.orderNumber}`, 50, y + 20)
            .text(`Date: ${this.formatDate(data.issueDate)}`, 50, y + 40);

        if (data.dueDate) {
            doc.text(`Due Date: ${this.formatDate(data.dueDate)}`, 50, y + 60);
            y += 20;
        }

        // Customer details
        y += 80;
        doc.fontSize(16)
            .text('BILL TO:', 50, y);

        y += 25;
        doc.fontSize(12)
            .text(data.customerName, 50, y)
            .text(data.customerEmail, 50, y + 15);

        if (data.customerAddress) {
            doc.text(data.customerAddress, 50, y + 30);
            y += 15;
        }

        // Items table
        y += 60;
        this.drawTable(doc, data.items, y);

        // Totals
        const totalsY = y + 40 + (data.items.length * 25);
        const rightAlign = doc.page.width - 200;

        doc.fontSize(12)
            .text(`Subtotal: ${data.currency} ${data.subtotal.toFixed(2)}`, rightAlign, totalsY, { align: 'right' });

        if (data.tax) {
            doc.text(`Tax: ${data.currency} ${data.tax.toFixed(2)}`, rightAlign, totalsY + 20, { align: 'right' });
        }

        doc.fontSize(16)
            .fillColor(colors!.primary)
            .text(`Total: ${data.currency} ${data.total.toFixed(2)}`, rightAlign, totalsY + 40, { align: 'right' });

        // Notes
        if (data.notes) {
            doc.fontSize(12)
                .fillColor(colors!.text)
                .text('Notes:', 50, totalsY + 80)
                .text(data.notes, 50, totalsY + 100, { width: 400 });
        }

        // Footer
        doc.fontSize(10)
            .fillColor(colors!.secondary)
            .text('Thank you for your business!', 50, doc.page.height - 50, {
                align: 'center',
                width: doc.page.width - 100
            });
    }

    /**
     * Draw a table for invoice items
     * @private
     */
    private drawTable(doc: any, items: InvoicePDFData['items'], y: number): void {
        const { colors } = this.options;
        const tableTop = y;
        const itemCodeX = 50;
        const descriptionX = 150;
        const quantityX = 350;
        const priceX = 400;
        const totalX = 480;

        // Table header
        doc.fontSize(12)
            .fillColor(colors!.primary);

        this.generateTableRow(
            doc,
            tableTop,
            'Item',
            'Description',
            'Qty',
            'Price',
            'Total'
        );

        // Table header line
        doc.strokeColor(colors!.primary)
            .lineWidth(1)
            .moveTo(50, tableTop + 20)
            .lineTo(550, tableTop + 20)
            .stroke();

        // Table rows
        doc.fillColor(colors!.text);
        let currentY = tableTop + 30;

        items.forEach((item, index) => {
            this.generateTableRow(
                doc,
                currentY,
                (index + 1).toString(),
                item.description,
                item.quantity.toString(),
                `${item.unitPrice.toFixed(2)}`,
                `${item.total.toFixed(2)}`
            );
            currentY += 25;
        });
    }

    /**
     * Generate a table row
     * @private
     */
    private generateTableRow(
        doc: any,
        y: number,
        item: string,
        description: string,
        quantity: string,
        price: string,
        total: string
    ): void {
        doc.fontSize(10)
            .text(item, 50, y)
            .text(description, 150, y, { width: 180 })
            .text(quantity, 350, y, { align: 'center' })
            .text(price, 400, y, { align: 'right' })
            .text(total, 480, y, { align: 'right' });
    }

    /**
     * Format date for display
     * @private
     */
    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }

    /**
     * Generate multiple tickets as a single PDF
     */
    public async generateBulkTicketsPDF(tickets: TicketPDFData[]): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: this.options.pageSize,
                    margins: this.options.margins
                });

                const chunks: Buffer[] = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                for (let i = 0; i < tickets.length; i++) {
                    if (i > 0) {
                        doc.addPage();
                    }
                    // @ts-ignore
                    if(tickets[i]) await this.createTicketLayout(doc, tickets[i]);
                }

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Save PDF to file system
     */
    public async savePDFToFile(pdfBuffer: Buffer, filePath: string): Promise<string> {
        try {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });

            // Write file
            await fs.writeFile(filePath, pdfBuffer);
            return filePath;
        } catch (error) {
            throw new Error(`Failed to save PDF: ${error}`);
        }
    }
}

export default PDFService;