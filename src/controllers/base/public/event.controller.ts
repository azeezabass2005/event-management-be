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

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const events = this.eventService.paginate({}, {
                page,
                limit,
                sort: {created_at: -1},
                populate: ['user']
            });
            return this.sendSuccess(res, {
                events,
                message: "All events retrieved successfully"
            })
        } catch (error) {
            return next(error)
        }
    }
}

export default new EventController().router;