/**
 * Service class for Ticket-related operations
 *
 * @description Extends the generic DBService with Ticket-specific operations
 * @extends {DBService<IEvent>}
 */
import DBService from "../utils/db.utils";
import {ITicket} from "../models/interface";
import Ticket from "../models/ticket.model";

class TicketService extends DBService<ITicket> {
    /**
     * Creates an instance of TicketService
     * @constructor
     * @param populatedField
     * @example
     * new TicketService(['user', 'event'])
     */
    constructor (populatedField: string[] = []) {
        super(Ticket, populatedField);
    }
}