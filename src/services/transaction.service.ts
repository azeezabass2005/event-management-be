/**
 * Service class for Order-related operations
 *
 * @description Extends the generic DBService with Order-specific operations
 * @extends {DBService<ITransaction>}
 */
import DBService from "../utils/db.utils";
import {ITransaction, IUser, TicketType} from "../models/interface";
import Transaction from "../models/transaction.model";

class TransactionService extends DBService<ITransaction> {

    /**
     * Creates an instance of TransactionService
     * @constructor
     * @param populatedField
     * @example
     * new TransactionService(['user'])
     */
    constructor(populatedField: string[] = []) {
        super(Transaction, populatedField);
    }
}

export default TransactionService;