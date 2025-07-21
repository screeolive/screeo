import { Router } from "express";
import {
    logout,
    signin,
    signup,
    verify_mail
} from "../controllers/authControllers";

export const AuthRouter = Router();

AuthRouter.post("/signup", signup);
AuthRouter.post("/verify-mail", verify_mail);

AuthRouter.post("/signin", signin);
AuthRouter.post("/logout", logout)