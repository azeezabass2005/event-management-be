import BaseController from "../base-controller";
import {Request, Response, NextFunction} from "express";
import OrderService from "../../../services/order.service";
import {IUser} from "../../../models/interface";
import {orderCreateValidate} from "../../../validators";
import errorResponseMessage from "../../../common/messages/error-response-message";

/**
 * Controller handling operations related to ordering tickets
 * @class OrderController
 * @extends BaseController
 */
class OrderController extends BaseController {

    orderService: OrderService;

    constructor () {
        super();
        this.orderService = new OrderService();
        this.setupRoutes();
    }

    /**
     * Setup routes for order operations
     * @protected
     */
    protected setupRoutes(): void {
        // Route to create an order
        this.router.post("/", orderCreateValidate, this.createOrder.bind(this));

        // Route to get a single order, Maxima can you use this to
        this.router.get("/:id", this.getOrder.bind(this));
    }

    private async createOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const user = res.locals.user as IUser;
            const order = req.body;
            const paymentData = await this.orderService.createOrder(user, order);
            return this.sendSuccess(res, {...paymentData})
        } catch (error) {
            next(error)
        }
    }


    private async getOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const order = await this.orderService.findById(id!);
            if(!order) {
                next(errorResponseMessage.resourceNotFound('Order'));
                return;
            }
            return this.sendSuccess(res, {
                message: "Order retrieved successfully",
                order
            })
        } catch (error) {
            next(error)
        }
    }
}

export default new OrderController().router;