import { z } from 'zod';
import { CATEGORY_NAMES, CONDITION_NAMES } from '../data/categories';

export const basicInfoSchema = z.object({
  title: z
    .string()
    .min(10, { message: "Title must be at least 10 characters long." })
    .max(100, { message: "Title cannot exceed 100 characters." }),
  description: z
    .string()
    .min(20, { message: "Description must be at least 20 characters long." })
    .max(2000, { message: "Description cannot exceed 2000 characters." }),
  category: z
    .enum(CATEGORY_NAMES, { message: "Please select a valid category from the list." })
    .refine((val) => val && val.length > 0, { message: "Please select a valid category." }),
  condition: z
    .enum(CONDITION_NAMES, { message: "Please select a valid condition." })
    .refine((val) => val && val.length > 0, { message: "Please select the item condition." }),
  images: z
    .array(z.any())
    .min(1, { message: "Please upload at least one clear image of your item." })
    .max(5, { message: "You can upload a maximum of 5 images." }),
});

export const pricingSchema = z.object({
  pricePerDay: z
    .string()
    .min(1, { message: "Price per day is required." })
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: "Price per day must be greater than 0." }),
  pricePerWeek: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: "Price per week must be greater than 0." }),
  pricePerMonth: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: "Price per month must be greater than 0." }),
  securityDeposit: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, { message: "Security deposit cannot be negative." }),
  minRentalDays: z
    .number({ invalid_type_error: "Minimum rental days must be a number." })
    .int()
    .min(1, { message: "Minimum rental days must be at least 1." }),
  maxRentalDays: z
    .number({ invalid_type_error: "Maximum rental days must be a number." })
    .int()
    .min(1, { message: "Maximum rental days must be at least 1." }),
}).refine((data) => data.maxRentalDays >= data.minRentalDays, {
  message: "Maximum rental days cannot be less than minimum rental days.",
  path: ["maxRentalDays"],
});

export const locationSchema = z.object({
  state: z
    .string()
    .min(1, { message: "Please select a state from the dropdown." }),
  city: z
    .string()
    .min(1, { message: "Please select a city from the dropdown." }),
  address: z
    .string()
    .optional()
    .nullable(),
  pincode: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, { message: "Please enter a valid 6-digit Indian pincode." })
    .optional()
    .nullable(),
  coordinates: z
    .array(z.number())
    .length(2)
    .optional()
    .nullable(),
});
