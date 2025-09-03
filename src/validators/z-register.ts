import z from "zod";
import {Request, Response, NextFunction} from "express";
import zodErrorHandler from "./zod.error";

const ZRegister = z.object({
    firstName: z
        .string()
        .min(3, "First name must be at least 3 characters")
        .refine((val) => val !== undefined && val !== null, {
            message: "First name is required"
        }),
    lastName: z
        .string()
        .min(3, "Last name must be at least 3 characters")
        .refine((val) => val !== undefined && val !== null, {
            message: "Last name is required"
        }),

    email: z
        .string()
        .refine((email) => {
            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
            return emailRegex.test(email);
        }, "Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters."),
    phoneNumber: z.string().min(11, "Phone Number must be at least 11 digits"),
    whatsappNumber: z.string().min(11, "Whatsapp Number must be at least 11 digits"),
})

const ZUpdateUser = z.object({
    status: z.enum(['active', 'inactive', 'deactivated', 'suspended'], {
        error: () => ({message: "Status can either be 'Active', 'Suspended' or 'Deactivated'"})
    }),
    role: z.enum(['ADMIN', 'USER'], {
        error: () => ({message: "Role can either be 'User' or 'Administrator'"})
    })
})

const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
    try {
        ZRegister.parse(req.body);
        next()
    } catch (error) {
        zodErrorHandler(error, next)
    }
}

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
    try {
        ZUpdateUser.parse(req.body);
        next()
    } catch (error) {
        zodErrorHandler(error, next)
    }
}

export default validateRegistration;