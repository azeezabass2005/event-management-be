/**
 * Controller handling ticket related operations that requires authorization
 * @class TicketController
 * @extends BaseController
 */
import BaseController from "../base-controller";
import TicketService from "../../../services/ticket.service";
import { Request, Response, NextFunction } from "express";
import errorResponseMessage from "../../../common/messages/error-response-message";
// import { ticketVerificationValidate, resendTicketEmailValidate } from "../../../validators";

class TicketController extends BaseController {
    private ticketService: TicketService;

    constructor() {
        super();
        this.ticketService = new TicketService();
        this.setupRoutes();
    }

    /**
     * Setup routes for ticket operations
     * @protected
     */
    protected setupRoutes(): void {
        // Get all tickets by the current user
        this.router.get("/", this.getAllTicketsByUser.bind(this));
        // create ticket
        // this.router.post("/event",this.createTickets.bind(this))
        // Get all tickets for a specific event (for event organizers)
        this.router.get("/event/:eventId", this.getAllTicketsByEvent.bind(this));

        // Get a single ticket by ID
        this.router.get("/:id", this.getTicketById.bind(this));


        // TODO: I need to write this zod validator ticketVerificationValidate
        // Verify a ticket (for event organizers/staff)
        this.router.post("/verify", this.verifyTicket.bind(this));
        this.router.post("/create-ticket",this.createTickets.bind(this))

        // TODO: I need to write the zod validator for this too resendTicketEmailValidate
        // Resend ticket email
        this.router.post("/:id/resend-email", this.resendTicketEmail.bind(this));

        // Cancel tickets (for refunds)
        this.router.patch("/cancel", this.cancelTickets.bind(this));

        // Get ticket statistics for an event
        this.router.get("/stats/:eventId", this.getTicketStats.bind(this));

        // Download ticket as PDF
        this.router.get("/:id/download", this.downloadTicket.bind(this));
    }

    /**
     * create TIcket by the current user
     */
    private async createTickets(req: Request, res: Response, next: NextFunction){
        try {
            console.log(req.body.data)
          const data = req.body
          const { user, event, order, ticketType, price, purchaseDate, count } =data
      
          if (!user || !event || !order || !price || !purchaseDate || !count) {
            return res
              .status(400)
              .json({ success: false, message: "Missing required fields" });
          }
      
          const tickets = await this.ticketService.createTicketAndSendMail(
            user,
            event,
            order,
            ticketType || null,
            Number(price),
            new Date(purchaseDate),
            Number(count)
          );
      
          return this.sendSuccess(res, {
            message: "Tickets created successfully",
            tickets,
          });
        } catch (error) {
          console.error("Error in createTickets controller:", error);
          return next(error) // ✅ removed the extra semicolon after brace
        }
      }
      




    /**
     * Gets all tickets by the current user
     * @private
     */
    
