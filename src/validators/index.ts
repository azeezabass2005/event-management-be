import loginValidate from './z-login';
import registerValidate, { validateUpdateUser as userUpdateValidate } from './z-register';
import eventCreateValidate, { validateUpdate as eventUpdateValidate, validatePublicationStatusUpdate as eventPublicationStatusValidate, validateAddOrRemoveScanner as eventScannerAddOrRemoveValidate } from "./z-event";
import orderCreateValidate from './z-order'

export {
    loginValidate,
    registerValidate,
    userUpdateValidate,
    eventCreateValidate,
    eventUpdateValidate,
    eventPublicationStatusValidate,
    eventScannerAddOrRemoveValidate,
    orderCreateValidate,
}