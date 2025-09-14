import {model, Model, Schema} from "mongoose";
import {IOrder} from "./interface";
import {MODEL_NAME, ORDER_STATUS} from "../common/constant";

/**
 * Mongoose schema for Order model
 *
 * @description Creates a schema for order
 * @remarks
 * - Includes timestamps for creation and update tracking
 * - Enables virtual property transformations
 */
const orderSchema = new Schema<IOrder>(
    {
        /**
         * User ID of the ticket buyer
         * @type {Schema.Types.ObjectId}
         * @required
         * @ref UserModel
         */
        user: { type: Schema.Types.ObjectId, ref: MODEL_NAME.USER, required: true },

        /**
         * ID of the event the ticket belongs to
         * @type {Schema.Types.ObjectId}
         * @required
         * @ref EventModel
         */
        event: { type: Schema.Types.ObjectId, ref: MODEL_NAME.EVENT, required: true },

        /**
         * The ticket type being ordered
         * @type  TicketType
         * @optional
         */
        ticketType: {
            type: {
                name: { type: String, required: true },
                description: { type: String, required: true },
                price: { type: Number, required: true },
            }
        },

        /**
         * The number of tickets being ordered
         * @type {Number}
         * @optional
         * @default {1}
         */
        numberOfTicket: { type: Number, default: 1 },


        /**
         * The total price of all the tickets being ordered
         * @type {String}
         */
        totalPrice: { type: Number },

        /**
         * The seat number allocated to the ticket
         * @type {OrderStatus}
         * @default {pending}
         */
        status: { type: String, enum: Object.values(ORDER_STATUS), default: 'pending'},


        /**
         * The date the order was made
         * @type {Date}
         * @required
         */
        purchaseDate: { type: Date, required: true }


    },
    {
        /** Enable virtual properties when converting to plain object */
        toObject: { virtuals: true },

        /** Enable virtual properties when converting to JSON */
        toJSON: { virtuals: true },

        /** Automatically manage createdAt and updatedAt timestamps */
        timestamps: true,

        /** Optimize for queries */
        collection: 'orders'
    }
)

const Order: Model<IOrder> = model<IOrder>(MODEL_NAME.ORDER, orderSchema);
export default Order;