import DBService from "../utils/db.utils";
import {IScanner} from "../models/interface";
import Scanner from "../models/scanner.model";
import UserService from "./user.service";
import errorResponseMessage from "../common/messages/error-response-message";

class ScannerService extends DBService<IScanner> {

    userService: UserService;

    constructor() {
        super(Scanner, [])
        this.userService = new UserService();
    }

    public async addScanner(event: string, email: string) {
        const user = await this.userService.findOne({ email });
        if (!user) {
            throw errorResponseMessage.resourceNotFound("User with email");
        }
        const existing = await this.findOne({ scannerId: user._id, eventId: event });
        if (existing) {
            throw errorResponseMessage.resourceAlreadyExist(`${email} already assigned to this event`);
        }
        return await this.create({ scannerId: user._id, eventId: event });
    }

    public async removeScanner(event: string, email: string) {
        const user = await this.userService.findOne({ email });
        if (!user) {
            throw errorResponseMessage.resourceNotFound("User with email");
        }
        const existing = await this.findOne({ scannerId: user._id, eventId: event });
        if (!existing) {
            throw errorResponseMessage.resourceNotFound("Scanner not assigned to this event");
        }
        return await this.deleteOne({ scannerId: user._id, eventId: event });
    }
}

export default ScannerService;