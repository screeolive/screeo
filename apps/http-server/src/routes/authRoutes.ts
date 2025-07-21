import { Router } from "express";
import {
    signup
} from "../controllers/authControllers";

export const AuthRouter = Router();

AuthRouter.post("/signup", signup);