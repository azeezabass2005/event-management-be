/**
 * Robust Mail Service for sending various types of emails
 * @class MailService
 * @description Handles email operations with template support, attachments, and error handling
 */
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
    path?: string;
    cid?: string; // Content ID for inline images
}

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    templateData?: Record<string, any>;
    attachments?: EmailAttachment[];
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    priority?: 'high' | 'normal' | 'low';
}

export interface MailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    templatesPath?: string;
}

class MailService {
    private transporter: Mail;
    private config: MailConfig;
    private templatesCache: Map<string, HandlebarsTemplateDelegate> = new Map();

    constructor(config: MailConfig) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
        });

        // Register Handlebars helpers
        this.registerHandlebarsHelpers();
    }

    /**
     * Register custom Handlebars helpers
     * @private
     */
    private registerHandlebarsHelpers(): void {
        handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
            const d = new Date(date);
            if (format === 'short') {
                return d.toLocaleDateString();
            }
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        });

        handlebars.registerHelper('formatCurrency', (amount: number, currency: any = 'NGN') => {
            console.log(">>> formatCurrency got:", JSON.stringify(currency));
            const code = typeof currency === 'object' ? currency.code : currency;
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: code || 'NGN'
            }).format(amount);
        });


        handlebars.registerHelper('eq', (a: any, b: any) => a === b);
        handlebars.registerHelper('gt', (a: number, b: number) => a > b);
        handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    }

    /**
     * Load and compile email template
     * @param templateName - Name of the template file (without extension)
     * @returns Compiled handlebars template
     * @private
     */
    private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
        // Check cache first
        if (this.templatesCache.has(templateName)) {
            return this.templatesCache.get(templateName)!;
        }

        try {
            const templatePath = path.join(
                this.config.templatesPath || './src/templates/emails',
                `${templateName}.hbs`
            );

            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const compiledTemplate = handlebars.compile(templateContent);

            // Cache the compiled template
            this.templatesCache.set(templateName, compiledTemplate);

            return compiledTemplate;
        } catch (error) {
            throw new Error(`Failed to load email template '${templateName}': ${error}`);
        }
    }

    /**
     * Send email with various options
     * @param options - Email configuration options
     * @returns Promise<boolean> - Success status
     */
    public async sendMail(options: EmailOptions): Promise<boolean> {
        try {
            let htmlContent = options.html;

            // If template is specified, compile it with data
            if (options.template) {
                const template = await this.loadTemplate(options.template);
                htmlContent = template(options.templateData || {});
            }

            const mailOptions: Mail.Options = {
                from: this.config.from,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                html: htmlContent,
                text: options.text,
                attachments: options.attachments,
                cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc,
                bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc,
                replyTo: options.replyTo,
                priority: options.priority || 'normal',
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('Failed to send email:', error);
            throw new Error(`Failed to send email: ${error}`);
        }
    }

    /**
     * Send ticket confirmation email with QR code attachment
     * @param userEmail - Recipient email
     * @param ticketData - Ticket information
     * @param qrCodeBuffer - QR code as buffer
     */
    public async sendTicketEmail(
        userEmail: string,
        ticketData: {
            ticketId: string;
            eventName: string;
            eventDate: Date;
            venue: string;
            ticketType: string;
            seatNumber?: string;
            price: number;
            userName: string;
        },
        qrCodeBuffer: Buffer
    ): Promise<boolean> {
        return this.sendMail({
            to: userEmail,
            subject: `Your Ticket for ${ticketData.eventName}`,
            template: 'ticket-confirmation',
            templateData: ticketData,
            attachments: [
                {
                    filename: `ticket-${ticketData.ticketId}.png`,
                    content: qrCodeBuffer,
                    contentType: 'image/png',
                    cid: 'qrcode'
                }
            ]
        });
    }

    /**
     * Send welcome email to new users
     */
    public async sendWelcomeEmail(
        userEmail: string,
        userData: { name: string; verificationLink?: string }
    ): Promise<boolean> {
        return this.sendMail({
            to: userEmail,
            subject: 'Welcome to Our Event Platform!',
            template: 'welcome',
            templateData: userData
        });
    }

    /**
     * Send order confirmation email
     */
    public async sendOrderConfirmationEmail(
        userEmail: string,
        orderData: {
            orderNumber: string;
            eventName: string;
            ticketCount: number;
            totalAmount: number;
            userName: string;
        }
    ): Promise<boolean> {
        return this.sendMail({
            to: userEmail,
            subject: `Order Confirmation - ${orderData.orderNumber}`,
            template: 'order-confirmation',
            templateData: orderData
        });
    }

    /**
     * Send password reset email
     */
    public async sendPasswordResetEmail(
        userEmail: string,
        resetData: { name: string; resetLink: string; expiresIn: string }
    ): Promise<boolean> {
        return this.sendMail({
            to: userEmail,
            subject: 'Password Reset Request',
            template: 'password-reset',
            templateData: resetData
        });
    }

    /**
     * Send event reminder email
     */
    public async sendEventReminderEmail(
        userEmail: string,
        eventData: {
            eventName: string;
            eventDate: Date;
            venue: string;
            userName: string;
            ticketCount: number;
        }
    ): Promise<boolean> {
        return this.sendMail({
            to: userEmail,
            subject: `Reminder: ${eventData.eventName} is Tomorrow!`,
            template: 'event-reminder',
            templateData: eventData
        });
    }

    /**
     * Send admin notification email
     */
    public async sendAdminNotification(
        subject: string,
        data: Record<string, any>,
        template?: string
    ): Promise<boolean> {
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

        if (adminEmails.length === 0) {
            console.warn('No admin emails configured');
            return false;
        }

        return this.sendMail({
            to: adminEmails,
            subject: `[ADMIN] ${subject}`,
            template: template || 'admin-notification',
            templateData: data,
            priority: 'high'
        });
    }

    /**
     * Send bulk emails (with rate limiting)
     */
    public async sendBulkEmails(
        emails: EmailOptions[],
        options: { batchSize?: number; delay?: number } = {}
    ): Promise<{ sent: number; failed: number; errors: any[] }> {
        const batchSize = options.batchSize || 10;
        const delay = options.delay || 1000; // 1 second between batches

        let sent = 0;
        let failed = 0;
        const errors: any[] = [];

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);

            const promises = batch.map(async (email) => {
                try {
                    await this.sendMail(email);
                    sent++;
                } catch (error) {
                    failed++;
                    errors.push({ email: email.to, error });
                }
            });

            await Promise.allSettled(promises);

            // Add delay between batches to avoid rate limiting
            if (i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return { sent, failed, errors };
    }

    /**
     * Verify email configuration
     */
    public async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            console.log('Mail server connection verified successfully');
            return true;
        } catch (error) {
            console.error('Mail server connection failed:', error);
            return false;
        }
    }

    /**
     * Clear template cache
     */
    public clearTemplateCache(): void {
        this.templatesCache.clear();
    }

    /**
     * Get mail service statistics
     */
    public getStats(): {
        cachedTemplates: number;
        transporterOptions: any;
    } {
        return {
            cachedTemplates: this.templatesCache.size,
            transporterOptions: this.transporter.options
        };
    }
}

export default MailService;