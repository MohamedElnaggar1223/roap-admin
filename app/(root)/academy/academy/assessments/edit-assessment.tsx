'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { updateAssessment } from '@/lib/actions/assessments.actions'
import { Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AddPackage from './new-add-package'
import EditPackage from './new-edit-package'
import AutoGrowingTextarea from '@/components/ui/autogrowing-textarea'
import { formatDateForDB } from '@/lib/utils'
import useSWR from 'swr'
import { getProgramPackages } from '@/lib/actions/packages.actions'
import { getAllCoaches } from '@/lib/actions/coaches.actions'
import { useOnboarding } from '@/providers/onboarding-provider'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useGendersStore } from '@/providers/store-provider'

const calculateAgeFromDate = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);

    // Calculate the time difference in months
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months += today.getMonth() - birth.getMonth();

    // Adjust for day of month
    if (today.getDate() < birth.getDate()) {
        months--;
    }

    // Check if months can be converted to a clean 0.5-year interval
    const years = months / 12;
    const roundedToHalfYear = Math.round(years * 2) / 2; // Rounds to nearest 0.5

    // If the difference between actual years and rounded half-year is very small
    // (accounting for floating point precision), use years
    if (Math.abs(years - roundedToHalfYear) < 0.01) {
        return {
            age: roundedToHalfYear,
            unit: 'years'
        };
    } else {
        return {
            age: months,
            unit: 'months'
        };
    }
};

const calculateDateFromAge = (age: number, unit: string): Date => {
    const date = new Date();

    if (unit === 'months') {
        // For months input, check if it can be converted to a clean year interval
        const years = age / 12;
        const roundedToHalfYear = Math.round(years * 2) / 2;

        if (Math.abs(years - roundedToHalfYear) < 0.01) {
            // If it can be represented as a clean half-year, convert to years
            const years = Math.floor(roundedToHalfYear);
            const monthsFraction = (roundedToHalfYear - years) * 12;
            date.setFullYear(date.getFullYear() - years);
            date.setMonth(date.getMonth() - Math.round(monthsFraction));
        } else {
            // Otherwise keep as months
            date.setMonth(date.getMonth() - age);
        }
    } else { // years
        const years = Math.floor(age);
        const monthsFraction = (age - years) * 12;
        date.setFullYear(date.getFullYear() - years);
        date.setMonth(date.getMonth() - Math.round(monthsFraction));
    }

    return date;
};

const editAssessmentSchema = z.object({
    description: z.string().min(1, "Description is required"),
    // startAge: z.number().min(0, "Start age must be 0 or greater").max(100, "Start age must be 100 or less").multipleOf(0.5, "Start age must be in increments of 0.5"),
    // startAgeUnit: z.enum(["months", "years"]),
    // endAge: z.number().min(0, "End age must be 0.5 or greater").max(100, "End age must be 100 or less").multipleOf(0.5, "End age must be in increments of 0.5").optional(),
    // endAgeUnit: z.enum(["months", "years", "unlimited"]),
    numberOfSeats: z.string().optional(),
    assessmentDeductedFromProgram: z.boolean().default(false).optional(),
})

interface Package {
    type: "Term" | "Monthly" | "Full Season" | 'Assessment' | 'Assessment'
    termNumber?: number
    name: string
    price: number
    startDate: Date
    endDate: Date
    schedules: Schedule[]
    memo: string | null
    id?: number
    entryFees: number
    entryFeesExplanation?: string
    entryFeesAppliedUntil?: string[]
    entryFeesStartDate?: Date
    entryFeesEndDate?: Date
}

interface Schedule {
    day: string
    from: string
    to: string
    memo: string | undefined
    id?: number
    startDateOfBirth: Date | null
    endDateOfBirth: Date | null
    gender: string | null
}

