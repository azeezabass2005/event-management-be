import { model, Model, Schema, Document } from "mongoose";
import { MODEL_NAME, TRANSACTION_STATUS, PAYMENT_METHOD } from "../common/constant";
import {ITransaction} from "./interface";

/**
 * Mongoose schema for Transaction model
 *
 * @description Stores payment transactions linked to orders
 * @remarks
 * - Created when initiating a payment (e.g. virtual account generation)
 * - Updated via Flutterwave webhook verification
 * - Includes payment logs for multiple attempts (underpay, overpay, retries)
 */
const transactionSchema = new Schema<ITransaction>(
    {
        /**
         * The order associated with this transaction
         */
        order: { type: Schema.Types.ObjectId, ref: MODEL_NAME.ORDER, required: true },

        /**
         * The user who made this payment attempt
         */
        user: { type: Schema.Types.ObjectId, ref: MODEL_NAME.USER, required: true },

        /**
         * Payment provider reference (e.g. Flutterwave tx_ref)
         */
        reference: { type: String, required: true, unique: true },

        /**
         * Flutterwave transaction ID (on webhook confirmation)
         */
        providerTransactionId: { type: String },

        /**
         * The amount that was expected/charged
         */
        amount: { type: Number, required: true },

        /**
         * Currency of the transaction
         */
        currency: { type: String, default: "NGN" },

        /**
         * Payment method used
         * e.g., card, bank_transfer, ussd
         */
        paymentMethod: { type: String, enum: Object.values(PAYMENT_METHOD) },

        /**
         * Current status of the transaction
         */
        status: { type: String, enum: Object.values(TRANSACTION_STATUS), default: "pending" },

        /**
         * Virtual account details (for Pay with Bank Transfer)
         */
        virtualAccount: {
            accountNumber: { type: String },
            bankName: { type: String },
            expiryDate: { type: Date },
        },

        /**
         * Logs of every payment event received from webhook
         * (underpayment, overpayment, retries)
         */
        logs: [
            {
                amount: Number,
                status: String,
                receivedAt: { type: Date, default: Date.now },
                rawPayload: Schema.Types.Mixed,
            },
        ],

        /**
         * Raw metadata from the payment provider
         */
        metadata: { type: Schema.Types.Mixed },

        /**
         * The date this transaction was initiated
         */
        initiatedAt: { type: Date, default: Date.now },

        /**
         * The date this transaction was completed/failed
         */
        completedAt: { type: Date },

        /**
         * The date this transaction was completed/failed
         */
        failedAt: { type: Date },
    },
    {
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
        timestamps: true,
        collection: "transactions",
    }
);

const Transaction: Model<ITransaction> = model<ITransaction>(
    MODEL_NAME.TRANSACTION,
    transactionSchema
);

export default Transaction;
