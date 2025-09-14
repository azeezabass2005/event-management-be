/**
 * Service class for Order-related operations
 *
 * @description Extends the generic DBService with Order-specific operations
 * @extends {DBService<IOrder>}
 */
import DBService from "../utils/db.utils";
import {IOrder, IUser, TicketType} from "../models/interface";
import Order from "../models/order.model";
import EventService from "./event.service";
import errorResponseMessage from "../common/messages/error-response-message";
import {ORDER_STATUS} from "../common/constant";
import PaymentService from "./payment.service";

class OrderService extends DBService<IOrder> {

    eventService: EventService;
    paymentService: PaymentService;

    /**
     * Creates an instance of OrderService
     * @constructor
     * @param populatedField
     * @example
     * new OrderService(['user', 'event'])
     */
    constructor(populatedField: string[] = []) {
        super(Order, populatedField);
        this.eventService = new EventService(['user']);
        this.paymentService = new PaymentService();
    }

    /**
     * It creates a new order and returns the payment link
     * @param user
     * @param data
     * @public
     */
    public async createOrder(user: Partial<IUser>, data: Partial<IOrder>) {
        const { event: eventId, ticketType, numberOfTicket = 1, } = data;
        const event = await this.eventService.findById(eventId! as string)

        if (!event) {
            throw errorResponseMessage.resourceNotFound("Event")
        }
        let fullTicketType: TicketType | undefined;
        if(ticketType) {
            fullTicketType = event?.ticketTypes?.find(ticType => ticType.name?.toLowerCase() === (ticketType as string)?.toLowerCase());
        }
        if(ticketType && !fullTicketType) {
            throw errorResponseMessage.resourceNotFound("Ticket type");
        }
        let price: number;
        if(fullTicketType) {
            price = Number(fullTicketType.price) * Number(numberOfTicket);
        } else if (event.price) {
            price = Number(event.price) * Number(numberOfTicket)
        } else {
            throw errorResponseMessage.unableToComplete('Unable to get ticket price.');
        }
        const order = await this.create({
            user: user._id!,
            event: eventId,
            ...(ticketType ? { ticketType: fullTicketType } : {}),
            numberOfTicket: numberOfTicket,
            totalPrice: price,
            purchaseDate: Date.now(),
            status: ORDER_STATUS.PENDING,
        });

        return await this.paymentService.generateOrderPayment(user, order);
    }
}

export default OrderService;