interface Props {
    assessment: {
        coaches: string[];
        packages: string[];
        id: number;
        description: string | null;
        type: string | null;
        numberOfSeats: number | null;
        branchId: number | null;
        sportId: number | null;
        gender: string | null;
        startDateOfBirth: string | null;
        endDateOfBirth: string | null;
        branchName: string;
        sportName: string;
        assessmentDeductedFromProgram: boolean;
    }
    branches: {
        id: number;
        name: string;
        nameInGoogleMap: string | null;
        url: string | null;
        isDefault: boolean;
        rate: number | null;
        sports: string[];
        amenities: string[];
        locale: string;
    }[];
    sports: {
        id: number;
        name: string;
        locale: string;
    }[];
}

export default function EditAssessment({ assessment, sports, branches }: Props) {
    const router = useRouter()

    const { toast } = useToast()

    const { mutate: mutateAssessment } = useOnboarding()

    const { data: packagesData, isLoading, isValidating, mutate } = useSWR(
        `assessment-packages ${assessment.id}`,
        () => getProgramPackages('packages', assessment.id),
        {
            refreshWhenHidden: true
        }
    )

    console.log(packagesData)

    const genders = useGendersStore((state) => state.genders).map((g) => g.name)
    const fetched = useGendersStore((state) => state.fetched)
    const fetchGenders = useGendersStore((state) => state.fetchGenders)

    useEffect(() => {
        if (!fetched) {
            fetchGenders()
        }
    }, [fetched])

    const [dialogOpen, setDialogOpen] = useState(false)
    const { data: coachesData } = useSWR(dialogOpen ? 'coaches' : null, getAllCoaches)
    const [selectedCoaches, setSelectedCoaches] = useState<number[]>(assessment.coaches.map(Number))
    const [loading, setLoading] = useState(false)
    const [coachesOpen, setCoachesOpen] = useState(false)
    const [selectedGenders, setSelectedGenders] = useState<string[]>(
        assessment.gender?.split(',').map(gender => gender.trim()) || []
    )
    const [gendersOpen, setGendersOpen] = useState(false)
    const [packagesOpen, setPackagesOpen] = useState(false)
    const [editPackageOpen, setEditPackageOpen] = useState(false)
    const [editedPackage, setEditedPackage] = useState<{ editedPackage: Package, index?: number } | null>(null)
    const [createdPackages, setCreatedPackages] = useState<Package[]>([])

    // Update packages when data is loaded
    useEffect(() => {
        if (isLoading || isValidating) return
        setCreatedPackages(packagesData?.data?.map(packageData => ({
            ...packageData,
            startDate: new Date(packageData.startDate),
            endDate: new Date(packageData.endDate),
            entryFeesExplanation: packageData.entryFeesExplanation ?? undefined,
            entryFeesAppliedUntil: packageData.entryFeesAppliedUntil || undefined,
            entryFeesStartDate: packageData.entryFeesStartDate ? new Date(packageData.entryFeesStartDate) : undefined,
            entryFeesEndDate: packageData.entryFeesEndDate ? new Date(packageData.entryFeesEndDate) : undefined,
            schedules: packageData.schedules?.map(schedule => ({
                ...schedule,
                startDateOfBirth: schedule.startDateOfBirth ? new Date(schedule.startDateOfBirth) : null,
                endDateOfBirth: schedule.endDateOfBirth ? new Date(schedule.endDateOfBirth) : null,
                gender: schedule.gender ?? null
            })) ?? []
        })) ?? [])
    }, [isLoading, isValidating, packagesData])

    const form = useForm<z.infer<typeof editAssessmentSchema>>({
        resolver: zodResolver(editAssessmentSchema),
        defaultValues: {
            description: assessment.description ?? '',
            numberOfSeats: assessment.numberOfSeats?.toString() ?? '',
            // startAge: (() => {
            //     if (!assessment.startDateOfBirth) return 0;
            //     const { age, unit } = calculateAgeFromDate(assessment.startDateOfBirth);
            //     return age;
            // })(),
            // startAgeUnit: (() => {
            //     if (!assessment.startDateOfBirth) return 'years';
            //     return calculateAgeFromDate(assessment.startDateOfBirth).unit as 'months' | 'years' | undefined;
            // })(),
            // endAge: (() => {
            //     if (!assessment.endDateOfBirth) return undefined;
            //     const { age, unit } = calculateAgeFromDate(assessment.endDateOfBirth);
            //     if (age >= 100) return undefined; // For unlimited
            //     return age;
            // })(),
            // endAgeUnit: (() => {
            //     if (!assessment.endDateOfBirth) return 'unlimited';
            //     const { age } = calculateAgeFromDate(assessment.endDateOfBirth);
            //     if (age >= 100) return 'unlimited';
            //     return calculateAgeFromDate(assessment.endDateOfBirth).unit as "months" | "years" | undefined;
            // })(),
            assessmentDeductedFromProgram: assessment.assessmentDeductedFromProgram
        }
    })

    const handleSelectCoach = (id: number) => {
        if (loading) return
        setSelectedCoaches(prev =>
            prev.includes(id) ? prev.filter(coachId => coachId !== id) : [...prev, id]
        )
    }

    const handleSelectGender = (gender: string) => {
        if (loading) return
        setSelectedGenders(prev =>
            prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
        )
    }

    const onSubmit = async (values: z.infer<typeof editAssessmentSchema>) => {
        try {
            setLoading(true)

            // if (!selectedGenders.length) {
            //     form.setError('root', {
            //         type: 'custom',
            //         message: 'Please select at least one gender'
            //     })
            //     return
            // }

            // const startDate = calculateDateFromAge(values.startAge, values.startAgeUnit);

            // let endDate;
            // if (values.endAgeUnit === 'unlimited') {
            //     endDate = new Date();
            //     endDate.setFullYear(endDate.getFullYear() - 100); // Set to 100 years ago for unlimited
            // } else {
            //     if (!values.endAge) {
            //         return form.setError('endAge', {
            //             type: 'custom',
            //             message: 'End age is required for limited duration'
            //         });
            //     }
            //     endDate = calculateDateFromAge(values.endAge, values.endAgeUnit);
            // }

            const result = await updateAssessment(assessment.id, {
                description: values.description,
                branchId: assessment.branchId!,
                sportId: assessment.sportId!,
                // gender: selectedGenders.join(','),
                // startDateOfBirth: startDate,
                // endDateOfBirth: endDate,
                numberOfSeats: 0,
                coaches: selectedCoaches,
                packagesData: createdPackages.map((p) => ({
                    ...p,
                    startDate: format(p.startDate, 'yyyy-MM-dd 00:00:00'),
                    endDate: format(p.endDate, 'yyyy-MM-dd 00:00:00'),
                    entryFeesStartDate: p.entryFeesStartDate ? format(p.entryFeesStartDate, 'yyyy-MM-dd 00:00:00') : undefined,
                    entryFeesEndDate: p.entryFeesEndDate ? format(p.entryFeesEndDate, 'yyyy-MM-dd 00:00:00') : undefined,
                    schedules: p.schedules.map(schedule => ({
                        ...schedule,
                        startDateOfBirth: schedule.startDateOfBirth ? format(schedule.startDateOfBirth, 'yyyy-MM-dd 00:00:00') : undefined,
                        endDateOfBirth: schedule.endDateOfBirth ? format(schedule.endDateOfBirth, 'yyyy-MM-dd 00:00:00') : undefined,
                        gender: schedule.gender
                    }))
                })),
                assessmentDeductedFromProgram: values.assessmentDeductedFromProgram ? values.assessmentDeductedFromProgram : false
            })

            if (result.error) {
                if (result?.field) {
                    form.setError(result.field as any, {
                        type: 'custom',
                        message: result.error
                    })
                    return
                }
                form.setError('root', {
                    type: 'custom',
                    message: result.error
                })
                return
            }

            setDialogOpen(false)
            mutateAssessment()
            router.refresh()
        } catch (error) {
            console.error('Error updating assessment:', error)
            form.setError('root', {
                type: 'custom',
                message: 'An unexpected error occurred'
            })
        } finally {
            setLoading(false)
        }
    }

    // const startAgeUnitChange = form.watch('startAgeUnit')
    // const endAgeUnitChange = form.watch('endAgeUnit')

    useEffect(() => {
        if (!editPackageOpen) {
            setEditedPackage(null)
        }
    }, [editPackageOpen])

    const handleToastValidation = () => {
        const values = form.getValues()
        const missingFields: string[] = [];

        if (!values.description) missingFields.push('Description');
        // if (!selectedGenders.length) missingFields.push('Gender');
        // if (values.startAge === undefined || values.startAge === null) missingFields.push('Start Age');
        // if (values.endAgeUnit !== 'unlimited' && (!values.endAge || values.endAge === undefined)) {
        //     missingFields.push('End Age');
        // }

        if (missingFields.length > 0) {
            toast({
                title: "Missing Required Fields",
                description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
                variant: "destructive",
            });
        }
    }

    return (
        <>
            <Button variant="ghost" size="icon" onClick={() => setDialogOpen(true)}>
                <Image
                    src='/images/edit.svg'
                    alt='Edit'
                    width={20}
                    height={20}
                />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className='bg-main-white min-w-[1280px] w-screen'>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-6 w-full'>
                            <DialogHeader className='flex flex-row pr-6 text-center items-center justify-between gap-2'>
                                <DialogTitle className='font-normal text-base'>Edit Assessment</DialogTitle>
                                <div className='flex items-center gap-2'>
                                    <button onClick={handleToastValidation} disabled={loading} type='submit' className='flex disabled:opacity-60 items-center justify-center gap-1 rounded-3xl text-main-yellow bg-main-green px-4 py-2.5'>
                                        {loading && <Loader2 className='h-5 w-5 animate-spin' />}
                                        Save
                                    </button>
                                </div>
                            </DialogHeader>

                            <div className="w-full max-h-[380px] overflow-y-auto">
                                <div className="flex flex-col gap-6 w-full px-2">
                                    <FormField
                                        control={form.control}
                                        name='description'
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <AutoGrowingTextarea
                                                        field={field}
                                                        disabled={isLoading || isValidating || loading}
                                                        className='px-2 py-6 rounded-[10px] border border-gray-500 font-inter'
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name='assessmentDeductedFromProgram'
                                        render={({ field }) => (
                                            <FormItem className='flex gap-2 items-center justify-start text-center'>
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className='!mt-0 font-semibold'>Do you want to deduct the price from the subscription?</FormLabel>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* <div className="flex flex-col gap-4 flex-1">
                                        <p className='text-xs'>For</p>
                                        <div className="flex w-full flex-col gap-4 border border-gray-500 p-3 rounded-lg">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedGenders.map((gender) => (
                                                    <Badge
                                                        key={gender}
                                                        variant="default"
                                                        className="flex items-center gap-1 hover:bg-[#E0E4D9] pr-0.5 bg-[#E0E4D9] rounded-3xl text-main-green font-semibold font-inter text-sm"
                                                    >
                                                        <span className="text-xs">{gender}</span>
                                                        <button
                                                            disabled={loading}
                                                            onClick={() => handleSelectGender(gender)}
                                                            className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/20"
                                                        >
                                                            <X className="size-3" fill='#1f441f' />
                                                            <span className="sr-only">Remove {gender}</span>
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <Popover open={gendersOpen} onOpenChange={setGendersOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="default"
                                                        disabled={loading}
                                                        className="gap-2 hover:bg-transparent text-left flex items-center bg-transparent text-black border border-gray-500 justify-start"
                                                    >
                                                        Select genders
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-56 p-0" align="start">
                                                    <div className="p-2">
                                                        {genders.map(gender => (
                                                            <p
                                                                key={gender}
                                                                onClick={() => handleSelectGender(gender)}
                                                                className="p-2 flex items-center justify-start gap-2 text-left cursor-pointer hover:bg-[#fafafa] rounded-lg"
                                                            >
                                                                {selectedGenders.includes(gender) && <X className="size-3" fill='#1f441f' />}
                                                                {gender}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div> */}

                                    <div className="absolute hidden flex-col gap-4 w-full">
                                        <p className='text-xs'>Coaches</p>
                                        <div className="flex w-full flex-col gap-4 border border-gray-500 p-3 rounded-lg">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCoaches.map((coach) => (
                                                    <Badge
                                                        key={coach}
                                                        variant="default"
                                                        className="flex items-center gap-1 hover:bg-[#E0E4D9] pr-0.5 bg-[#E0E4D9] rounded-3xl text-main-green font-semibold font-inter text-sm"
                                                    >
                                                        <span className="text-xs">{coachesData?.find(c => c.id === coach)?.name}</span>
                                                        <button disabled={isLoading || isValidating || loading}
                                                            onClick={() => handleSelectCoach(coach)}
                                                            className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/20"
                                                        >
                                                            <X className="size-3" fill='#1f441f' />
                                                            <span className="sr-only">Remove {coachesData?.find(c => c.id === coach)?.name}</span>
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <Popover open={coachesOpen} onOpenChange={setCoachesOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="default" disabled={isLoading || isValidating || loading}
                                                        className="gap-2 hover:bg-transparent text-left flex items-center bg-transparent text-black border border-gray-500 justify-start"
                                                    >
                                                        Select coaches
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-56 p-0 overflow-hidden" align="start">
                                                    <div
                                                        className="max-h-64 overflow-y-scroll overscroll-contain"
                                                        style={{
                                                            scrollbarWidth: 'thin',
                                                            WebkitOverflowScrolling: 'touch',
                                                            willChange: 'scroll-position'
                                                        }}
                                                        onWheel={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <div className="p-2">
                                                            {coachesData?.map(coach => (
                                                                <p
                                                                    key={coach.id}
                                                                    onClick={() => handleSelectCoach(coach.id)}
                                                                    className="p-2 flex items-center justify-start gap-2 text-left cursor-pointer hover:bg-[#fafafa] rounded-lg"
                                                                >
                                                                    {selectedCoaches.includes(coach.id) && <X className="size-3" fill='#1f441f' />}
                                                                    {coach.name}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    <div className="flex w-full gap-4 items-start justify-between">
                                        <div className="flex flex-1 gap-2">
                                            {/* <FormField
                                                control={form.control}
                                                name='startAge'
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col flex-1">
                                                        <FormLabel>Start Age</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                onChange={e => field.onChange(Number(e.target.value))}
                                                                step={startAgeUnitChange === 'months' ? 1 : 0.5}
                                                                min={0}
                                                                max={100}
                                                                disabled={isLoading || isValidating || loading}
                                                                className='px-2 py-6 rounded-[10px] border border-gray-500 font-inter'
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            /> */}
                                            {/* <FormField
                                                control={form.control}
                                                name="startAgeUnit"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col flex-1">
                                                        <FormLabel>Unit</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isValidating || loading}>
                                                            <FormControl>
                                                                <SelectTrigger className='px-2 py-6 rounded-[10px] border border-gray-500 font-inter'>
                                                                    <SelectValue placeholder="Select unit" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className='!bg-[#F1F2E9]'>
                                                                <SelectItem value="months">Months</SelectItem>
                                                                <SelectItem value="years">Years</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            /> */}
                                        </div>

                                        <div className="flex flex-1 gap-2">
                                            {/* <FormField
                                                control={form.control}
                                                name='endAge'
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col flex-1">
                                                        <FormLabel>End Age</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                onChange={e => field.onChange(Number(e.target.value))}
                                                                step={endAgeUnitChange === 'months' ? 1 : 0.5}
                                                                min={0.5}
                                                                max={100}
                                                                disabled={isLoading || isValidating || loading || form.watch('endAgeUnit') === 'unlimited'}
                                                                className='px-2 py-6 rounded-[10px] border border-gray-500 font-inter'
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            /> */}
                                            {/* <FormField
                                                control={form.control}
                                                name="endAgeUnit"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col flex-1">
                                                        <FormLabel>Unit</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isValidating || loading}>
                                                            <FormControl>
                                                                <SelectTrigger className='px-2 py-6 rounded-[10px] border border-gray-500 font-inter'>
                                                                    <SelectValue placeholder="Select unit" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className='!bg-[#F1F2E9]'>
                                                                <SelectItem value="months">Months</SelectItem>
                                                                <SelectItem value="years">Years</SelectItem>
                                                                <SelectItem value="unlimited">Unlimited</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            /> */}
                                        </div>
                                    </div>

                                    {/* <FormField
                                        control={form.control}
                                        name='numberOfSeats'
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Number of Slots</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        disabled={loading}
                                                        {...field}
                                                        type="number"
                                                        min="1"
                                                        className='px-2 py-6 rounded-[10px] border border-gray-500 font-inter'
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    /> */}

                                    <div className="w-full max-w-screen-2xl overflow-x-auto">
                                        <div className="min-w-full grid grid-cols-[0.75fr,auto,auto,auto,auto,auto] gap-y-2 text-nowrap">
                                            <div className="contents">
                                                <div />
                                                <div />
                                                <div />
                                                <div />
                                                <div />
                                                <div className="py-4 flex items-center justify-center">
                                                    <button
                                                        type='button'
                                                        disabled={loading}
                                                        onClick={() => setPackagesOpen(true)}
                                                        className='flex text-main-yellow text-nowrap items-center justify-center gap-2 rounded-3xl px-4 py-2 bg-main-green text-sm'
                                                    >
                                                        Add New Package
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="contents">
                                                <div className="py-4 px-4 rounded-l-[20px] bg-[#E0E4D9]">Name</div>
                                                <div className="py-4 px-4 bg-[#E0E4D9]">Price</div>
                                                <div className="py-4 px-4 bg-[#E0E4D9]">Start Date</div>
                                                <div className="py-4 px-4 bg-[#E0E4D9]">End Date</div>
                                                <div className="py-4 px-4 bg-[#E0E4D9]">Session</div>
                                                <div className="py-4 px-4 rounded-r-[20px] bg-[#E0E4D9]"></div>
                                            </div>

                                            {createdPackages.map((packageData, index) => (
                                                <div className="contents" key={index}>
                                                    <div className="py-4 px-4 bg-main-white rounded-l-[20px] flex items-center justify-start font-bold font-inter">
                                                        {packageData.name}
                                                    </div>
                                                    <div className="py-4 px-4 bg-main-white flex items-center justify-start font-bold font-inter">
                                                        {packageData.price}
                                                    </div>
                                                    <div className="py-4 px-4 bg-main-white flex items-center justify-start font-bold font-inter">
                                                        {packageData.startDate.toLocaleDateString()}
                                                    </div>
                                                    <div className="py-4 px-4 bg-main-white flex items-center justify-start font-bold font-inter">
                                                        {packageData.endDate.toLocaleDateString()}
                                                    </div>
                                                    <div className="py-4 px-4 bg-main-white flex items-center justify-start font-bold font-inter">
                                                        {packageData.schedules.length}
                                                    </div>
                                                    <div className="py-4 px-4 bg-main-white gap-4 rounded-r-[20px] flex items-center justify-end font-bold font-inter">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={loading}
                                                            onClick={() => {
                                                                setEditPackageOpen(true);
                                                                setEditedPackage({ editedPackage: packageData, index });
                                                            }}
                                                        >
                                                            <Image
                                                                src='/images/edit.svg'
                                                                alt='Edit'
                                                                width={20}
                                                                height={20}
                                                            />
                                                        </Button>
                                                        <X
                                                            className="h-4 w-4 cursor-pointer"
                                                            onClick={() => setCreatedPackages(prev => prev.filter((_, i) => i !== index))}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AddPackage
                open={packagesOpen}
                onOpenChange={setPackagesOpen}
                setCreatedPackages={setCreatedPackages}
                packagesLength={assessment.packages.length}
                branchId={assessment.branchId!}
            />

            {editedPackage && (
                <EditPackage
                    packageEdited={editedPackage.editedPackage}
                    open={editPackageOpen}
                    onOpenChange={setEditPackageOpen}
                    setEditedPackage={setEditedPackage}
                    index={editedPackage.index}
                    setCreatedPackages={setCreatedPackages}
                    branchId={assessment.branchId!}
                />
            )}
        </>
    )
}