# ---------- Build stage ----------
    FROM node:18-alpine AS builder

    RUN npm install -g pnpm
    
    WORKDIR /app
    
    COPY package.json pnpm-lock.yaml* ./
    
    RUN pnpm install
    
    COPY . .
    
    RUN pnpm build
    
    # ---------- Production stage ----------
    FROM node:18-alpine
    
    RUN npm install -g pnpm
    
    WORKDIR /app
    
    # Build-time arguments
    ARG PORT=3500
    ARG MONGODB_URI
    ARG JWT_SECRET
    ARG JWT_EXPIRES_IN
    ARG API_VERSION
    ARG CORS_ORIGIN
    ARG COOKIE_DOMAIN
    ARG RATE_LIMIT_WINDOW_MS
    ARG RATE_LIMIT_MAX
    ARG LOG_LEVEL
    ARG LOG_RETENTION_DAYS
    
    ARG FLUTTERWAVE_CLIENT_ID
    ARG FLUTTERWAVE_CLIENT_SECRET
    ARG FLUTTERWAVE_SANDBOX_ENCRYPTION_KEY
    ARG FLUTTERWAVE_SECRET_HASH
    
    ARG MAIL_HOST
    ARG MAIL_PORT
    ARG MAIL_SECURE
    ARG MAIL_USERNAME
    ARG MAIL_PASSWORD
    ARG MAIL_FROM
    ARG EMAIL_TEMPLATES_PATH
    ARG ADMIN_EMAILS
    
    ARG PLATFORM_FEE_PERCENTAGE
    
    # Promote args to runtime environment variables
    ENV PORT=$PORT \
        MONGODB_URI=$MONGODB_URI \
        JWT_SECRET=$JWT_SECRET \
        JWT_EXPIRES_IN=$JWT_EXPIRES_IN \
        API_VERSION=$API_VERSION \
        CORS_ORIGIN=$CORS_ORIGIN \
        COOKIE_DOMAIN=$COOKIE_DOMAIN \
        RATE_LIMIT_WINDOW_MS=$RATE_LIMIT_WINDOW_MS \
        RATE_LIMIT_MAX=$RATE_LIMIT_MAX \
        LOG_LEVEL=$LOG_LEVEL \
        LOG_RETENTION_DAYS=$LOG_RETENTION_DAYS \
        FLUTTERWAVE_CLIENT_ID=$FLUTTERWAVE_CLIENT_ID \
        FLUTTERWAVE_CLIENT_SECRET=$FLUTTERWAVE_CLIENT_SECRET \
        FLUTTERWAVE_SANDBOX_ENCRYPTION_KEY=$FLUTTERWAVE_SANDBOX_ENCRYPTION_KEY \
        FLUTTERWAVE_SECRET_HASH=$FLUTTERWAVE_SECRET_HASH \
        MAIL_HOST=$MAIL_HOST \
        MAIL_PORT=$MAIL_PORT \
        MAIL_SECURE=$MAIL_SECURE \
        MAIL_USERNAME=$MAIL_USERNAME \
        MAIL_PASSWORD=$MAIL_PASSWORD \
        MAIL_FROM=$MAIL_FROM \
        EMAIL_TEMPLATES_PATH=$EMAIL_TEMPLATES_PATH \
        ADMIN_EMAILS=$ADMIN_EMAILS \
        PLATFORM_FEE_PERCENTAGE=$PLATFORM_FEE_PERCENTAGE
    
    # Copy only necessary files from builder
    COPY --from=builder /app/package.json .
    COPY --from=builder /app/pnpm-lock.yaml .
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/dist ./dist
    
    EXPOSE $PORT
    
    CMD ["pnpm", "start"]
    