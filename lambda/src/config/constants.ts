import * as dotenv from 'dotenv';

dotenv.config();

export const HOOKBIN_URL = process.env.HOOKBIN_URL!;
export const DB_HOST = process.env.DB_HOST!;
export const DB_PORT = parseInt(process.env.DB_PORT || '5432');
export const DB_USERNAME = process.env.DB_USERNAME!;
export const DB_PASSWORD = process.env.DB_PASSWORD!;
export const DB_DATABASE = process.env.DB_DATABASE!;
export const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;
