import Event from "../models/event.model"

/**
 * Service class for Event-related operations
 *
 * @description Extends the generic DBService with Event-specific operations
 * @extends {DBService<IEvent>}
 */
import DBService, {PaginationResult} from "../utils/db.utils";
import {IEvent, PublicationStatus} from "../models/interface";
import errorResponseMessage from "../common/messages/error-response-message";
import {FileUploadFactory} from "./file-upload.factory";
import {UploadResult} from "../types/file.types";

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

    private profileUploadService = FileUploadFactory.getProfileUploadService();

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
    /*
    *get all events 
    */
    public async getAllEvents(){
        return await this.find({})
    }

    /**get Event by its Id */
    public async getEventById(id:any){
        const event = await this.find({_id:id})
       return event
        // console.log(id) const _id = eventId
    }
    
    /*
        
     * Creates event with the image
     */
    public async createEventWithImage(eventData: Partial<IEvent>, image: Express.Multer.File | undefined) {

        return await this.create(eventData)
    }

    /**
     * Updates event for a user if they are the owner
     */
    public async updateEventById(userId: string, eventId: string, eventData: Partial<IEvent>, image: Express.Multer.File | undefined) {
        const isOwner = await this.verifyOwnership(userId, eventId);
        if (!isOwner) {
            throw errorResponseMessage.unauthorized("You are unauthorized to update this event")
        }

        return await this.updateById(eventId,eventData)
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


    /**
     * Search partners with flexible text matching
     * @param searchTerm - The term to search for
     * @param filters - Additional filters
     * @param options - Pagination and sorting options
     */
    public async searchEvents(
        searchTerm: string,
        filters: Partial<IEvent> = {},
        options: {
            page?: number;
            limit?: number;
            populate?: string[];
            useTextSearch?: boolean;
        } = {}
    ): Promise<PaginationResult<IEvent>> {
        const { page = 1, limit = 10, populate = [], useTextSearch = false } = options;

        let query: any = { ...filters };
        let sortOptions: Record<string, any> = { created_at: -1 };

        if (searchTerm?.trim()) {
            const cleanedSearchTerm = searchTerm.trim();

            if (useTextSearch && cleanedSearchTerm.length >= 3) {
                // Use text search for better performance on full words
                query.$text = { $search: cleanedSearchTerm };
                sortOptions = { score: { $meta: "textScore" } };
            } else {
                // Use regex for partial matching
                const escapedSearchTerm = cleanedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedSearchTerm, 'i');

                query.$or = [
                    { name: regex },
                    { description: regex },
                    { city: regex },
                    { country: regex },
                    { 'roleData.skills': { $elemMatch: { $regex: regex } } },
                    { 'roleData.specialties': { $elemMatch: { $regex: regex } } },
                    { 'roleData.subjects': { $elemMatch: { $regex: regex } } },
                    { 'roleData.talents': { $elemMatch: { $regex: regex } } },
                    { 'roleData.expertise': regex },
                    { 'roleData.bio': regex },
                    { 'roleData.title': regex },
                ];
            }
        }

        return this.paginate(query, {
            page,
            limit,
            populate,
            sort: sortOptions
        });
    }

}

export default EventService;