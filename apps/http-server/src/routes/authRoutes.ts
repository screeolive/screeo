import { Router } from "express";
import {
    signup,
    verify_mail
} from "../controllers/authControllers";

export const AuthRouter = Router();

AuthRouter.post("/signup", signup);
AuthRouter.post("/verify-mail", verify_mail); 