    private async getAllTicketsByUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, status, eventId, searchTerm } = req.query;
            const user = res.locals.user;

            const options = {
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 10,
                status: status as 'used' | 'unused' | 'all',
                eventId: eventId as string,
                searchTerm: searchTerm as string
            };

            const tickets = await this.ticketService.getTicketsByUser(user._id, options);

            return this.sendSuccess(res, {
                tickets,
                message: "Tickets retrieved successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Gets all tickets for a specific event
     * @private
     */
    private async getAllTicketsByEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const { eventId } = req.params;
            const { page, limit, status, userId, searchTerm } = req.query;
            const user = res.locals.user;

            // TODO: Add authorization check to ensure user is the event organizer or has permission
            // For now, we'll assume it's handled by middleware

            const options = {
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 10,
                status: status as 'used' | 'unused' | 'all',
                userId: userId as string,
                searchTerm: searchTerm as string
            };

            const tickets = await this.ticketService.getTicketsByEvent(eventId! as string, options);

            return this.sendSuccess(res, {
                tickets,
                message: "Event tickets retrieved successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Gets a single ticket by ID
     * @private
     */
    private async   getTicketById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = res.locals.user;

            const ticket = await this.ticketService.getTicketById(id as string, user._id);

            if (!ticket) {
                return next(errorResponseMessage.resourceNotFound("Ticket not found"));
            }

            return this.sendSuccess(res, {
                ticket,
                message: "Ticket retrieved successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Verifies a ticket using QR code or ticket ID
     * @private
     */
    private async verifyTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const { ticketCode } = req.body;
            
            if (!ticketCode) {
                return next(errorResponseMessage.badRequest("Ticket code is required"));
            }

            const verificationResult = await this.ticketService.verifyTicket(ticketCode);

            return this.sendSuccess(res, {
                ...verificationResult,
                message: "Ticket verified successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Resends ticket email to user
     * @private
     */
    private async resendTicketEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = res.locals.user;

            const result = await this.ticketService.resendTicketEmail(id!, user._id);

            return this.sendSuccess(res, {
                ...result,
                message: "Ticket email resent successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Cancels multiple tickets (for refunds)
     * @private
     */
    private async cancelTickets(req: Request, res: Response, next: NextFunction) {
        try {
            const { ticketIds } = req.body;
            const user = res.locals.user;

            if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
                return next(errorResponseMessage.badRequest("Ticket IDs array is required"));
            }

            const result = await this.ticketService.cancelTickets(ticketIds, user._id);

            return this.sendSuccess(res, {
                ...result,
                message: "Tickets cancelled successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Gets ticket statistics for an event
     * @private
     */
    private async getTicketStats(req: Request, res: Response, next: NextFunction) {
        try {
            const { eventId } = req.params;
            const user = res.locals.user;

            // TODO: Add authorization middleware check to ensure user is the event organizer

            const stats = await this.ticketService.getTicketStats(eventId! as string);

            return this.sendSuccess(res, {
                stats,
                message: "Ticket statistics retrieved successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Downloads ticket as PDF
     * @private
     */
    private async downloadTicket(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = res.locals.user;

            const ticket = await this.ticketService.getTicketById(id as string, user._id);

            if (!ticket) {
                return next(errorResponseMessage.resourceNotFound("Ticket not found"));
            }

            // Import PDFService and generate PDF
            const PDFService = require('../../../utils/pdf.service').default;
            const pdfService = new PDFService();

            const event = ticket.event as any;
            const userDetails = ticket.user as any;

            const ticketPDFData = {
                ticketId: ticket._id!.toString(),
                eventName: event.title,
                eventDate: new Date(event.eventDate),
                eventTime: event.eventTime || '12:00 PM',
                venue: event.location?.venue || 'TBA',
                venueAddress: event.location?.address || 'TBA',
                ticketType: ticket.ticketType?.name || 'General',
                seatNumber: ticket.seatNumber,
                price: ticket.price || 0,
                currency: 'NGN',
                userName: `${userDetails.firstName} ${userDetails.lastName}`,
                userEmail: userDetails.email,
                orderNumber: ticket.order?.toString() || 'N/A',
                qrCode: ticket.qrCode || ticket._id!.toString(),
                termsAndConditions: [
                    'This ticket is non-transferable and non-refundable',
                    'Present this ticket and valid ID at the venue entrance',
                    'Ticket holder agrees to comply with venue rules and regulations',
                    'Event organizers reserve the right to refuse entry',
                    'No re-entry allowed once you leave the venue'
                ],
                organizerName: event.organizer || 'Event Platform'
            };

            const pdfBuffer = await pdfService.generateTicketPDF(ticketPDFData);

            // Set response headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket._id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            // Send PDF buffer
            res.send(pdfBuffer);

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Gets user's upcoming events tickets
     * @private
     */
    private async getUpcomingTickets(req: Request, res: Response, next: NextFunction) {
        try {
            const user = res.locals.user;
            const { limit } = req.query;

            // Get tickets for events that haven't occurred yet
            const tickets = await this.ticketService.find({
                user: user._id,
                isUsed: false
            }, {
                populate: ['event'],
                sort: { 'event.eventDate': 1 },
                limit: parseInt(limit as string) || 5
            });

            // Filter tickets where event date is in the future
            const upcomingTickets = tickets.filter((ticket: any) => {
                const eventDate = new Date(ticket.event.eventDate);
                return eventDate > new Date();
            });

            return this.sendSuccess(res, {
                tickets: upcomingTickets,
                count: upcomingTickets.length,
                message: "Upcoming tickets retrieved successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Gets user's past events tickets
     * @private
     */
    private async getPastTickets(req: Request, res: Response, next: NextFunction) {
        try {
            const user = res.locals.user;
            const { page, limit } = req.query;

            // Get tickets for events that have already occurred
            const tickets = await this.ticketService.paginate({
                user: user._id
            }, {
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 10,
                populate: ['event'],
                sort: { 'event.eventDate': -1 }
            });

            // Filter tickets where event date is in the past
            const pastTicketsData = {
                ...tickets,
                data: tickets.data.filter((ticket: any) => {
                    const eventDate = new Date(ticket.event.eventDate);
                    return eventDate < new Date();
                })
            };

            return this.sendSuccess(res, {
                tickets: pastTicketsData,
                message: "Past tickets retrieved successfully"
            });

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Bulk download tickets as ZIP
     * @private
     */
    private async bulkDownloadTickets(req: Request, res: Response, next: NextFunction) {
        try {
            const { ticketIds } = req.body;
            const user = res.locals.user;

            if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
                return next(errorResponseMessage.badRequest("Ticket IDs array is required"));
            }

            // Get all tickets
            const tickets = await Promise.all(
                ticketIds.map(id => this.ticketService.getTicketById(id, user._id))
            );

            // Import required services
            const PDFService = require('../../../utils/pdf.service').default;
            const pdfService = new PDFService();
            const archiver = require('archiver');

            // Create ZIP archive
            const archive = archiver('zip', { zlib: { level: 9 } });

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="tickets.zip"');

            archive.pipe(res);

            // Generate PDF for each ticket and add to ZIP
            for (let i = 0; i < tickets.length; i++) {
                const ticket = tickets[i];
                if (!ticket) continue;

                const event = ticket.event as any;
                const userDetails = ticket.user as any;

                const ticketPDFData = {
                    ticketId: ticket._id!.toString(),
                    eventName: event.title,
                    eventDate: new Date(event.eventDate),
                    eventTime: event.eventTime || '12:00 PM',
                    venue: event.location?.venue || 'TBA',
                    venueAddress: event.location?.address || 'TBA',
                    ticketType: ticket.ticketType?.name || 'General',
                    seatNumber: ticket.seatNumber,
                    price: ticket.price || 0,
                    currency: 'NGN',
                    userName: `${userDetails.firstName} ${userDetails.lastName}`,
                    userEmail: userDetails.email,
                    orderNumber: ticket.order?.toString() || 'N/A',
                    qrCode: ticket.qrCode || ticket._id!.toString(),
                    organizerName: event.organizer || 'Event Platform'
                };

                const pdfBuffer = await pdfService.generateTicketPDF(ticketPDFData);
                archive.append(pdfBuffer, { name: `ticket-${ticket._id}.pdf` });
            }

            await archive.finalize();

        } catch (error) {
            return next(error);
        }
    }
}

export default new TicketController().router;