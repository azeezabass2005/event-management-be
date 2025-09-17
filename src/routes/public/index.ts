import {Router} from "express";
import { Request,Response,NextFunction } from "express";
import authController from "../../controllers/base/public/auth.controller";
import eventController from "../../controllers/base/public/event.controller";
import webhookController from "../../controllers/base/public/webhook.controller";

const path = "/public";

const publicRouter = Router()

publicRouter.get(`${path}/event/ping`, (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ ok: "true" })
});

publicRouter.use(`${path}/auth`, authController)
publicRouter.use(`${path}/event`, eventController)

publicRouter.use(`${path}/rosy-webhook`, webhookController)

export default publicRouter