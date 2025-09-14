import z from "zod";
import { ORDER_STATUS } from "../common/constant";
import zodErrorHandler from "./zod.error";
import { Request, Response, NextFunction } from "express";

const ZCreateOrder = z.object({
    event: z
        .string()
        .min(1, "Event ID is required")
        .refine((val) => val !== undefined && val !== null, {
            message: "Event is required"
        }),

    ticketType: z
        .string()
        .min(1, "Ticket type name must be at least 1 character")
        .optional(),

    numberOfTicket: z
        .coerce.number()
        .int("Number of tickets must be an integer")
        .min(1, "Must order at least 1 ticket")
        .max(100, "Cannot order more than 100 tickets at once")
        .optional()
        .default(1),

    // Note: totalPrice is calculated automatically in the service, so we don't validate it here
    // Note: user is extracted from token, so we don't validate it here
    // Note: status is set automatically to PENDING, so we don't validate it here
    // Note: purchaseDate is set automatically, so we don't validate it here
});

const ZUpdateOrder = z.object({
    status: z
        .enum(Object.values(ORDER_STATUS), {
            error: "Invalid order status"
        })
        .optional(),

    numberOfTicket: z
        .coerce.number()
        .int("Number of tickets must be an integer")
        .min(1, "Must order at least 1 ticket")
        .max(100, "Cannot order more than 100 tickets at once")
        .optional(),

    ticketType: z
        .string()
        .min(1, "Ticket type name must be at least 1 character")
        .optional(),
});

const ZUpdateOrderStatus = z.object({
    status: z
        .enum(Object.values(ORDER_STATUS), {
            error: "Invalid order status"
        })
        .refine((val) => val !== undefined && val !== null, {
            message: "Order status is required"
        })
});

const validate = (req: Request, res: Response, next: NextFunction) => {
    try {
        ZCreateOrder.parse(req.body);
        next();
    } catch (error) {
        zodErrorHandler(error, next);
    }
};

export const validateUpdate = (req: Request, res: Response, next: NextFunction) => {
    try {
        ZUpdateOrder.parse(req.body);
        next();
    } catch (error) {
        zodErrorHandler(error, next);
    }
};

export const validateStatusUpdate = (req: Request, res: Response, next: NextFunction) => {
    try {
        ZUpdateOrderStatus.parse(req.body);
        next();
    } catch (error) {
        zodErrorHandler(error, next);
    }
};

export default validate;