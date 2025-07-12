import { z } from "zod";

export const nameSchema = z
  .string()
  .min(4, "First name must be at least 4 characters long")
  .regex(/^[A-Za-z\s]+$/, "Name can only contain letters and spaces")
  .trim();

export const optionalNameSchema = z
  .string()
  .regex(/^[A-Za-z\s]*$/, "Name can only contain letters and spaces")
  .trim()
  .optional();

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

export const changePasswordSchema = z.object({
  currentPassword: loginPasswordSchema,
  newPassword: signupPasswordSchema,
  confirmNewPassword: signupPasswordSchema,
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New password and confirm password do not match",
  path: ["confirmNewPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password cannot be the same as the current password",
  path: ["newPassword"],
});

export const verifyCurrentPasswordSchema = z.object({
  currentPassword: loginPasswordSchema,
});

export const baseRegisterSchema = z.object({
  firstName: nameSchema,
  lastName: optionalNameSchema,
  email: emailSchema,
  password: signupPasswordSchema,
  confirmPassword: signupPasswordSchema,
  otp: otpSchema.optional(),
});

export const registerSchema = baseRegisterSchema
  .extend({
    name: z.string().min(4, "Full name must be at least 4 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  role: z.enum(["user", "pro"], { message: "Role must be 'user' or 'pro'" }),
});

export const resetPasswordSchema = z.object({
  newPassword: signupPasswordSchema,
  confirmNewPassword: signupPasswordSchema,
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New password and confirm password do not match",
  path: ["confirmNewPassword"],
});

export const bookingSchema = z.object({
  issueDescription: z
    .string()
    .min(10, "Issue description must be at least 10 characters long")
    .max(500, "Issue description cannot exceed 500 characters")
    .nonempty("Issue description is required")
    .trim(),
  location: z
    .object({
      address: z.string().nonempty("Address is required"),
      city: z.string().nonempty("City is required"),
      state: z.string().nonempty("State is required"),
      coordinates: z.object({
        type: z.literal("Point"),
        coordinates: z.tuple([z.number(), z.number()], {
          errorMap: () => ({ message: "Valid coordinates are required" }),
        }),
      }),
    })
    .nullable()
    .refine((val) => val !== null, { message: "Location is required" }),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .nonempty("Phone number is required")
    .trim(),
  preferredDate: z
    .string()
    .nonempty("Preferred date is required")
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      },
      { message: "Preferred date cannot be in the past" }
    ),
  preferredTime: z
    .array(
      z.object({
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format"),
        booked: z.boolean(),
      })
    )
    .min(1, "At least one time slot is required")
    .refine(
      (slots) => slots.every((slot) => !slot.booked),
      { message: "Selected time slots cannot be booked" }
    ),
});