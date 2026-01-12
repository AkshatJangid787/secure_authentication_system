import { loginSchema, registerSchema } from "../config/zod.js";
import { redisClient } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import sanitize from "mongo-sanitize";
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getOtpHtml, getVerifyEmailHtml } from "../config/html.js";
import {User} from '../models/User.js'
import sendMail from "../config/sendMail.js";

export const registerUser = TryCatch(async (req, res) => {

    // Step 1: Validate raw body
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
        const zodError = validation.error;

        const allErrors = zodError.issues.map(issue => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
        }));

        return res.status(400).json({
            message: allErrors[0].message,
            error: allErrors,
        });
    }

    // Step 2: Sanitize only validated data
    const cleanData = sanitize(validation.data);

    const { name, email, password } = cleanData;

    const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;

    if(await redisClient.get(rateLimitKey)){
        return res.status(429).json({
            message: "Too many requests, try again later",
        });
    }

    const existingUser = await User.findOne({email});

    if(existingUser) {
        return res.status(400).json({
            message: "User already exists",
        });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const verifyToken = crypto.randomBytes(32).toString("hex");

    const verifyKey = `verify:${verifyToken}`

    const datatoStore = JSON.stringify({
        name,
        email,
        password: hashPassword,
    })

    await redisClient.set(verifyKey, datatoStore, {EX: 300})

    const subject = "verify your email for Account Creation";
    const html =  getVerifyEmailHtml({email, token: verifyToken})

    await sendMail({email, subject, html})

    await redisClient.set(rateLimitKey, "true", {EX: 60});


    res.json({
        message: "If your email is valid, a verification link has been sent. It will expire in 5 minutes",
    });
});


export const verifyUser = TryCatch(async(req, res)=>{
    const {token} = req.params;

    if(!token){
        return res.status(400).json({
            message: "verification token is required.",
        });
    }

    const verifyKey = `verify:${token}`;

    const userDataJson = await redisClient.get(verifyKey)

    if(!userDataJson){
        return res.status(400).json({
            message:"Verification Link is expired.",
        });
    }

    await redisClient.del(verifyKey);

    const userData = JSON.parse(userDataJson);

    const existingUser = await User.findOne({email: userData.email});

    if(existingUser) {
        return res.status(400).json({
            message: "User already exists",
        });
    }

    const newUser = await User.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
    });

    res.status(201).json({
        message: "Email Verified Successfully! Your Account has been created",
        user: {_id: newUser._id, name: newUser.name, email: newUser.email},
    })
});


