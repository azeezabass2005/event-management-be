import BaseController from "../base-controller";
import TicketService from "../../../services/ticket.service";
import {Request, Response, NextFunction} from "express";
import PaymentService from "../../../services/payment.service";
import errorResponseMessage from "../../../common/messages/error-response-message";
import TransactionService from "../../../services/transaction.service";
import OrderService from "../../../services/order.service";
import EventService from "../../../services/event.service";
import MailService from "../../../utils/mail.utils";
import {ORDER_STATUS, TRANSACTION_STATUS} from "../../../common/constant";
import config from "../../../config/env.config";
import {IEvent, IUser, TicketType} from "../../../models/interface";

class WebhookController extends BaseController {
    private ticketService: TicketService;
    private paymentService: PaymentService;
    private transactionService: TransactionService;
    private orderService: OrderService;
    private eventService: EventService;
    // private userService: UserService;
    private mailService: MailService;

    constructor () {
        super();
        this.ticketService = new TicketService();
        this.paymentService = new PaymentService();
        this.transactionService = new TransactionService();
        this.orderService = new OrderService(['user', 'event']);
        this.eventService = new EventService();
        // this.userService = new UserService();

        // Initialize mail service for admin notifications
        this.mailService = new MailService({
            host: config.MAIL_HOST!,
            port: parseInt(config.MAIL_PORT!),
            secure: config.MAIL_SECURE === 'true',
            auth: {
                user: config.MAIL_USERNAME!,
                pass: config.MAIL_PASSWORD!,
            },
            from: config.MAIL_FROM!,
            templatesPath: config.EMAIL_TEMPLATES_PATH
        });

        this.setupRoutes();
    }

    protected setupRoutes(): void {
        this.router.post("/", this.orderTransactionCompleted.bind(this));
        this.router.post("/verify-payment", this.verifyPaymentStatus.bind(this));
    }

    /**
     * Webhook that listens for a successful order payment and generates tickets
     * @private
     */
    private async orderTransactionCompleted(req: Request, res: Response, next: NextFunction) {
        try {
            const flutterwaveSignature = req.headers['flutterwave-signature'];
            const isValid = this.paymentService.isValidWebhook(req.rawBody, flutterwaveSignature);

            if(!isValid) {
                console.error('Invalid webhook signature:', flutterwaveSignature);
                return next(errorResponseMessage.unauthorized('Invalid signature'));
            }

            const webhookData = req.body.data;
            console.log('Flutterwave webhook received:', JSON.stringify(webhookData, null, 2));

            // Handle successful payment
            if(webhookData.status === 'successful' || webhookData.status === 'succeeded') {
                await this.handleSuccessfulPayment(webhookData);
            }
            // Handle failed payment
            else if(webhookData.status === 'failed' || webhookData.status === 'cancelled') {
                await this.handleFailedPayment(webhookData);
            }
            // Handle pending or other statuses
            else {
                console.log(`Payment status '${webhookData.status}' - no action taken`);
            }

            return res.sendStatus(200);

        } catch (error) {
            console.error('Webhook processing error:', error);

            // Send error notification to admin
            try {
                await this.mailService.sendAdminNotification(
                    'Webhook Processing Error',
                    {
                        error: (error as any)?.message || "An error occurred",
                        webhookData: req.body,
                        timestamp: new Date().toISOString()
                    },
                    'webhook-error'
                );
            } catch (emailError) {
                console.error('Failed to send admin notification:', emailError);
            }

            return next(error);
        }
    }

