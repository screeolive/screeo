import { config } from "dotenv";
config();

export const PORT = process.env.PORT || 3002;

export const OTP_SENDER_MAIL = process.env.OTP_SENDER_MAIL;