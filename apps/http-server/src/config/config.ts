import { config } from "dotenv";
config();

export const PORT = process.env.PORT || 3002;
export const JWT_USER_SECRET = process.env.JWT_USER_SECRET as string;

export const OTP_SENDER_MAIL = process.env.OTP_SENDER_MAIL;