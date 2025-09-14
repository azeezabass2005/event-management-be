import {Router} from "express";
import { Request,Response,NextFunction } from "express";
import authController from "../../controllers/base/public/auth.controller";
import webhookController from "../../controllers/base/public/webhook.controller";

const path = "/public";

const publicRouter = Router()

publicRouter.use(`${path}/auth`, authController)
// publicRouter.use(`${path}/event`,eventController)
publicRouter.get('/public/event/ping',(_req:Request,res:Response,next:NextFunction)=>{
    res.json({ok:"true"})
    
})

publicRouter.use(`${path}/rosy-webhook`, webhookController)

export default publicRouter