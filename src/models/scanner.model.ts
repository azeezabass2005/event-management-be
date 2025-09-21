import {model, Schema} from "mongoose";
import {IScanner} from "./interface";
import {MODEL_NAME} from "../common/constant";

const ScannerSchema = new Schema<IScanner>({
    /**
     * Field to store the id of the scanner
     *
     * @description It stores the id of the authorized scanner for the ticket to an event
     * @type {Schema.Types.ObjectId}
     * @required
     * @r
     */
    scannerId: { type: Schema.Types.ObjectId, ref: MODEL_NAME.USER, required: true },

    /**
     * Field to store the event id
     *
     * @description It stores the event that the scannerId User field can scan tickets QRCode for
     */
    eventId: { type: Schema.Types.ObjectId, ref: MODEL_NAME.EVENT, required: true },
})

const Scanner = model<IScanner>(MODEL_NAME.SCANNER, ScannerSchema);
export default Scanner;

