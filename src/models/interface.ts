import {Document, Schema} from 'mongoose';
import {
    USER_STATUS,
    PUBLICATION_STATUS, EVENT_DATE_STATUS, EVENT_CATEGORY
} from "../common/constant";

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export type PublicationStatus = (typeof PUBLICATION_STATUS)[keyof typeof PUBLICATION_STATUS];

export type EventDateStatus = (typeof EVENT_DATE_STATUS)[keyof typeof EVENT_DATE_STATUS];

export type EventCategory = (typeof EVENT_CATEGORY)[keyof typeof EVENT_CATEGORY];

export interface IUser extends Document {
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    email: string;
    isVerified: boolean;
    isCompleted: boolean;
    role: number;
    status: UserStatus;
    lastLogin: string;
    phoneNumber: string;
    whatsappNumber: string;
    hearAboutUs?: 'friends' | 'ads' | 'others';
}

export interface IRefreshToken extends Document {
    userId: Schema.Types.ObjectId;
    token: string;
    expiresAt: Date;
    isRevoked: boolean;
    userAgent?: string;
    ipAddress?: string;
}

interface FaqItem {
    question: string;
    answer: string;
}

export interface IEvent extends Document {
    title: string;
    venue?: string;
    capacity?: number;
    date?: Date;
    time?: Date;
    category?: EventCategory;
    image?: string | Express.Multer.File;
    description?: string;
    faqs?: FaqItem[];
    user: Schema.Types.ObjectId;
    publicationStatus?: PublicationStatus;
    eventDateStatus?: EventDateStatus;
    automaticallyPublishAt?: Date;
    price?: number;
}

export interface ITicket extends Document {
    event: Schema.Types.ObjectId;
    user: Schema.Types.ObjectId;
    paidAt: Date;
}