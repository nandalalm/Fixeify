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

export const emailSchema = z.string().email("Invalid email address").trim();

const phoneNumberSchema = z
  .string()
  .length(10, "Phone Number must be exactly 10 digits")
  .regex(/^\d+$/, "Phone Number must contain only numbers")
  .trim();

const accountNumberSchema = z
  .string()
  .length(11, "Account Number must be exactly 11 digits")
  .regex(/^\d+$/, "Account Number must contain only numbers")
  .trim();

const bankNameSchema = z
  .string()
  .min(3, "Bank Name must be at least 3 characters long")
  .regex(/^[A-Za-z\s]+$/, "Bank Name can only contain letters and spaces")
  .trim()
  .optional();

const customServiceSchema = z
  .string()
  .regex(/^[A-Za-z\s]+$/, "Custom Service must contain only letters and spaces")
  .min(4, "Must be at least 4 characters long")
  .trim()
  .optional();

const locationSchema = z.object({
  city: z
    .string()
    .regex(/^[\w\s.,-]+$/, "City can only contain letters, numbers, spaces, commas, periods, and hyphens")
    .trim()
    .min(1, "City is required"),
  state: z
    .string()
    .regex(/^[\w\s.,-]+$/, "State can only contain letters, numbers, spaces, commas, periods, and hyphens")
    .trim()
    .min(1, "State is required"),
  country: z
    .string()
    .regex(/^[\w\s.,-]+$/, "Country can only contain letters, numbers, spaces, commas, periods, and hyphens")
    .trim()
    .min(1, "Country is required"),
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

const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.type.startsWith("image/"), "Only images are allowed");

const profilePhotoSchema = z.union([
  imageFileSchema,
  z.string().url("Invalid profile photo URL").min(1, "Profile photo is required"),
]).refine((val) => val !== null && val !== undefined, "Profile photo is required");

const idProofSchema = z.union([
  z.array(imageFileSchema).nonempty("At least one ID proof image is required"),
  z.array(z.string().url("Invalid ID proof URL")).nonempty("At least one ID proof URL is required"),
]);

const timeSlotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format (00:00-23:59)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format (00:00-23:59)"),
}).refine(
  ({ startTime, endTime }) => {
    const startMinutes = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]);
    const endMinutes = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
    return endMinutes > startMinutes;
  },
  { message: "End time must be after start time" }
);

const availabilitySchema = z
  .object({
    monday: z.array(timeSlotSchema).optional(),
    tuesday: z.array(timeSlotSchema).optional(),
    wednesday: z.array(timeSlotSchema).optional(),
    thursday: z.array(timeSlotSchema).optional(),
    friday: z.array(timeSlotSchema).optional(),
    saturday: z.array(timeSlotSchema).optional(),
    sunday: z.array(timeSlotSchema).optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((slots) => Array.isArray(slots) && slots.length > 0),
    "Please select at least one day with valid time slots"
  );

export const fixeifyProFormSchema = z.object({
  firstName: nameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
  categoryId: z.string().min(1, "Category is required"),
  customService: customServiceSchema,
  location: locationSchema.nullable().refine((val) => val !== null, {
    message: "Please provide your location",
  }),
  profilePhoto: profilePhotoSchema,
  idProof: idProofSchema,
  accountHolderName: nameSchema.optional().or(z.literal("")),
  accountNumber: accountNumberSchema,
  bankName: bankNameSchema,
  availability: availabilitySchema,
});