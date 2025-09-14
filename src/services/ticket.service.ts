/**
 * Service class for Ticket-related operations
 *
 * @description Extends the generic DBService with Ticket-specific operations
 * @extends {DBService<ITicket>}
 */
import DBService from "../utils/db.utils";
import { ITicket, TicketType } from "../models/interface";
import Ticket from "../models/ticket.model";
import Event from "../models/event.model";
import User from "../models/user.model";
import QRCode from "qrcode";
import errorResponseMessage from "../common/messages/error-response-message";
import MailService from "../utils/mail.utils";
import PDFService, { TicketPDFData } from "../utils/pdf.utils";
import { Types } from "mongoose";
import config from "../config/env.config";

class TicketService extends DBService<ITicket> {
    private mailService: MailService;
    private pdfService: PDFService;

    /**
     * Creates an instance of TicketService
     * @constructor
     * @param populatedField
     * @example
     * new TicketService(['user', 'event'])
     */
    constructor(populatedField: string[] = []) {
        super(Ticket, [...populatedField, 'event', 'user']);

        // Initialize mail service
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

        // Initialize PDF service
        this.pdfService = new PDFService();
    }

    /**
     * To create ticket and send mail to the user
     * @param user - User ID
     * @param event - Event ID
     * @param order - Order ID
     * @param ticketType - Type of ticket
     * @param price - Price of ticket
     * @param purchaseDate - Date of purchase
     * @param count - Number of tickets
     */
    public async createTicketAndSendMail(
        user: string,
        event: string,
        order: string,
        ticketType: TicketType | null,
        price: number,
        purchaseDate: Date,
        count: number
    ): Promise<ITicket[]> {
        try {
            // Get event and user details for email
            const eventDetails = await Event.findById(event).lean();
            const userDetails = await User.findById(user).lean();

            if (!eventDetails) {
                throw errorResponseMessage.resourceNotFound("Event not found");
            }

            if (!userDetails) {
                throw errorResponseMessage.resourceNotFound("User not found");
            }

            const createdTickets: ITicket[] = [];
            const ticketPDFs: Buffer[] = [];

            for (let i = 0; i < count; i++) {
                const uniqueIdentifier = `${order}-${i + 1}`;

                // Generate QR code as data URL
                const qrCodeDataURL = await QRCode.toDataURL(uniqueIdentifier);

                // Create ticket
                const ticket = await Ticket.create({
                    user,
                    event,
                    order,
                    ...(ticketType ? {ticketType} : {}),
                    price,
                    purchaseDate,
                    // seatNumber: `S-${i + 1}`,
                    qrCode: qrCodeDataURL,
                    isUsed: false
                });

                createdTickets.push(ticket);

                // Prepare PDF data
                const ticketPDFData: TicketPDFData = {
                    ticketId: ticket._id!.toString(),
                    eventName: eventDetails.title,
                    eventDate: new Date(eventDetails.date!),
                    eventTime: eventDetails.time || '12:00 PM',
                    venue: eventDetails?.venue || 'TBA',
                    venueAddress: eventDetails?.venue || 'TBA',
                    ticketType: ticketType?.name || "General",
                    seatNumber: `S-${i + 1}`,
                    price: price,
                    currency: 'NGN',
                    userName: userDetails.firstName + ' ' + userDetails.lastName,
                    userEmail: userDetails.email,
                    orderNumber: order,
                    qrCode: uniqueIdentifier,
                    termsAndConditions: [
                        'This ticket is non-transferable and non-refundable',
                        'Present this ticket and valid ID at the venue entrance',
                        'Ticket holder agrees to comply with venue rules and regulations',
                        'Event organizers reserve the right to refuse entry',
                        'No re-entry allowed once you leave the venue'
                    ],
                    // TODO: I will add an organiser field here later
                    organizerName: 'Event Platform'
                };

                // Generate PDF for this ticket
                const ticketPDF = await this.pdfService.generateTicketPDF(ticketPDFData);
                ticketPDFs.push(ticketPDF);
            }

            // Generate QR code buffer for email
            const qrCodeBuffer = await QRCode.toBuffer(createdTickets[0]!.qrCode!);

            // Send email with all tickets
            createdTickets[0] && await this.mailService.sendTicketEmail(
                userDetails.email,
                {
                    ticketId: createdTickets[0]._id!.toString(),
                    eventName: eventDetails.title,
                    eventDate: new Date(eventDetails.date!),
                    venue: eventDetails.venue || 'TBA',
                    ticketType: ticketType?.name || "General",
                    seatNumber: createdTickets[0].seatNumber || "N/A",
                    price: price,
                    userName: userDetails.firstName + ' ' + userDetails.lastName
                },
                qrCodeBuffer
            );

            if (count > 1) {
                const bulkPDF = await this.pdfService.generateBulkTicketsPDF(
                    createdTickets.map((ticket, index) => ({
                        ticketId: ticket._id!.toString(),
                        eventName: eventDetails.title,
                        eventDate: new Date(eventDetails.date!),
                        eventTime: eventDetails.time || '12:00 PM',
                        venue: eventDetails?.venue || 'TBA',
                        // TODO: venue is different from address I will handle this later
                        venueAddress: eventDetails.venue || 'TBA',
                        ticketType: ticketType?.name || "General",
                        seatNumber: `S-${index + 1}`,
                        price: price,
                        currency: 'NGN',
                        userName: userDetails.firstName + ' ' + userDetails.lastName,
                        userEmail: userDetails.email,
                        orderNumber: order,
                        qrCode: `${order}-${index + 1}`,
                        organizerName: 'Event Platform'
                    }))
                );

                await this.mailService.sendMail({
                    to: userDetails.email,
                    subject: `All Tickets for ${eventDetails.title}`,
                    template: 'bulk-tickets',
                    templateData: {
                        userName: userDetails.firstName + ' ' + userDetails.lastName,
                        eventName: eventDetails.title,
                        ticketCount: count
                    },
                    attachments: [{
                        filename: `tickets-${order}.pdf`,
                        content: bulkPDF,
                        contentType: 'application/pdf'
                    }]
                });
            }

            return createdTickets;

        } catch (error) {
            console.error('Error creating tickets:', error);
            throw error;
        }
    }

