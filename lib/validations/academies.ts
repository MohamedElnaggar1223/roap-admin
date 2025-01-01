import { z } from 'zod'

export const academyDetailsSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    logo: z.string().optional(),
    gallery: z.array(z.string()),
    entryFees: z.number().optional(),
    extra: z.string().optional(),
    policy: z.string().min(1),
})