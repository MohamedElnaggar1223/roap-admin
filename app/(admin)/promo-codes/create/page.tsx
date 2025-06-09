'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { createPromoCodeAdmin, getAllAcademiesForSelect } from "@/lib/actions/admin-promo-codes.actions"
import { adminPromoCodeCreateSchema, type AdminPromoCodeCreateFormData } from "@/lib/validations/admin-promo-codes"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

type Academy = {
    id: number
    name: string
}

export default function CreatePromoCodeAdmin() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [academies, setAcademies] = useState<Academy[]>([])

    const form = useForm<AdminPromoCodeCreateFormData>({
        resolver: zodResolver(adminPromoCodeCreateSchema),
        defaultValues: {
            code: '',
            discountType: 'fixed',
            discountValue: 0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            canBeUsed: 1,
            selectionMode: 'general',
            academicIds: null,
        },
    })

    useEffect(() => {
        async function fetchAcademies() {
            try {
                const academyData = await getAllAcademiesForSelect()
                console.log('Fetched academies:', academyData) // Debug log
                setAcademies(academyData)
            } catch (error) {
                console.error('Error fetching academies:', error)
            }
        }
        fetchAcademies()
    }, [])

    async function onSubmit(values: AdminPromoCodeCreateFormData) {
        try {
            setLoading(true)

            // Convert selection mode to the expected format
            const academicIds = values.selectionMode === 'general' ? null : values.academicIds

            const result = await createPromoCodeAdmin({
                code: values.code,
                discountType: values.discountType,
                discountValue: values.discountValue,
                startDate: values.startDate,
                endDate: values.endDate,
                canBeUsed: values.canBeUsed,
                academicIds: academicIds,
            })

            if (result.error) {
                form.setError(result.field as any || 'root', {
                    type: 'custom',
                    message: result.error
                })
                return
            }

            router.refresh()
            router.push('/promo-codes')
        } catch (error) {
            console.error('Error creating promo code:', error)
            form.setError('root', {
                type: 'custom',
                message: 'An unexpected error occurred'
            })
        } finally {
            setLoading(false)
        }
    }

    const selectedAcademyIds = form.watch('academicIds')
    const selectionMode = form.watch('selectionMode')
    const isGeneral = selectionMode === 'general'

    const handleAcademyToggle = (academyId: number, checked: boolean) => {
        const currentIds = form.getValues('academicIds') || []
        if (checked) {
            form.setValue('academicIds', [...currentIds, academyId])
        } else {
            form.setValue('academicIds', currentIds.filter(id => id !== academyId))
        }
    }

    const handleSelectionModeChange = (mode: string) => {
        form.setValue('selectionMode', mode as 'general' | 'specific')
        if (mode === 'general') {
            form.setValue('academicIds', null)
        } else {
            form.setValue('academicIds', [])
        }
    }

    return (
        <div className="flex flex-col w-full items-center justify-start h-full gap-6">
            <div className="flex max-w-7xl items-center justify-between gap-2 w-full">
                <h1 className="text-3xl font-bold">Create Promo Code</h1>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-7xl">
                    <div className="max-w-7xl flex max-lg:flex-wrap items-start justify-between w-full gap-4">
                        <div className="flex-1 space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Promo Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2'
                                                placeholder="Enter promo code"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="selectionMode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Promo Code Scope</FormLabel>
                                        <Select
                                            disabled={loading}
                                            onValueChange={(value) => {
                                                field.onChange(value)
                                                handleSelectionModeChange(value)
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2'>
                                                    <SelectValue placeholder="Choose promo code scope" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="general">General - Apply to all academies</SelectItem>
                                                <SelectItem value="specific">Specific Academies - Choose which academies</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {selectionMode === 'specific' && (
                                <FormField
                                    control={form.control}
                                    name="academicIds"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>Select Academies</FormLabel>
                                            <div className="space-y-2 max-w-[570px] border rounded-md p-4 max-h-60 overflow-y-auto">
                                                {academies.length === 0 ? (
                                                    <div className="text-sm text-muted-foreground">
                                                        No academies available or loading...
                                                    </div>
                                                ) : (
                                                    academies.map((academy) => (
                                                        <div key={academy.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`academy-${academy.id}`}
                                                                checked={selectedAcademyIds?.includes(academy.id) || false}
                                                                onCheckedChange={(checked) =>
                                                                    handleAcademyToggle(academy.id, checked as boolean)
                                                                }
                                                                disabled={loading}
                                                            />
                                                            <label
                                                                htmlFor={`academy-${academy.id}`}
                                                                className="text-sm cursor-pointer"
                                                            >
                                                                {academy.name}
                                                            </label>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="flex gap-4">
                                <FormField
                                    control={form.control}
                                    name="discountType"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Discount Type</FormLabel>
                                            <Select
                                                disabled={loading}
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className='focus-visible:ring-main focus-visible:ring-2'>
                                                        <SelectValue placeholder="Select discount type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="discountValue"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Discount Value</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    disabled={loading}
                                                    className='focus-visible:ring-main focus-visible:ring-2'
                                                    placeholder="Enter discount value"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
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
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    disabled={loading}
                                                    className='focus-visible:ring-main focus-visible:ring-2'
                                                    {...field}
                                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                                />
                                            </FormControl>
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
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    disabled={loading}
                                                    className='focus-visible:ring-main focus-visible:ring-2'
                                                    {...field}
                                                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="canBeUsed"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Usage Limit</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled={loading}
                                                className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2'
                                                placeholder="Enter usage limit"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {form.formState.errors.root && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                {form.formState.errors.root.message}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4 max-w-7xl w-full space-x-2">
                        <Button
                            disabled={loading}
                            type='submit'
                            variant="outline"
                            className='bg-main text-white hover:bg-main-hovered hover:text-white'
                            size="default"
                        >
                            {loading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                            Create Promo Code{(selectionMode === 'specific' && selectedAcademyIds && selectedAcademyIds.length > 1) ? `s (${selectedAcademyIds.length})` : ''}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
} 