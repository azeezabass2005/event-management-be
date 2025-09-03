import {Router} from "express";
import authController from "../../controllers/base/public/auth.controller";

const path = "/public";

const publicRouter = Router()

publicRouter.use(`${path}/auth`, authController)

export default publicRouter