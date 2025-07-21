import { Request, Response } from "express";
import { signupValidationSchema } from "../lib/zod_schema";
import type { ZodError } from "zod";

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

        const data = result.data;

        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something Went Wrong During Signup"
        });
        return;
    }
}