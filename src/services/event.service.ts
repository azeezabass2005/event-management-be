import Event from "../models/event.model"

/**
 * Service class for Event-related operations
 *
 * @description Extends the generic DBService with Event-specific operations
 * @extends {DBService<IEvent>}
 */
import DBService from "../utils/db.utils";
import {IEvent, PublicationStatus} from "../models/interface";
import errorResponseMessage from "../common/messages/error-response-message";

class EventService extends DBService<IEvent> {
    /**
     * Creates an instance of EventService
     * @constructor
     * @param populatedField
     * @example
     * new EventService(['user'])
     */
    constructor(populatedField: string[] = []) {
        super(Event, populatedField);
    }

    /**
     * Verify if the user is the owner of the event
     */
    private async verifyOwnership(userId: string, eventId: string): Promise<boolean> {
        const event = await this.findById(eventId);
        if (!event) {
            throw errorResponseMessage.resourceNotFound("Event")
        }
        return (event.user && event.user.toString() === userId)
    }

    /**
     * Updates event for a user if they are the owner
     */
    public async updateEventById(userId: string, eventId: string, eventData: Partial<IEvent>) {
        const isOwner = await this.verifyOwnership(userId, eventId);
        if (!isOwner) {
            throw errorResponseMessage.unauthorized("You are unauthorized to update this event")
        }
        return await this.updateById(eventId, eventData);
    }

    /**
     * Changes event status for the user that owns the event
     */
    public async updateEventStatus(userId: string, eventId: string, status: PublicationStatus)  {
        const isOwner = await this.verifyOwnership(userId, eventId);
        if (!isOwner) {
            throw errorResponseMessage.unauthorized("You unauthorized to change the publication status of this event")
        }
        return await this.updateById(eventId, { status });
    }
}

export default EventService;