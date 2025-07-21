import express from "express";
import cors from "cors";
import {
    PORT
} from "./config/config";
import { AuthRouter } from "./routes/authRoutes";

const app = express();

const corsOptions = {
    origin: [
        'http://localhost:3000'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(express.json());
app.use(cors(corsOptions));

app.use("/api/v1/auth" , AuthRouter)


app.get("/", (req, res) => {
    res.send(`
        <h1 style="text-align: center;">Screeo's http Server is up and running!!</h1>
    `)
})


app.listen(PORT, () => {
    console.log(`HTTP BACKEND IS HOSTED : http://localhost:${PORT}`)
});