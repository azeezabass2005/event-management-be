import {Router} from "express";
import authController from "../../controllers/base/public/auth.controller";
import webhookController from "../../controllers/base/public/webhook.controller";

const path = "/public";

const publicRouter = Router()

publicRouter.use(`${path}/auth`, authController)

publicRouter.use(`${path}/rosy-webhook`, webhookController)

export default publicRouter