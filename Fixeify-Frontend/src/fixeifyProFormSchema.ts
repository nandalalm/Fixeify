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

// New schemas for FixeifyProForm
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

const customSkillSchema = z
  .string()
  .regex(/^[A-Za-z\s]+$/, "Custom Skill must contain only letters and spaces")
  .min(4, "Must be at least 4 characters long")
  .trim()
  .optional();

const locationSchema = z
  .string()
  .regex(/^[\w\s.,-]+$/, "Location can only contain letters, numbers, spaces, commas, periods, and hyphens")
  .min(10, "Location must be at least 10 characters long")
  .trim()
  .optional();

const workingHoursSchema = z
  .string()
  .regex(/^[\w\s.,-]+$/, "Working Hours can only contain letters, numbers, spaces, commas, periods, and hyphens")
  .trim()
  .optional();

const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.type.startsWith("image/"), "Only images are allowed");

const profilePhotoSchema = imageFileSchema.refine(
  (file) => file instanceof File,
  "Profile photo is required"
);

const idProofSchema = z
  .array(imageFileSchema)
  .nonempty("At least one ID proof image is required")
  .refine((files) => files.every((file) => file.type.startsWith("image/")), "Only images are allowed");

const availabilitySchema = z
  .object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),
  })
  .refine(
    (data) =>
      data.monday ||
      data.tuesday ||
      data.wednesday ||
      data.thursday ||
      data.friday ||
      data.saturday ||
      data.sunday,
    "Please select at least one available day"
  );

export const fixeifyProFormSchema = z.object({
  firstName: nameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
  serviceType: z.string().min(1, "Service type is required"),
  customService: customServiceSchema,
  skills: z.array(z.string()).nonempty("At least one skill is required"),
  customSkill: customSkillSchema,
  location: locationSchema,
  profilePhoto: profilePhotoSchema,
  idProof: idProofSchema,
  accountHolderName: nameSchema.optional().or(z.literal("")),
  accountNumber: accountNumberSchema,
  bankName: bankNameSchema,
  workingHours: workingHoursSchema,
  availability: availabilitySchema,
});