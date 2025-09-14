/**
 * Mongoose schema for Event model
 *
 * @description Creates a schema for events
 */ import mongoose, {Model, model, Schema} from "mongoose";
import {IEvent} from "./interface";
import {EVENT_CATEGORY, EVENT_DATE_STATUS, MODEL_NAME, PUBLICATION_STATUS} from "../common/constant";
import paginate from "mongoose-paginate-v2";


export const eventSchema = new Schema<IEvent>(
    {
        /**
         * Event title
         * @type {string}
         * @required
         * @trim
         */
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        /**
         * Event venue
         * @type {string}
         * @trim
         */
        venue: {
            type: String,
            trim: true,
            maxlength: 200
        },

        /**
         * Capacity the event can host
         * @type {number}
         */
        capacity: {
            type: Number
        },

        /**
         * Price of the event ticket
         * @type {number}
         */
        price: {
            type: Number
        },

        /**
         * Date of the event
         * @type {Date}
         */
        date: {
            type: Date,
        },

        /**
         * Date to automatically publish the event
         * @type {Date}
         */
        automaticallyPublishAt: {
            type: Date,
        },


        /**
         * Time of the event
         * @type {String}
         */
        time: {
            type: String,
        },

        /**
         * Category of the event
         * @type {string}
         * @enum EventCategory
         */
        category: {
            type: String,
            enum: Object.values(EVENT_CATEGORY)
        },

        /**
         * URL to event banner image
         * @type {string}
         * @optional
         */
        images: {
            type: [String],
            default: [],
        },

        /**
         * Description of the event
         * @type {string}
         */
        description: {
            type: String,
        },

        /**
         * FAQs about the event
         * @type FaqItem[]
         */
        faqs: {
            type: [

                {
                    question: { type: String, required: true },
                    answer: { type: String, required: true },
                },
            ],
            default: [],
        },

        /**
         * User ID of the event creator
         * @type {Schema.Types.ObjectId}
         * @required
         * @ref UserModel
         */
        user: { type: Schema.Types.ObjectId, ref: MODEL_NAME.USER, required: true },

        /**
         * Publication Status of the event
         * @type {String}
         * @enum PublicationStatus
         */
        publicationStatus: {
            type: String,
            enum: Object.values(PUBLICATION_STATUS),
            default: 'draft'
        },

        /**
         * Event Date Status
         * @type {String}
         * @enum EventDateStatus
         */
        eventDateStatus: {
            type: String,
            enum: Object.values(EVENT_DATE_STATUS),
            default: 'upcoming'
        },

        /**
         * The ticket type being ordered
         * @type  TicketType
         * @optional
         */
        defaultTicketType: {
            type: {
                name: { type: String, required: true },
                description: { type: String, required: true },
                price: { type: Number, required: true },
            }
        },

        /**
         * Ticket types available for the event
         * @type TicketType[]
         */
        ticketTypes: {
            type: [
                {
                    name: { type: String, required: true },
                    description: { type: String, required: true },
                    price: { type: Number, required: true },
                }
            ],
            default: [],
        },
    },
    {
        /** Enable virtual properties when converting to plain object */
        toObject: { virtuals: true },

        /** Enable virtual properties when converting to JSON */
        toJSON: { virtuals: true },

        /** Automatically manage createdAt and updatedAt timestamps */
        timestamps: true,

        /** Optimize for queries */
        collection: 'events'
    }
)

eventSchema.plugin(paginate)

const Event: Model<IEvent> = model<IEvent>(MODEL_NAME.EVENT, eventSchema);

export default Event;
