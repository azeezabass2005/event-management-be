/**
 * Controller handling event related operations that requires authorization
 * @class EventController
 * @extends BaseController
 */
import BaseController from "../base-controller";
import EventService from "../../../services/event.service";
import {Request, Response, NextFunction} from "express";
import errorResponseMessage from "../../../common/messages/error-response-message";
import {eventCreateValidate, eventPublicationStatusValidate, eventUpdateValidate} from "../../../validators";
import {MulterMiddleware} from "../../../middlewares/multer.middleware";

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
        // Get all events by the user
        this.router.get("/", this.getAllEventByUser.bind(this));

        // Create a new event
        this.router.post("/", MulterMiddleware.single('profileImage'), MulterMiddleware.handleError, eventCreateValidate, this.createEvent.bind(this));

        // Update an existing event
        this.router.patch("/:id", MulterMiddleware.single('profileImage'), MulterMiddleware.handleError, eventUpdateValidate, this.updateEvent.bind(this));

        // Update an event publication status
        this.router.patch("/publication-status/:id", eventPublicationStatusValidate, this.updateEventPublicationStatus.bind(this))

    }

    /**
     * Gets all the event created by current user
     * @private
     */
    private async getAllEventByUser(req: Request, res: Response, next: NextFunction) {
        try {

            const { page, limit, searchTerm, ...otherQueries } = req.query;

            const user = res.locals.user;

            otherQueries.user = user?._id;

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

    /**
     * Creates a new event
     * @private
     */
    private async createEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const user = res.locals.user;
            const event = await this.eventService.createEventWithImage({ ...req.body, user: user._id!}, req.file);
            return this.sendSuccess(res, {
                event,
                message: "Event created successfully",
            })
        } catch (error) {
            return next(error)
        }
    }

    /**
     * Updates an existing event
     * @private
     */
    private async updateEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const user = res.locals.user;
            if(req.body.publicationStatus) {
                return next(errorResponseMessage.payloadIncorrect("Publication status cannot be updated through this endpoint"))
            }
            if(!user) {
                return next(errorResponseMessage.unauthorized("Invalid user"));
            }
            const event = await this.eventService.updateEventById(user._id!, req.params.id!, req.body, req.file);
            return this.sendSuccess(res, {
                event,
                message: "Event updated successfully",
            })
        } catch (error) {
            return next(error)
        }
    }

    private async getSingleEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const event = await this.eventService.findById(id!);
            if(!event) {
                next(errorResponseMessage.resourceNotFound("Event"))
                return;
            }
            return this.sendSuccess(res, {
                message: "Event retrieved successfully",
                event
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Publishes an event and there is no going back after publishing an event
     * @private
     */
    private async updateEventPublicationStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const user = res.locals.user;
            if(!user) {
                return next(errorResponseMessage.unauthorized("Invalid user"));
            }
            const event = await this.eventService.updateEventStatus(user._id!, req.params.id!, req.body.eventPublicationStatus!);
            return this.sendSuccess(res, {
                event,
                message: "Event publication status updated successfully",
            })
        } catch(error) {
            return next(error)
        }
    }


}

export default new EventController().router;