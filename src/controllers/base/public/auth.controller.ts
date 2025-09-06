import {NextFunction, Request, Response} from "express";
import BaseController from "../base-controller";
import HashService from "../../../utils/hash.utils";
import TokenBuilder from "../../../utils/token.utils";
import errorResponseMessage, {ErrorResponseCode, ErrorSeverity} from "../../../common/messages/error-response-message";
import {IRefreshTokenPayload, TokenType} from "../../../utils/interface";
import {ROLE_MAP} from "../../../common/constant";
import RefreshTokenService from "../../../services/refresh.service";
import authMiddleware from "../../../middlewares/auth.middleware";
import {loginValidate, registerValidate} from "../../../validators";
import {IUser} from "../../../models/interface";
import config from "../../../config/env.config";

/**
 * Controller handling authentication-related operations
 * @class AuthController
 * @extends BaseController 
 */
class AuthController extends BaseController {
    private tokenBuilder: TokenBuilder;
    private refreshTokenService: RefreshTokenService;

    /**
     * Creates an instance of AuthController
     */
    constructor() {
        super();
        this.tokenBuilder = new TokenBuilder();
        this.refreshTokenService = new RefreshTokenService;
        this.setupRoutes();
    }

    /**
     * Sets up routes for authentication operations
     * @protected
     */
    protected setupRoutes(): void {
        // Registration route
        this.router.post("/register", registerValidate, this.register.bind(this));
        this.router.get("/me",authMiddleware.validateAuthorization.bind(authMiddleware),this.getCurrentUser.bind(this))
        // Login route
        this.router.post("/login", loginValidate, this.login.bind(this));

        // Verify email route
        this.router.post("/verify-email", this.verifyEmail.bind(this));

        // Request password reset route
        this.router.post("/forgot-password", this.forgotPassword.bind(this));

        // Reset password route
        this.router.post("/reset-password", this.resetPassword.bind(this));

        // Refresh token route
        this.router.post("/refresh-token", this.refreshToken.bind(this));

        // Logout route
        // TODO: I can migrate this protected route later, but for now just dey here.
        this.router.post("/logout-all",
            authMiddleware.validateAuthorization.bind(authMiddleware),
            this.logoutAll.bind(this)
        );
    }

    /**
     * Registers a new user
     * @private
     */
    private async register (req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password, firstName, lastName, phoneNumber } = req.body;

            const existingUser = await this.userService.findOne({
                email: email
            });

            console.log(existingUser, "This is the existing user")

            if (existingUser) {
                return next(errorResponseMessage.createError(
                    ErrorResponseCode.RESOURCE_ALREADY_EXISTS,
                    "Email already exists",
                    ErrorSeverity.MEDIUM
                ));
            }

            const hashedPassword = await HashService.hashPassword(password);

            const user = await this.userService.save({
                email,
                firstName,
                lastName,
                phoneNumber,
                password: hashedPassword.password,
                isVerified: false
            });

            // Generate verification token
            // const verificationToken = this.tokenBuilder.build().createVerifyToken({
            //     userId: user._id as string,
            //     email: user.email, 
            //     username: user.username
            // });
             const token =  this.tokenBuilder.build().createToken(user)
                res.cookie('accessToken',token,{
                    httpOnly:true,
                    secure:false,
                    sameSite:'lax',
                    maxAge:24*60*60*1000
                })
            // TODO: Send verification email
            // await emailService.sendVerificationEmail(email, verificationToken);

