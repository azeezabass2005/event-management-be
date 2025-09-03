import loginValidate from './z-login';
import registerValidate, { validateUpdateUser as userUpdateValidate } from './z-register';
import eventCreateValidate, { validateUpdate as eventUpdateValidate, validatePublicationStatusUpdate as eventPublicationStatusValidate } from "./z-event";

export {
    loginValidate,
    registerValidate,
    userUpdateValidate,
    eventCreateValidate,
    eventUpdateValidate,
    eventPublicationStatusValidate,

}