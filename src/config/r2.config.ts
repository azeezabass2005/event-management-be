import { S3Client } from '@aws-sdk/client-s3';

export class R2Config {
    private static instance: S3Client;

    public static getInstance(): S3Client {
        if (!R2Config.instance) {
            R2Config.instance = new S3Client({
                region: 'auto',
                endpoint: process.env.R2_ENDPOINT || 'https://your-account-id.r2.cloudflarestorage.com',
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
                },
            });
        }
        return R2Config.instance;
    }
}