            this.sendSuccess(res, {
                message: "Registration successful. Please verify your email.",
                userId: user._id
            }, 201);
        } catch (error) {
            return next(error);
        }
    }

   /**
    * 
    check the current user and the access token in the cookies 
    */
   private async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokenString = req.cookies?.accessToken;
    if (!tokenString) {
      return next(errorResponseMessage.unauthorized("Missing token"));
    }

    const token = new TokenBuilder().setToken(tokenString).build();
    const { data }: any = await token.verifyToken();

    if (!data?.userId || !data?.email) {
      return next(errorResponseMessage.unauthorized("Invalid token"));
    }

    // fetch user from DB
    const user = await this.userService.findOne({ _id: data.userId, email: data.email });
    if (!user) {
      return next(errorResponseMessage.unauthorized("User not found"));
    }

    const { password, ...userData } = user.toJSON();
    this.sendSuccess(res, { user: userData });
  } catch (error) {
    return next(error);
  }
}
     /**
     * Authenticates a user and returns access token
     * @private
     */
    /**
     */
    private async login (req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return next(errorResponseMessage.payloadIncorrect("Email and password are required"));
            }

            const user = await this.userService.findOne({ email });
            if (!user) {
                return next(errorResponseMessage.unauthorized("Invalid credentials"));
            }

            if (user.status !== 'active') {
                return next(errorResponseMessage.unauthorized(`Login failed because your account has been ${user.status}. Reach out to support@solutionpay.co for further info`));
            }

            const isValidPassword = await HashService.verifyPassword(
                password,
                user.password
            );

            if (!isValidPassword) {
                return next(errorResponseMessage.unauthorized("Invalid credentials"));
            }

            if(!user?.isCompleted) {
                return this.sendSuccess(res, {
                    message: "Registration not completed. Redirecting to completion step",
                    not_completed: true,
                    userId: user._id
                });
            }

            // TODO: I will handle this if at all we are doing email verification
            // if (!user.isVerified) {
            //     next(errorResponseMessage.unauthorized("Please verify your email first"));
            //     return;
            // }

            const accessToken = this.tokenBuilder.build().createToken(user, {
                type: TokenType.ACCESS,
                expiresIn: '1h'
            });

            const refreshToken = this.tokenBuilder.build().createToken(user, {
                type: TokenType.REFRESH,
                expiresIn: '7d'
            });

            console.log(accessToken, "This is the access token");
            console.log(refreshToken, "This is the refresh token")

            const decodedRefresh = await this.tokenBuilder
                .setToken(refreshToken)
                .build()
                .verifyToken();

            console.log(decodedRefresh, "This is the decoded refresh token");

            if(decodedRefresh) {
                await this.refreshTokenService.saveRefreshToken(
                    user._id as string,
                    refreshToken,
                    req.headers['user-agent'],
                    req.ip
                );
            }

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: config.NODE_ENV === 'production',
                sameSite: 'lax',
                path: "/",
                maxAge: 60 * 60 * 1000,
                domain: config.COOKIE_DOMAIN,
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: config.NODE_ENV === 'production',
                sameSite: 'lax',
                path: "/",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                domain: config.COOKIE_DOMAIN,
            });

            res.cookie('role', Object.entries(ROLE_MAP).find(([_, v]) => v === user.role)?.[0], {
                httpOnly: false, // Allow client-side access (if needed)
                secure: config.NODE_ENV === 'production',
                sameSite: 'lax',
                path: "/",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                domain: config.COOKIE_DOMAIN,
            });

            this.sendSuccess(res, {
                accessToken,
                refreshToken,
                message: "You are successfully logged in.",
                user: {
                    id: user._id,
                    email: user.email,
                    role: Object.entries(ROLE_MAP).find(([_, v]) => v === user.role)?.[0]
                }
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Verifies user's email address
     * @private
     */
    private async verifyEmail (req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token } = req.body;

            if (!token) {
                return next(errorResponseMessage.payloadIncorrect("Verification token is required"));
            }

            const decoded = await this.tokenBuilder
                .setToken(token)
                .build()
                .verifyToken();

            if (decoded.type !== TokenType.VERIFY) {
                return next(errorResponseMessage.unauthorized("Invalid verification token"));
            }

            const user = await this.userService.updateById(decoded.data.userId, {
                isVerified: true
            });

            if (!user) {
                return next(errorResponseMessage.resourceNotFound("User"));
            }

            this.sendSuccess(res, {
                message: "Email verified successfully"
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Initiates password reset process
     * @private
     */
    private async forgotPassword (req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                return next(errorResponseMessage.payloadIncorrect("Email is required"));
            }

            const user = await this.userService.findOne({ email });

            // If the email exists of not, it's always success due to security issues
            this.sendSuccess(res, {
                message: "If your email exists, you will receive a password reset link"
            });

            if (user) {
                // Generate reset token
                // const resetToken = this.tokenBuilder.build().createToken(user, {
                //     type: TokenType.RESET,
                //     expiresIn: '1h'
                // });

                // TODO: Send password reset email
                // await emailService.sendPasswordResetEmail(email, resetToken);
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Resets user's password
     * @private
     */
    private async resetPassword (req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return next(errorResponseMessage.payloadIncorrect("Token and new password are required"));
            }

            const decoded = await this.tokenBuilder
                .setToken(token)
                .build()
                .verifyToken();

            if (decoded.type !== TokenType.RESET) {
                return next(errorResponseMessage.unauthorized("Invalid reset token"));
            }

            const hashedPassword = await HashService.hashPassword(newPassword);

            const user = await this.userService.updateById(decoded.data.userId, {
                password: hashedPassword.password
            });

            if (!user) {
                return next(errorResponseMessage.resourceNotFound("User"));
            }

            this.sendSuccess(res, {
                message: "Password reset successful"
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Refreshes access token using refresh token
     * @private
     */
    private async refreshToken (req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return next(errorResponseMessage.payloadIncorrect("Refresh token is required"));
            }

            // Verify refresh token
            const decoded = await this.tokenBuilder
                .setToken(refreshToken)
                .build()
                .verifyToken();

            if (decoded.type !== TokenType.REFRESH) {
                return next(errorResponseMessage.unauthorized("Invalid refresh token"));
            }

            const refreshPayload = decoded.data as IRefreshTokenPayload;

            // Verify token exists in database and is valid
            const tokenDoc = await this.refreshTokenService.findValidToken(refreshPayload.tokenId);
            if (!tokenDoc) {
                return next(errorResponseMessage.unauthorized("Invalid refresh token"));
            }

            // Find user
            const user = await this.userService.findById(refreshPayload.userId);
            if (!user) {
                return next(errorResponseMessage.resourceNotFound("User"));
            }

            // Revoke current refresh token
            await this.refreshTokenService.revokeToken(refreshPayload.tokenId);

            // Generate new tokens
            const tokenInstance = this.tokenBuilder.build();

            const newAccessToken = tokenInstance.createToken(user, {
                type: TokenType.ACCESS,
                expiresIn: '15m'
            });

            const newRefreshToken = this.tokenBuilder.build().createToken(user, {
                type: TokenType.REFRESH,
                expiresIn: '7d'
            });

            // Save new refresh token
            const newDecodedRefresh = await this.tokenBuilder
                .setToken(newRefreshToken)
                .build()
                .verifyToken();


            await this.refreshTokenService.saveRefreshToken(
                user._id as string,
                (newDecodedRefresh.data as IRefreshTokenPayload).tokenId,
                req.headers['user-agent'],
                req.ip
            );

            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,  // Secure, not accessible via JS
                secure: config.NODE_ENV === 'production',
                sameSite: config.NODE_ENV === 'production'?'lax':"none",
                maxAge: 60 * 60 * 1000,  // 1 hour
                domain: config.COOKIE_DOMAIN,
                path: "/"
            });

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: config.NODE_ENV === 'production',
                sameSite: config.NODE_ENV === 'production'?'lax':"none",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                domain: config.COOKIE_DOMAIN,
                path: "/"
            });

            this.sendSuccess(res, {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Logs out the user from all sessions by revoking all their refresh tokens.
     * @private
     */
    private async logoutAll (_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Get the user ID from the request (added by auth middleware)
            const user = res.locals.user;

            if (!user._id) {
                return next(errorResponseMessage.unauthorized("User not authenticated"));
            }

            // Revoke all refresh tokens for the user
            await this.refreshTokenService.revokeAllUserTokens(user._id);

            // Clear cookies
            res.clearCookie('accessToken', {
                domain: config.COOKIE_DOMAIN,
                secure: config.NODE_ENV === 'production',
                sameSite: 'lax',
                path: "/",
                httpOnly: true,
            });

            res.clearCookie('refreshToken', {
                domain: config.COOKIE_DOMAIN,
                secure: config.NODE_ENV === 'production',
                sameSite: 'lax',
                path: "/",
                httpOnly: true,
            });

            res.clearCookie('role', {
                domain: config.COOKIE_DOMAIN,
                secure: config.NODE_ENV === 'production',
                sameSite: 'lax',
                path: "/",
                httpOnly: false
            });

            this.sendSuccess(res, {
                message: "Logged out from all sessions successfully"
            });
        } catch (error) {
            return next(error);
        }
    };

}

export default new AuthController().router;