import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT || 8000,
  password_salt: process.env.PASSWORD_SALT || "12",
  jwt: {
    secret: process.env.JWT_SECRET,
    expires_in: process.env.EXPIRES_IN,
    refresh_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
    reset_pass_secret: process.env.RESET_PASS_TOKEN,
    reset_pass_expires_in: process.env.RESET_PASS_TOKEN_EXPIRES_IN,
  },
  groq: {
    api_key: process.env.GROQ_API_KEY || "",
  },
  emailSender: {
    email: process.env.EMAIL_SENDER_EMAIL || "",
    app_pass: process.env.EMAIL_SENDER_APP_PASS || "",
  },
  stripe: {
    secret_key: process.env.STRIPE_SECRET_KEY || "",
    public_key: process.env.STRIPE_PUBLIC_KEY || "",
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
};
