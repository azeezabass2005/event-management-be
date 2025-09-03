import {model, Model, Schema} from "mongoose";
import {ITicket} from "./interface";
import {MODEL_NAME} from "../common/constant";

/**
 * Mongoose schema for Ticket model
 *
 * @description Creates a schema for ticket authentication and basic information
 * @remarks
 * - Includes timestamps for creation and update tracking
 * - Enables virtual property transformations
 */
const ticketSchema = new Schema<ITicket>(
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
    },
    {
        /** Enable virtual properties when converting to plain object */
        toObject: { virtuals: true },

        /** Enable virtual properties when converting to JSON */
        toJSON: { virtuals: true },

        /** Automatically manage createdAt and updatedAt timestamps */
        timestamps: true,

        /** Optimize for queries */
        collection: 'partners'
    }
)

const Ticket: Model<ITicket> = model<ITicket>(MODEL_NAME.TICKET, ticketSchema);
export default Ticket;