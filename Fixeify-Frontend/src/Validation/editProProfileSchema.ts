import { z } from "zod";

export const nameSchema = z
  .string()
  .min(4, "Name must be at least 4 characters long")
  .regex(/^[A-Za-z\s]+$/, "Name can only contain letters and spaces")
  .trim();

export const lastNameSchema = z
  .string()
  .regex(/^[A-Za-z\s]+$/, "Last Name can only contain letters and spaces")
  .trim()
  .optional()
  .or(z.literal(""));

export const phoneNumberSchema = z
  .string()
  .length(10, "Phone Number must be exactly 10 digits")
  .regex(/^\d+$/, "Phone Number must contain only numbers")
  .trim();

export const locationSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "Please provide a valid address"),
  city: z
    .string()
    .trim()
    .min(1, "Please provide the city"),
  state: z
    .string()
    .trim()
    .min(1, "Please provide the state"),
  coordinates: z.object({
    type: z.literal("Point"),
    coordinates: z
      .tuple([z.number(), z.number()])
      .refine(
        ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
        "Invalid longitude or latitude"
      ),
  }),
});

export const aboutSchema = z
  .string()
  .max(500, "About section cannot exceed 500 characters")
  .trim()
  .optional()
  .nullable();

export const editProProfileSchema = z.object({
  firstName: nameSchema,
  lastName: lastNameSchema,
  phoneNumber: phoneNumberSchema,
  location: locationSchema,
  profilePhoto: z.string().min(1, "Profile photo is required"),
  about: aboutSchema,
});