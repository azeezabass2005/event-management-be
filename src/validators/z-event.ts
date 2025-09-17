import z from "zod";
import {EVENT_CATEGORY, EVENT_DATE_STATUS, PUBLICATION_STATUS} from "../common/constant";
import zodErrorHandler from "./zod.error";
import {Request, Response, NextFunction} from "express";

const FaqQuestion = z.object({
    question: z.string(),
    answer: z.string(),
});

const ZTicketType = z.object({
    name: z.string().min(1, "Ticket type name is required"),
    description: z.string().min(1, "Ticket type description is required"),
    price: z.coerce.number().nonnegative("Ticket price must be a positive number"),
});

// Helper to support JSON strings (from multipart/form-data) or direct objects/arrays
const parseJsonIfString = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess((value) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    }, schema);

const ZCreateEvent = z.object({
    title: z
        .string()
        .min(2, "Title must be at least 2 characters")
        .max(100, "Title cannot exceed 100 characters")
        .refine((val) => val !== undefined && val !== null, {
            message: "Title is required"
        }),

    venue: z
        .string()
        .min(10, "The venue must be at lest 10 characters")
        .max(200, "The venue cannot exceed 200 characters")
        .optional(),

    capacity: z
        .coerce.number()
        .int("The capacity can only be an integer")
        .min(10, "The event must be able to hold at least 10 people")
        .optional(),
    price: z
        .coerce.number()
        .optional(),
    time: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Please enter a valid time")
        .optional(),
    date: z
        .coerce
        .date("Please enter a valid date")
        .optional(),
    category: z
        .enum(Object.values(EVENT_CATEGORY), {
            error: "Invalid event category"
        }),
    description: z
        .string()
        .min(10, "The event description is too short")
        .max(300, "The event description is too long")
        .optional(),
    images: parseJsonIfString(z.array(z.string()).min(1, "Please upload at least one image")),
    faqs: parseJsonIfString(z.array(FaqQuestion)).optional(),

    // I removed this cos I will get the user who made the request from the token so it's not needed
    // user: z
    //     .string()
    //     .refine((val) => val !== undefined && val !== null, {
    //         message: "User is required"
    //     }),

    publicationStatus: z
        .enum(Object.values(PUBLICATION_STATUS))
        .optional(),
    eventDateStatus: z
        .enum(Object.values(EVENT_DATE_STATUS))
        .optional(),
    automaticallyPublishAt: z
        .coerce
        .date("The automatically publish at must be a valid date")
    .optional(),
    ticketTypes: parseJsonIfString(z.array(ZTicketType)).optional(),
    defaultTicketType: parseJsonIfString(ZTicketType).optional(),
})

const ZUpdateEvent = ZCreateEvent.partial();

const ZUpdateEventPublicationStatus = z.object({
    publicationStatus: z
        .enum(Object.values(PUBLICATION_STATUS), { error: "Invalid publication status" })
        .refine((val) => val !== undefined && val !== null, { error: "Publication status is required" })
})


const validate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = ZCreateEvent.parse(req.body);
        req.body = parsed as any;
        next()
    } catch (error) {
        zodErrorHandler(error, next)
    }
}

export const validateUpdate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = ZUpdateEvent.parse(req.body);
        req.body = parsed as any;
        next()
    } catch (error) {
        zodErrorHandler(error, next)
    }
}

export const validatePublicationStatusUpdate = (req: Request, res: Response, next: NextFunction) => {
    try {
        ZUpdateEventPublicationStatus.parse(req.body);
        next()
    } catch (error) {
        zodErrorHandler(error, next)
    }
}

export default validate;