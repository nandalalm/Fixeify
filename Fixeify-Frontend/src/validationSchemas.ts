import { z } from "zod";

export const nameSchema = z
  .string()
  .min(4, "Name must be at least 4 characters long")
  .regex(/^[A-Za-z\s]+$/, "Name can only contain letters and spaces")
  .trim();

export const emailSchema = z.string().email("Invalid email address").trim();

export const signupPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long")
  .regex(/[A-Z]/, "Password must include at least 1 uppercase letter")
  .regex(/[a-z]/, "Password must include at least 1 lowercase letter")
  .regex(/[0-9]/, "Password must include at least 1 number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must include at least 1 special character")
  .trim();

export const loginPasswordSchema = z.string().min(1, "Password is required").trim();

export const otpSchema = z.string().regex(/^\d{6}$/, "OTP must be a 6-digit number");

export const baseRegisterSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: signupPasswordSchema,
  confirmPassword: signupPasswordSchema,
  otp: otpSchema.optional(),
});

export const registerSchema = baseRegisterSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  role: z.enum(["user", "pro"], { message: "Role must be 'user' or 'pro'" }),
});