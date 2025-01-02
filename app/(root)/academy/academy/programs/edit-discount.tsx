'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from "date-fns"
import { Calendar } from '@/components/ui/calendar'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DateSelector } from '@/components/shared/date-selector'
import { Discount } from '@/stores/programs-store'
import { useProgramsStore } from '@/providers/store-provider'

const editDiscountSchema = z.object({
    type: z.enum(['fixed', 'percentage']),
    value: z.string().min(1, "Value is required"),
    startDate: z.date({
        required_error: "Start date is required",
    }),
    endDate: z.date({
        required_error: "End date is required",
    }),
    packageIds: z.array(z.number()).min(1, "Select at least one package"),
})

interface EditDiscountProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    setEditedDiscount: (editedDiscount: { editedDiscount: Discount, index?: number } | null) => void
    discountEdited: Discount
    index?: number
    programId: number
}

export default function EditDiscount({
    open,
    onOpenChange,
    setEditedDiscount,
    discountEdited,
    index,
    programId,
}: EditDiscountProps) {
    const [loading, setLoading] = useState(false)

    const program = useProgramsStore((state) => state.programs.find(p => p.id === programId))
    const editDiscount = useProgramsStore((state) => state.editDiscount)
    const discountData = program?.discounts.find(d => d.id === discountEdited.id)

    const form = useForm<z.infer<typeof editDiscountSchema>>({
        resolver: zodResolver(editDiscountSchema),
        defaultValues: {
            type: discountData?.type,
            value: discountData?.value.toString(),
            startDate: new Date(discountData?.startDate ?? ''),
            endDate: new Date(discountData?.endDate ?? ''),
            packageIds: discountData?.packageDiscounts.map(pd => pd.packageId),
        }
    })

    const onSubmit = async (values: z.infer<typeof editDiscountSchema>) => {
        try {
            setLoading(true)

            if (values.type === 'percentage' && parseFloat(values.value) > 100) {
                form.setError('value', {
                    type: 'custom',
                    message: 'Percentage cannot exceed 100%'
                })
                return
            }

            if (values.startDate >= values.endDate) {
                form.setError('endDate', {
                    type: 'custom',
                    message: 'End date must be after start date'
                })
                return
            }

            const updatedDiscount = {
                ...discountData,
                type: values.type,
                value: parseFloat(values.value),
                startDate: values.startDate.toString(),
                endDate: values.endDate.toString(),
                packageDiscounts: values.packageIds.map(id => ({ packageId: id })),
                createdAt: discountData?.createdAt ?? new Date().toString(),
                updatedAt: discountData?.updatedAt ?? new Date().toString(),
                id: discountData?.id as number,
                programId: discountData?.programId as number,
            }

            editDiscount(updatedDiscount)

            setEditedDiscount({
                editedDiscount: updatedDiscount,
                index
            })

            onOpenChange(false)
        } catch (error) {
            console.error('Error updating discount:', error)
            form.setError('root', {
                type: 'custom',
                message: 'An unexpected error occurred'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='bg-main-white min-w-[820px]'>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-6 w-full'>
                        <DialogHeader className='flex flex-row pr-6 text-center items-center justify-between gap-2'>
                            <DialogTitle className='font-normal text-base'>Edit Discount</DialogTitle>
                            <div className='flex items-center gap-2'>
                                <button disabled={loading} type='submit' className='flex disabled:opacity-60 items-center justify-center gap-1 rounded-3xl text-main-yellow bg-main-green px-4 py-2.5'>
                                    {loading && <Loader2 className='h-5 w-5 animate-spin' />}
                                    Save
                                </button>
                            </div>
                        </DialogHeader>
                        <div className="w-full max-h-[380px] overflow-y-auto">
                            <div className="flex flex-col gap-6 w-full px-2">
                                <div className="flex gap-4">
                                    <FormField
                                        control={form.control}
                                        name="value"
                                        render={({ field }) => (
                                            <FormItem className='flex-1'>
                                                <FormLabel>Value</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center">
                                                        <Input
                                                            {...field}
                                                            type="number"
                                                            min="0"
                                                            max={form.watch('type') === 'percentage' ? "100" : undefined}
                                                            step="0.01"
                                                            className='px-2 py-6 rounded-r-none rounded-l-[10px] border border-gray-500 font-inter'
                                                        />
                                                        <span className="px-2 py-1.5 text-sm bg-transparent border border-l-0 border-gray-500 rounded-r-[10px]">
                                                            <FormField
                                                                control={form.control}
                                                                name="type"
                                                                render={({ field }) => (
                                                                    <FormItem className='w-fit'>
                                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger className='font-inter'>
                                                                                    <SelectValue placeholder="Select type" />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent className='!bg-[#F1F2E9]'>
                                                                                <SelectItem value="fixed">AED</SelectItem>
                                                                                <SelectItem value="percentage">%</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </span>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Start Date</FormLabel>
                                                <DateSelector field={field} />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>End Date</FormLabel>
                                                <DateSelector field={field} />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="packageIds"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>Select Packages</FormLabel>
                                            <div className="grid grid-cols-2 gap-4 border rounded-[10px] p-4">
                                                {program?.packages?.map((pkg) => (
                                                    <FormField
                                                        key={pkg.id}
                                                        control={form.control}
                                                        name="packageIds"
                                                        render={({ field }) => {
                                                            return (
                                                                <FormItem
                                                                    key={pkg.id}
                                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                                >
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            className='data-[state=checked]:!bg-main-green'
                                                                            checked={field.value?.includes(pkg.id!)}
                                                                            onCheckedChange={(checked) => {
                                                                                return checked
                                                                                    ? field.onChange([...field.value, pkg.id])
                                                                                    : field.onChange(
                                                                                        field.value?.filter(
                                                                                            (value) => value !== pkg.id
                                                                                        )
                                                                                    )
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal">
                                                                        {pkg.name}
                                                                    </FormLabel>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}