    /**
     * Verifies the ticket and marks it as used
     * @param ticketCode - The QR code or unique identifier
     */
    public async verifyTicket(ticketCode: string) {
        try {
            // Find ticket by QR code content (the unique identifier)
            const ticket = await Ticket.findOne({
                $or: [
                    { qrCode: { $regex: ticketCode } },
                    { _id: ticketCode }
                ]
            }).populate(['user', 'event']);

            if (!ticket) {
                throw errorResponseMessage.resourceNotFound("Invalid Ticket: Ticket not found");
            }

            if (ticket.isUsed) {
                throw errorResponseMessage.resourceUsed("Ticket already used");
            }

            // Check if event has passed
            const event = ticket.event as any;
            const eventDate = new Date(event.date);
            const now = new Date();

            // TODO: there is controversy about this cos event might last more than a day or some events are even at night and will span through midnight
            // if (eventDate < now) {
            //     throw errorResponseMessage.resourceExpired("This ticket is expired because event has taken place");
            // }

            // Mark ticket as used
            ticket.isUsed = true;
            await ticket.save();

            return {
                message: "Ticket verified successfully",
                ticket: ticket.toObject(),
                event: {
                    name: event.title,
                    date: event.date,
                    venue: event?.venue
                },
                holder: {
                    name: `${(ticket.user as any).firstName} ${(ticket.user as any).lastName}`,
                    email: (ticket.user as any).email
                }
            };

        } catch (error) {
            console.error('Error verifying ticket:', error);
            throw error;
        }
    }

    /**
     * Get a single ticket by ID
     * @param ticketId - Ticket ID
     * @param userId - User ID (for authorization)
     */
    public async getTicketById(ticketId: string, userId?: string) {
        try {
            const query: any = { _id: ticketId };

            // If userId provided, ensure user owns the ticket
            if (userId) {
                query.user = userId;
            }

            const ticket = await Ticket.findOne(query)
                .populate('user', 'firstName lastName email')
                .populate('event', 'title eventDate location organizer')
                .populate('order', 'orderNumber status totalAmount');

            if (!ticket) {
                throw errorResponseMessage.resourceNotFound("Ticket not found");
            }

            return ticket;

        } catch (error) {
            console.error('Error getting ticket:', error);
            throw error;
        }
    }

    /**
     * Get all tickets by user
     * @param userId - User ID
     * @param options - Pagination and filter options
     */
    public async getTicketsByUser(
        userId: string,
        options: {
            page?: number;
            limit?: number;
            status?: 'used' | 'unused' | 'all';
            eventId?: string;
            searchTerm?: string;
        } = {}
    ) {
        try {
            const query: any = { user: userId };

            // Filter by usage status
            if (options.status === 'used') {
                query.isUsed = true;
            } else if (options.status === 'unused') {
                query.isUsed = false;
            }

            // Filter by event
            if (options.eventId) {
                query.event = options.eventId;
            }

            // Search functionality
            if (options.searchTerm) {
                return await this.searchTickets(options.searchTerm, query, {
                    page: options.page || 1,
                    limit: options.limit || 10,
                    populate: ['user', 'event', 'order']
                });
            }

            // Regular pagination
            return await this.paginate(query, {
                page: options.page || 1,
                limit: options.limit || 10,
                populate: ['user', 'event', 'order'],
                sort: { createdAt: -1 }
            });

        } catch (error) {
            console.error('Error getting user tickets:', error);
            throw error;
        }
    }

