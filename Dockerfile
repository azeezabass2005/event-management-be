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
    
    # Copy only necessary files from builder
    COPY --from=builder /app/package.json .
    COPY --from=builder /app/pnpm-lock.yaml .
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/dist ./dist
    
    EXPOSE 3500
    
    CMD ["pnpm", "start"]
    