/**
 * Controller handling event related operations that are public
 * @class EventController
 * @extends BaseController
 */
import BaseController from "../base-controller";
import EventService from "../../../services/event.service";
import {Request, Response, NextFunction} from "express";
import errorResponseMessage from "../../../common/messages/error-response-message";

class EventController extends BaseController {
    private eventService: EventService;

    constructor () {
        super();
        this.eventService = new EventService();
        this.setupRoutes();
    }

    /**
     * Setup routes for event operations
     * @protected
     */
    protected setupRoutes(): void {
        // Route to get all events
        this.router.get("/", this.getEvents.bind(this));
    }

    /**
     * Gets all the events
     * @private
     */
    private async getEvents(req: Request, res: Response, next: NextFunction) {
        try {

            const { page, limit, searchTerm, ...otherQueries } = req.query;

            otherQueries.status = "published";

            let events;

            if (searchTerm) {
                events = await this.eventService.searchEvents(
                    searchTerm.toString(),
                    otherQueries,
                    {
                        page: parseInt(page as string) || 1,
                        limit: parseInt(limit as string) || 10,
                        populate: ['user'],
                        useTextSearch: false
                    }
                );
            } else {
                events = await this.eventService.paginate(otherQueries, {
                    page: parseInt(page as string) || 1,
                    limit: parseInt(limit as string) || 10,
                    populate: ['user'],
                    sort: { created_at: -1 }
                });
            }

            return this.sendSuccess(res, events)

        } catch (error) {
            return next(error)
        }
    }
}

export default new EventController().router;