    /**
     * Handle successful payment processing
     * @private
     */
    private async handleSuccessfulPayment(webhookData: any) {
        try {
            const reference = webhookData.tx_ref || webhookData.reference;
            const transactionId = webhookData.id;
            const amount = webhookData.amount;
            const currency = webhookData.currency;

            // Find the order
            const order = await this.orderService.findById(reference);

            if(!order) {
                console.error(`Order not found for reference: ${reference}`);

                // Send email to admin about missing order
                await this.mailService.sendAdminNotification(
                    'Payment Received for Unknown Order',
                    {
                        reference,
                        transactionId,
                        amount,
                        currency,
                        // customerEmail: 'lynnett3x@gmail.com',
                        customerEmail: webhookData.customer?.email,
                        timestamp: new Date().toISOString()
                    },
                    'missing-order-alert'
                );

                return;
            }

            // Check if order was already processed
            if(order.status === ORDER_STATUS.COMPLETED) {
                console.log(`Order ${order._id} already processed`);
                return;
            }

            // Verify payment amount matches order total
            if(Math.abs(parseFloat(amount) - order.totalPrice) > 0.01) {
                console.error(`Payment amount mismatch. Expected: ${order.totalPrice}, Received: ${amount}`);

                await this.mailService.sendAdminNotification(
                    'Payment Amount Mismatch',
                    {
                        orderId: order._id,
                        expectedAmount: order.totalPrice,
                        receivedAmount: amount,
                        reference,
                        customerEmail: (order.user as IUser).email
                    },
                    'payment-mismatch-alert'
                );

                return;
            }

            // Update order status
            await this.orderService.updateById(order._id! as string, {
                status: ORDER_STATUS.COMPLETED,
                paymentReference: transactionId,
                paidAt: new Date(),
                paymentMethod: 'flutterwave'
            });

            // Update transaction status
            await this.transactionService.update(
                {
                    reference
                },
                {
                    status: TRANSACTION_STATUS.SUCCESSFUL,
                    reference: transactionId,
                    completedAt: new Date(),
                    metaData: webhookData
                }
            );

            // Create tickets for each ticket type in the order
            const ticketsCreated = [];

            if(order.ticketType) {
                const tickets = await this.ticketService.createTicketAndSendMail(
                    (order.user as IUser)._id as string,
                    (order.event as IEvent)._id as string,
                    order._id! as string,
                    (order.ticketType as TicketType),
                    (order.ticketType as TicketType).price,
                    new Date(),
                    order.numberOfTicket
                );

                ticketsCreated.push(...tickets);
            } else {
                const tickets = await this.ticketService.createTicketAndSendMail(
                    (order.user as IUser)._id as string,
                    (order.event as IEvent)._id as string,
                    order._id! as string,
                    null,
                    (order.event as IEvent).price || 0,
                    new Date(),
                    order.numberOfTicket
                );

                ticketsCreated.push(...tickets);
            }

            // Update event creator's available balance
            await this.updateEventCreatorBalance(order, amount);

            // Send order confirmation email
            await this.sendOrderConfirmationEmail(order, ticketsCreated);

            // Log successful processing
            console.log(`Successfully processed payment for order ${order._id}. Created ${ticketsCreated.length} tickets.`);

            // Send success notification to admin
            await this.mailService.sendAdminNotification(
                'Payment Successfully Processed',
                {
                    orderId: order._id,
                    amount,
                    currency,
                    ticketsCreated: ticketsCreated.length,
                    customerEmail: (order.user as IUser)?.email,
                    eventName: (order.event as IEvent)?.title,
                    timestamp: new Date().toISOString()
                },
                'payment-success-notification'
            );

        } catch (error) {
            console.error('Error processing successful payment:', error);
            throw error;
        }
    }

    /**
     * Handle failed payment processing
     * @private
     */
    private async handleFailedPayment(webhookData: any) {
        try {
            const reference = webhookData.tx_ref || webhookData.reference;
            const failureReason = webhookData.processor_response || webhookData.gateway_response || 'Payment failed';

            // Find the order
            const order = await this.orderService.findById(reference, { populate: ['user'] });

            if(order) {
                // Update order status
                await this.orderService.updateById(order._id! as string, {
                    status: ORDER_STATUS.FAILED,
                    failureReason,
                    failedAt: new Date()
                });

                // Update transaction status
                await this.transactionService.update(
                    {
                        reference
                    },
                    {
                        status: TRANSACTION_STATUS.FAILED,
                        failureReason,
                        failedAt: new Date(),
                        metaData: webhookData
                    }
                );

                // Send payment failure notification to user
                await this.mailService.sendMail({
                    to: (order.user as IUser).email,
                    subject: 'Payment Failed - Order Not Processed',
                    template: 'payment-failed',
                    templateData: {
                        userName: `${(order.user as IUser).firstName} ${(order.user as IUser).lastName}`,
                        orderNumber: (order._id as string)?.slice(0, 8),
                        amount: order.totalPrice,
                        failureReason,
                        retryLink: `${config.FRONTEND_URL}/checkout/${order._id}`
                    }
                });
            }

            console.log(`Payment failed for reference: ${reference}. Reason: ${failureReason}`);

        } catch (error) {
            console.error('Error processing failed payment:', error);
            throw error;
        }
    }