    /**
     * Get all tickets by event
     * @param eventId - Event ID
     * @param options - Pagination and filter options
     */
    public async getTicketsByEvent(
        eventId: string,
        options: {
            page?: number;
            limit?: number;
            status?: 'used' | 'unused' | 'all';
            userId?: string;
            searchTerm?: string;
        } = {}
    ) {
        try {
            const query: any = { event: eventId };

            // Filter by usage status
            if (options.status === 'used') {
                query.isUsed = true;
            } else if (options.status === 'unused') {
                query.isUsed = false;
            }

            // Filter by specific user
            if (options.userId) {
                query.user = options.userId;
            }

            // Search functionality
            if (options.searchTerm) {
                return await this.searchTickets(options.searchTerm, query, {
                    page: options.page || 1,
                    limit: options.limit || 10,
                    populate: ['user', 'event', 'order']
                });
            }

            // Regular pagination
            return await this.paginate(query, {
                page: options.page || 1,
                limit: options.limit || 10,
                populate: ['user', 'event', 'order'],
                sort: { createdAt: -1 }
            });

        } catch (error) {
            console.error('Error getting event tickets:', error);
            throw error;
        }
    }

    /**
     * Search tickets with text search
     * @private
     */
    private async searchTickets(searchTerm: string, baseQuery: any = {}, options: any = {}) {
        // Create text search query for ticket-related fields
        const searchQuery = {
            ...baseQuery,
            $or: [
                { seatNumber: { $regex: searchTerm, $options: 'i' } },
                { _id: searchTerm }, // Direct ID search
                // We'll also search in populated fields through aggregation
            ]
        };

        return await this.paginate(searchQuery, options);
    }

    /**
     * Get ticket statistics for an event
     * @param eventId - Event ID
     */
    public async getTicketStats(eventId: string) {
        try {
            const stats = await Ticket.aggregate([
                { $match: { event: new Types.ObjectId(eventId) } },
                {
                    $group: {
                        _id: null,
                        totalTickets: { $sum: 1 },
                        usedTickets: { $sum: { $cond: ['$isUsed', 1, 0] } },
                        unusedTickets: { $sum: { $cond: ['$isUsed', 0, 1] } },
                        totalRevenue: { $sum: '$price' },
                        ticketTypes: {
                            $push: {
                                type: '$ticketType.name',
                                price: '$price',
                                used: '$isUsed'
                            }
                        }
                    }
                }
            ]);

            if (stats.length === 0) {
                return {
                    totalTickets: 0,
                    usedTickets: 0,
                    unusedTickets: 0,
                    totalRevenue: 0,
                    ticketTypes: []
                };
            }

            return stats[0];

        } catch (error) {
            console.error('Error getting ticket stats:', error);
            throw error;
        }
    }

    /**
     * Resend ticket email
     * @param ticketId - Ticket ID
     * @param userId - User ID (for authorization)
     */
    public async resendTicketEmail(ticketId: string, userId: string) {
        try {
            const ticket = await this.getTicketById(ticketId, userId);

            if (!ticket) {
                throw errorResponseMessage.resourceNotFound("Ticket not found");
            }

            const event = ticket.event as any;
            const user = ticket.user as any;

            // Generate QR code buffer
            const qrCodeBuffer = await QRCode.toBuffer(ticket.qrCode!);

            // Resend ticket email
            await this.mailService.sendTicketEmail(
                user.email,
                {
                    ticketId: ticket._id!.toString(),
                    eventName: event.title,
                    eventDate: new Date(event.date!),
                    venue: event?.venue || 'TBA',
                    ticketType: ticket.ticketType?.name || 'General',
                    seatNumber: ticket.seatNumber || "N/A",
                    price: ticket.price || 0,
                    userName: `${user.firstName} ${user.lastName}`
                },
                qrCodeBuffer
            );

            return {
                message: "Ticket email resent successfully",
                ticket: ticket._id
            };

        } catch (error) {
            console.error('Error resending ticket email:', error);
            throw error;
        }
    }

    /**
     * Cancel/invalidate tickets (for refunds)
     * @param ticketIds - Array of ticket IDs
     * @param userId - User ID (for authorization)
     */
    public async cancelTickets(ticketIds: string[], userId: string) {
        try {
            const tickets = await Ticket.find({
                _id: { $in: ticketIds },
                user: userId,
                isUsed: false
            });

            if (tickets.length !== ticketIds.length) {
                throw errorResponseMessage.badRequest("Some tickets not found or already used");
            }

            // Mark tickets as cancelled (you might want to add a cancelled field to schema)
            await Ticket.updateMany(
                { _id: { $in: ticketIds } },
                { $set: { isUsed: true, cancelledAt: new Date() } }
            );

            return {
                message: "Tickets cancelled successfully",
                cancelledTickets: tickets.length
            };

        } catch (error) {
            console.error('Error cancelling tickets:', error);
            throw error;
        }
    }
}

export default TicketService;