// src/config/env.config.ts
import dotenv = require("dotenv");
import path = require("path");
import logger from '../utils/logger.utils';

/**
 * Environment configuration interface
 * @interface EnvConfig
 */
interface EnvConfig {
    /** Node environment (development, production, test) */
    NODE_ENV: string;
    /** Server port number */
    PORT: number;
    /** MongoDB connection URI */
    MONGODB_URI: string;
    /** JWT secret key */
    JWT_SECRET: string;
    /** JWT token expiration time */
    JWT_EXPIRES_IN: string;
    /** API version */
    API_VERSION: string;
    /** Cors origin */
    CORS_ORIGIN: string;
    /** Cookie Domain */
    COOKIE_DOMAIN: string;
    /** Rate limit window in minutes */
    RATE_LIMIT_WINDOW_MS: number;
    /** Maximum requests per window */
    RATE_LIMIT_MAX: number;
    /** Redis URL for caching */
    REDIS_URL?: string;
    /** Log level */
    LOG_LEVEL: string;
    /** Log retention days */
    LOG_RETENTION_DAYS: number;
    /** Flutterwave secret hash for webhook validation */
    FLUTTERWAVE_SECRET_HASH: string;
    FLUTTERWAVE_CLIENT_SECRET: string;
    FLUTTERWAVE_CLIENT_ID: string;

    /** Mail related credentials */
    MAIL_HOST: string;
    MAIL_PORT: string;
    MAIL_SECURE: string;
    MAIL_USERNAME: string;
    MAIL_PASSWORD: string;
    MAIL_FROM: string;
    EMAIL_TEMPLATES_PATH: string;
    PLATFORM_FEE_PERCENTAGE: string;
    FRONTEND_URL: string;
}

/**
 * Load environment variables based on current NODE_ENV
 * @function loadEnvConfig
 * @returns {EnvConfig} Environment configuration object
 */
const loadEnvConfig = (): EnvConfig => {
    const env = process.env.NODE_ENV || 'development';

    // Load environment-specific .env file
    const envPath = path.resolve(process.cwd(), `.env.${env}`);
    const defaultPath = path.resolve(process.cwd(), '.env');

    const envResult = dotenv.config({ path: envPath });
    const defaultResult = dotenv.config({ path: defaultPath });

    if (envResult.error && defaultResult.error) {
        logger.warn('No .env file found, using default values', {
            envPath,
            defaultPath
        });
    }

    const config = {
        NODE_ENV: env,
        PORT: parseInt(process.env.PORT || '3500', 10),
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name',
        JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-key',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
        API_VERSION: process.env.API_VERSION || 'v1',
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || 'undefined',
        RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        REDIS_URL: process.env.REDIS_URL || "",
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_RETENTION_DAYS: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
        FLUTTERWAVE_SECRET_HASH: process.env.FLUTTERWAVE_SECRET_HASH || 'lj3dfd4k5df5jld9ied3fn7df487rn2df',
        FLUTTERWAVE_CLIENT_ID: process.env.FLUTTERWAVE_CLIENT_ID || '1234',
        FLUTTERWAVE_CLIENT_SECRET: process.env.FLUTTERWAVE_CLIENT_SECRET || '',
        MAIL_HOST: process.env.MAIL_HOST || '',
        MAIL_PORT: process.env.MAIL_PORT || '',
        MAIL_SECURE: process.env.MAIL_SECURE || '',
        MAIL_USERNAME: process.env.MAIL_USERNAME || '',
        MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
        MAIL_FROM: process.env.MAIL_FROM || '',
        EMAIL_TEMPLATES_PATH: process.env.EMAIL_TEMPLATES_PATH || '',
        PLATFORM_FEE_PERCENTAGE: process.env.PLATFORM_FEE_PERCENTAGE || '1',
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'

    };

    // Log configuration on startup
    logger.info('Environment configuration loaded', {
        environment: config.NODE_ENV,
        apiVersion: config.API_VERSION,
        logLevel: config.LOG_LEVEL
    });

    return config;
};

const config = loadEnvConfig();

/**
 * Returns a safe cookie domain or undefined when running locally or when invalid.
 * - undefined prevents Express from setting an invalid domain option
 */
export const getCookieDomain = (): string | undefined => {
    const raw = process.env.COOKIE_DOMAIN || config.COOKIE_DOMAIN;

    if (!raw || raw === 'undefined') {
        return undefined;
    }

    const trimmed = raw.trim();

    // Do not set domain for localhost or IP addresses
    const isLocalhost = trimmed === 'localhost' || trimmed.endsWith('.localhost');
    const isIpAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(trimmed);

    if (isLocalhost || isIpAddress) {
        return undefined;
    }

    return trimmed;
};

export default config; 