    /**
     * Update event creator's available balance
     * @private
     */
    private async updateEventCreatorBalance(order: any, amount: number) {
        try {
            const event = order.event;
            const platformFeePercentage = parseFloat(config.PLATFORM_FEE_PERCENTAGE || '2') / 100;
            const platformFee = amount * platformFeePercentage;
            const creatorEarnings = amount - platformFee;

            // Update event creator's balance
            await this.userService.updateById(event.user, {
                $inc: {
                    availableBalance: creatorEarnings,
                    totalEarnings: creatorEarnings
                }
            });

            // Log the transaction for the creator
            // You might want to create a separate earnings/transaction log here

            console.log(`Updated creator balance: +${creatorEarnings} (Platform fee: ${platformFee})`);

        } catch (error) {
            this.logger.error('Error updating event creator balance:', error);
            // Don't throw error here as ticket creation should still proceed
        }
    }

    /**
     * Send order confirmation email
     * @private
     */
    private async sendOrderConfirmationEmail(order: any, tickets: any[]) {
        try {
            await this.mailService.sendOrderConfirmationEmail(
                (order.user as IUser).email,
                {
                    orderNumber: order.orderNumber || order._id,
                    eventName: (order.event as IEvent).title,
                    ticketCount: tickets.length,
                    totalAmount: order.totalPrice,
                    userName: `${(order.user as IUser).firstName} ${(order.user as IUser).lastName}`
                }
            );

        } catch (error) {
            console.error('Error sending order confirmation email:', error);
            // It's not a critical error, so I'm not throwing it
        }
    }

    /**
     * Manually verify payment status with Flutterwave
     * @private
     */
    private async verifyPaymentStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { transactionId, reference } = req.body;

            if (!transactionId && !reference) {
                return next(errorResponseMessage.badRequest('Transaction ID or reference is required'));
            }

            const verificationResult = await this.paymentService.verifyTransaction(transactionId || reference);

            if (verificationResult.status === 'success') {
                await this.handleSuccessfulPayment(verificationResult.data);

                return this.sendSuccess(res, {
                    message: 'Payment verified and processed successfully',
                    transaction: verificationResult.data
                });
            } else {
                return this.sendSuccess(res, {
                    message: 'Payment verification completed',
                    status: verificationResult.status,
                    transaction: verificationResult.data
                });
            }

        } catch (error) {
            console.error('Manual payment verification error:', error);
            return next(error);
        }
    }

    /**
     * Background job to check pending orders and update their status
     * This can be called by a cron job or scheduler
     * @public
     */
    public async checkPendingOrders() {
        try {
            const pendingOrders = await this.orderService.find({
                status: ORDER_STATUS.PENDING,
                createdAt: {
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                    $lte: new Date(Date.now() - 10 * 60 * 1000) // Older than 10 minutes
                }
            }, { populate: ['user'] });

            console.log(`Found ${pendingOrders.length} pending orders to check`);

            for (const order of pendingOrders) {
                try {
                    // Verify payment status with Flutterwave
                    const verificationResult = await this.paymentService.verifyTransaction(
                        order._id as string
                        // order.reference || order.orderNumber
                    );

                    if (verificationResult.status === 'successful') {
                        await this.handleSuccessfulPayment(verificationResult.data);
                        console.log(`Updated pending order ${order._id} to successful`);
                    } else if (verificationResult.status === 'failed' || verificationResult.status === 'cancelled') {
                        await this.handleFailedPayment(verificationResult.data);
                        console.log(`Updated pending order ${order._id} to failed`);
                    }

                } catch (orderError) {
                    console.error(`Error checking order ${order._id}:`, orderError);
                }
            }

        } catch (error) {
            console.error('Error in checkPendingOrders:', error);
        }
    }

    /**
     * Health check endpoint for webhook
     * @private
     */
    private async webhookHealthCheck(req: Request, res: Response) {
        return this.sendSuccess(res, {
            message: 'Webhook endpoint is healthy',
            timestamp: new Date().toISOString(),
            services: {
                ticket: !!this.ticketService,
                payment: !!this.paymentService,
                transaction: !!this.transactionService,
                order: !!this.orderService,
                mail: !!this.mailService
            }
        });
    }
}

export default new WebhookController().router;