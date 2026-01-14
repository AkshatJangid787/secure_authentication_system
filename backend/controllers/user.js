import { loginSchema, registerSchema } from "../config/zod.js";
import { redisClient } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import sanitize from "mongo-sanitize";
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getOtpHtml, getVerifyEmailHtml } from "../config/html.js";
import {User} from '../models/User.js'
import sendMail from "../config/sendMail.js";
import { generateAccessToken, generateToken, revokedRefreshToken, verifyRefreshToken } from "../config/generateToken.js";
import { generateCSRFToken } from "../config/csrfMiddleware.js";

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

export const loginUser = TryCatch(async(req, res)=>{
    const validation = loginSchema.safeParse(req.body);

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

    const { email, password } = cleanData;

    const rateLimitKey = `login-rate-limit:${req.ip}:${email}`

    if(await redisClient.get(rateLimitKey)){
        return res.status(429).json({
            message: "Too many requests, try again later",
        });
    }

    const user = await User.findOne({email})

    if(!user){
        return res.status(400).json({
            message:"Invalid credentials"
        })
    }

    const comparePassword = await bcrypt.compare(password, user.password);

    if(!comparePassword) {
       return res.status(400).json({
            message:"Invalid credentials"
        }) 
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;

    await redisClient.set(otpKey, JSON.stringify(otp), {
        EX: 300,
    });

    const subject = "otp for verification";
    const html = getOtpHtml({email, otp});

    await sendMail({email, subject, html});

    await redisClient.set(rateLimitKey, "true", {
        EX: 60,
    });

    res.json({
        message: "If your email is valid, an otp has been sent. it will be valid for 5 min",
    });
});

export const verifyOtp = TryCatch(async(req, res)=>{
    const {email, otp} = req.body;

    if(!email || !otp) {
        return res.status(400).json({
            message:"Please provide all details",
        });
    }

    const otpKey = `otp:${email}`;

    const storedOtpString = await redisClient.get(otpKey);

    if(!storedOtpString) {
        return res.status(400).json({
            message:"Otp expired",
        });
    }

    const storedOtp = JSON.parse(storedOtpString);

    if(storedOtp !== otp) {
        return res.status(400).json({
            message: "Invalid Otp",
        })
    }

    await redisClient.del(otpKey);

    let user = await User.findOne({ email });

    const tokenData = await generateToken(user._id, res);

    res.status(200).json({
        message: `Welcome ${user.name}`,
        user,
    });
});

export const myProfile = TryCatch(async(req, res)=>{
    const user = req.user;
    res.json(user);
});

export const refreshToken = TryCatch(async(req, res)=>{
    const refreshToken = req.cookies.refreshToken;
    
    if(!refreshToken){
        return res.status(401).json({
            message: "Invalid refresh token",
        });
    }

    const decode = await verifyRefreshToken(refreshToken)

    if(!decode) {
        return res.status(401).json({
            message: "Invalid refresh token",
        });
    }
    
    generateAccessToken(decode.id, res);

    res.status(200).json({
        message: "token refreshed",
    })
})

export const logoutUser = TryCatch(async(req, res)=>{
  const userId = req.user._id;

  await revokedRefreshToken(userId);

  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  res.clearCookie("csrfToken");

  await redisClient.del(`user:${userId}`);

  res.json({
    message: "Logged Out Successfully",
  });
});

export const refreshCSRF = TryCatch(async(req, res)=>{
    const userId = req.user._id
    const newCSRFToken = await generateCSRFToken(userId, res)

    res.json({
        message: "CSRF token refreshed",
        csrfToken: newCSRFToken,
    })
})