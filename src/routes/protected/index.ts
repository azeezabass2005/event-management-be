import { Router, Request, Response, NextFunction } from "express";
import authMiddleware from "../../middlewares/auth.middleware";
import logsController from "../../controllers/base/protected/logs.controller";
import userController from "../../controllers/base/protected/user.controller";
import eventController from "../../controllers/base/protected/event.controller";
import orderController from "../../controllers/base/protected/order.controller";
import ticketController from "../../controllers/base/protected/ticket.controller";

const path = "/protected";
const protectedRouter = Router();

protectedRouter.use(path, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await authMiddleware.validateAuthorization(req, res, next);
        // next()
    } catch (error) {
        next(error);
    }
});


protectedRouter.use(`${path}/logs`, logsController);
protectedRouter.use(`${path}/users`, userController);
protectedRouter.use(`${path}/events`, eventController)
protectedRouter.use(`${path}/orders`, orderController)
protectedRouter.use(`${path}/tickets`,ticketController)
export default protectedRouter;