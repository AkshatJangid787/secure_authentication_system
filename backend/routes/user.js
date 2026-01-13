import express from 'express'
import { loginUser, registerUser, verifyOtp, verifyUser } from '../controllers/user.js';

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify/:token", verifyUser);
router.post("/login", loginUser);
router.post("/verify", verifyOtp)

export default router;