import axios from "axios";
import errorResponseMessage from "../common/messages/error-response-message";
import * as crypto from "node:crypto";
import { randomUUID } from "crypto";
import config from "../config/env.config";
import {IEvent, IOrder, ITransaction, IUser} from "../models/interface";
import {FlutterwaveCustomer, FlutterwaveVirtualAccount} from "../types/payment.type";
import UserService from "./user.service";
import TransactionService from "./transaction.service";

class PaymentService {
    accessToken?: string;
    expiresIn?: number;
    lastTokenRefreshTime?: number;
    userService: UserService;
    transactionService: TransactionService;

    constructor() {
        this.userService = new UserService();
        this.transactionService = new TransactionService();
    }

    private async authenticate ()  {
        const response = await axios.post(
            'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
            new URLSearchParams({
                client_id: config.FLUTTERWAVE_CLIENT_ID,
                client_secret: config.FLUTTERWAVE_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        if(!response) {
            throw errorResponseMessage.unableToComplete('Failed to initialize payment');
        }
        console.log(response, "This is the response from authenticate")
        const { access_token, expires_in, refresh_expires_in, token_type, scope  } = response.data;
        this.accessToken = access_token;
        this.expiresIn = expires_in;
        this.lastTokenRefreshTime = Date.now();
    }

    /**
     * Ensures that anytime you get the accessToken, it's always valid.
     * @private
     */
    private async getAccessToken(): Promise<string> {
        if (
            !this.accessToken ||
            !this.expiresIn ||
            !this.lastTokenRefreshTime ||
            Date.now() - this.lastTokenRefreshTime >= this.expiresIn * 1000
        ) {
            await this.authenticate();
        }
        return this.accessToken!;
    }

    public isValidWebhook(rawBody: any, signature: any) {
        const hash = crypto
            .createHmac('sha256', config.FLUTTERWAVE_SECRET_HASH)
            .update(rawBody)
            .digest('base64');

        return hash === signature;
    }

    private async createCustomer(firstName: string, lastName: string, email: string): Promise<FlutterwaveCustomer> {
        const token = await this.getAccessToken();
        const idempotencyKey = randomUUID(); // unique key for retry safety

        const response = await axios.post(
            "https://api.flutterwave.cloud/developersandbox/customers",
            {
                name: {
                    first: firstName,
                    last: lastName,
                },
                email: email
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Idempotency-Key": idempotencyKey,
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        console.log(response.data, "This is the createCustomer response");

        return response.data.data as FlutterwaveCustomer;
    }

    private async createVirtualAccount(
        orderId: string,
        customerId: string,
        amount: number,
        narration: string,
        expiryMinutes = 60,
        currency = "NGN"
    ): Promise<FlutterwaveVirtualAccount> {
        const token = await this.getAccessToken();
        const idempotencyKey = randomUUID();

        const response = await axios.post(
            "https://api.flutterwave.cloud/developersandbox/virtual-accounts",
            {
                reference: orderId,
                customer_id: customerId,
                expiry: expiryMinutes,
                amount,
                currency,
                account_type: "dynamic",
                narration
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Idempotency-Key": idempotencyKey,
                    "X-Scenario-Key": "scenario:successful",
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log(response.data, "This is the createVirtualAccount response");

        return response.data.data as FlutterwaveVirtualAccount;
    }

    /**
     * It generates the information needed for the payment of an order
     * @param user
     * @param order
     */
    public async generateOrderPayment(user: Partial<IUser>, order: Partial<IOrder>): Promise<{ virtualAccount: FlutterwaveVirtualAccount, transaction: ITransaction, order: Partial<IOrder> }> {
        let flutterwaveCustomerId = user?.flutterwaveCustomerId;
        if(!flutterwaveCustomerId) {
            const customer = await this.createCustomer(user.firstName!, user.lastName!, user.email!);
            await this.userService.updateById(user?._id! as string, { flutterwaveCustomerId: customer.id });
            flutterwaveCustomerId = customer.id;
        }

        const virtualAccount = await this.createVirtualAccount(order?._id! as string, flutterwaveCustomerId, order.totalPrice!, `${user.firstName!} ${user.lastName!} payment for ${order.numberOfTicket!} ${order.numberOfTicket! > 1 ? "tickets" : "ticket"}`)

        const transaction = await this.transactionService.create({
            order: order._id,
            user: user._id,
            reference: order._id?.toString(),
            amount: order.totalPrice,
            currency: "NGN",
            paymentMethod: "bank_transfer",
            status: "pending",
            virtualAccount: {
                accountNumber: virtualAccount.account_number,
                bankName: virtualAccount.account_bank_name,
                expiryDate: new Date(virtualAccount.account_expiration_datetime),
            },
            metadata: virtualAccount,
        });

        return { virtualAccount, transaction, order }
    }

    public async verifyTransaction(webhook_data_id: string) {
        try {
            const token = await this.getAccessToken();

            const response = await axios.get(
                `https://api.flutterwave.cloud/developersandbox/charges/${webhook_data_id}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            console.log(response.data, "Verify transaction response");

            return response.data
        } catch (error: any) {
            console.error("Error verifying transaction:", error.response?.data || error.message);
            throw errorResponseMessage.unableToComplete("Transaction verification failed");
        }
    }

}

export default PaymentService;