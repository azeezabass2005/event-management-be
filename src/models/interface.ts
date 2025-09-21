import {Document, Schema} from 'mongoose';
import {
    USER_STATUS,
    PUBLICATION_STATUS, EVENT_DATE_STATUS, EVENT_CATEGORY, ORDER_STATUS, TRANSACTION_STATUS
} from "../common/constant";

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export type PublicationStatus = (typeof PUBLICATION_STATUS)[keyof typeof PUBLICATION_STATUS];

export type EventDateStatus = (typeof EVENT_DATE_STATUS)[keyof typeof EVENT_DATE_STATUS];

export type EventCategory = (typeof EVENT_CATEGORY)[keyof typeof EVENT_CATEGORY];

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

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

    // Payment related stuff
    flutterwaveCustomerId?: string;
    availableBalance?: number;
    totalEarnings?: string;
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

export interface TicketType {
    name: string;
    description: string;
    price: number;
}

export interface IEvent extends Document {
    title: string;
    venue?: string;
    capacity?: number;
    date?: Date;
    time?: string;
    category?: EventCategory;
    images?: string[];
    description?: string;
    faqs?: FaqItem[];
    user: Schema.Types.ObjectId;
    publicationStatus?: PublicationStatus;
    eventDateStatus?: EventDateStatus;
    automaticallyPublishAt?: Date;
    price?: number;
    // TODO: Update the validators and the model to accommodate for this
    ticketTypes?: TicketType[];
    defaultTicketType?: TicketType;
}

export interface ITicket extends Document {
    event: Schema.Types.ObjectId | IEvent;
    user: Schema.Types.ObjectId | IUser;
    ticketType?: TicketType;
    price: number;
    seatNumber?: string;
    order: Schema.Types.ObjectId;
    qrCode: string;
    isUsed?: boolean;
    purchaseDate: Date;
}

export interface IOrder extends Document {
    user: Schema.Types.ObjectId | IUser;
    event: Schema.Types.ObjectId | string | IEvent;
    ticketType?: TicketType | string;
    numberOfTicket: number;
    totalPrice: number;
    purchaseDate: Date;
    status: OrderStatus;
}

export interface ITransaction extends Document {
    order: Schema.Types.ObjectId | string | IOrder;
    user: Schema.Types.ObjectId | string | IUser;
    reference: string;
    providerTransactionId?: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: TransactionStatus;

    virtualAccount?: {
        accountNumber?: string;
        bankName?: string;
        expiryDate?: Date;
    };

    logs: {
        amount: number;
        status: string;
        receivedAt: Date;
        rawPayload: any;
    }[];

    metadata?: any;
    initiatedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
}

export interface IScanner extends Document {
    scannerId: Schema.Types.ObjectId;
    eventId: Schema.Types.ObjectId;
}