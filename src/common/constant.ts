export const MODEL_NAME = {
    USER: "UserModel",
    EVENT: "EventModel",
    REFRESH_TOKEN: "RefreshTokenModel",
    TICKET: "TicketModel",
    ORDER: "OrderModel",
    TRANSACTION: "TransactionModel",
}

export const ROLE_MAP = {
    USER: 6474,
    ORGANISER: 5730,
    ADMIN: 9293,
}

export const USER_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    PENDING: "pending"
}

export const EVENT_DATE_STATUS = {
    PAST: "past",
    UPCOMING: "upcoming",
}

export const PUBLICATION_STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
    DELETED: "deleted"
}

export const EVENT_CATEGORY = {
    ACADEMIC: 'academic',
    ARTS: 'arts',
    CAREER: 'career',
    COMMUNITY: 'community',
    CULTURAL: 'cultural',
    FOOD: 'food',
    HEALTH: 'health',
    NETWORKING: 'networking',
    RECREATIONAL: 'recreational',
    SPORTS: 'sports',
    TECHNOLOGY: 'technology',
    TRAVEL: 'travel',
    WORKSHOPS: 'workshops'
};

export const ORDER_STATUS = {
    COMPLETED: 'completed',
    PENDING: 'pending',
    EXPIRED: 'expired',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PAID_FAILED_TICKETING: 'paid-failed-ticketing',
    PAID_FAILED_EMAIL: 'paid-failed-email',
}

export const TRANSACTION_STATUS = {
    PENDING: "pending",
    SUCCESSFUL: "successful",
    FAILED: "failed",
    CANCELLED: "cancelled",
};

export const PAYMENT_METHOD = {
    CARD: "card",
    BANK_TRANSFER: "bank_transfer",
    USSD: "ussd",
    MOBILE_MONEY: "mobile_money",
};
