import { z } from "zod"

export const adminPromoCodeSchema = z.object({
    code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
    discountType: z.enum(["fixed", "percentage"], {
        required_error: "Please select a discount type",
    }),
    discountValue: z.number().positive("Discount value must be positive"),
    startDate: z.date({
        required_error: "Start date is required",
    }),
    endDate: z.date({
        required_error: "End date is required",
    }),
    canBeUsed: z.number().min(1, "Usage limit must be at least 1"),
    academicId: z.number().nullable(),
}).refine((data) => data.startDate < data.endDate, {
    message: "End date must be after start date",
    path: ["endDate"],
})

// New schema for create functionality with multiple academies
export const adminPromoCodeCreateSchema = z.object({
    code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
    discountType: z.enum(["fixed", "percentage"], {
        required_error: "Please select a discount type",
    }),
    discountValue: z.number().positive("Discount value must be positive"),
    startDate: z.date({
        required_error: "Start date is required",
    }),
    endDate: z.date({
        required_error: "End date is required",
    }),
    canBeUsed: z.number().min(1, "Usage limit must be at least 1"),
    selectionMode: z.enum(["general", "specific"], {
        required_error: "Please select whether this is a general or specific academy promo code",
    }),
    academicIds: z.array(z.number()).nullable(), // Array of academy IDs or null for general
}).refine((data) => data.startDate < data.endDate, {
    message: "End date must be after start date",
    path: ["endDate"],
}).refine((data) => {
    if (data.selectionMode === "specific" && (!data.academicIds || data.academicIds.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Please select at least one academy for specific academy promo codes",
    path: ["academicIds"],
})

export type AdminPromoCodeFormData = z.infer<typeof adminPromoCodeSchema>
export type AdminPromoCodeCreateFormData = z.infer<typeof adminPromoCodeCreateSchema> 