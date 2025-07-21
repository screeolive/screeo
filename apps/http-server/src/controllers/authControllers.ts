import { Request, Response } from "express";
import { signupValidationSchema } from "../lib/zod_schema";
import type { ZodError } from "zod";
import bcrypt from "bcrypt";
import prisma from "../db/prisma";
import { send_otp_test } from "../services/send_otp_for_signup";
import { MAIL_VERIFICATION } from "../services/verify_mail";

export const signup = async (req: Request, res: Response) => {
    try {
        const result = signupValidationSchema.safeParse(req.body);

        // If validation fails, return an error

        if (!result.success) {
            const error = result.error as ZodError;

            const formattedErrors = error.issues.map((issue) => ({
                field: issue.path.join(".") || "form",
                message: issue.message,
            }));

            res.status(400).json({
                message: "Validation failed",
                errors: formattedErrors,
            });
            return;
        }

        const { username, email, password } = result.data;

        // Checking if user already exists
        const user_existance = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (user_existance) {
            res.status(400).json({
                message: `User already exists with email ${email}`
            })
            return;
        }

        // Hashing the password!, storing the user's credentials securelyy!!

        const hashed_password = await bcrypt.hash(password, 10);

        // generating otp and storing the user to db along with the generated otp!
        const otpGenerated = Math.floor(100000 + Math.random() * 900000).toString();

        // Create the user first
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashed_password,
                verification_otp: otpGenerated,
            },
        });

        // SEND OTP TOP USER's MAIL FOR VERIFICATION:
        // Attempting to send the OTP email
        const emailSent = await send_otp_test(email, otpGenerated);

        // Check if the email failed to send
        if (!emailSent) {
            // If email sending fails, we must "roll back" the user creation.
            // This will prevent having unverified users stuck in the database.
            await prisma.user.delete({
                where: {
                    id: newUser.id,
                },
            });

            // Return an error to the client.
            console.error(`Failed to send OTP to ${email}. User creation rolled back.`);
            res.status(500).json({
                message: "Could not send verification email. Please try signing up again.",
                success: false,
            });
            return;
        }

        // If email was sent successfully, respond to the client.
        res.status(201).json({
            message: `OTP Sent to ${newUser.email} for verification!`,
            success: true,
        });
        return;

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something Went Wrong During Signup"
        });
        return;
    }
}

export const verify_mail = async (req: Request, res: Response) => {
    const { email, otpEntered } = req.body;
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });

    if (user?.email === email) {
        MAIL_VERIFICATION(otpEntered, email, res)
    }
    else {
        res.status(400).json({
            message: "Enter the email which you entered while SignUp!"
        });
        return;
    }
}