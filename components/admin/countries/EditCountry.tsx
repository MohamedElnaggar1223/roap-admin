'use client'

import { AlertCircle, Edit, Eye, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button";
import { z } from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useDebouncedCallback } from 'use-debounce'
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addCountryTranslation, deleteCountry, deleteCountryTranslations, editCountryTranslation } from "@/lib/actions/countries.actions";
import { addCountryTranslationSchema } from "@/lib/validations/countries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CountryTranslation = {
    id: number;
    name: string;
    locale: string;
}

type Props = {
    countryTranslations: CountryTranslation[]
    countryId: string
}

const updateMainTranslationSchema = z.object({
    name: z.string().min(2, {
        message: "Please enter a valid name",
    }),
    locale: z.string().min(2, {
        message: "Please enter a valid locale",
    }),
})

const updateCountryTranslationSchema = z.object({
    name: z.string().min(2, {
        message: "Please enter a valid name",
    }),
    locale: z.string().min(2, {
        message: "Please enter a valid locale",
    }),
})

export default function EditCountry({ countryTranslations, countryId }: Props) {

    const mainTranslation = countryTranslations.find(countryTranslation => countryTranslation.locale === 'en')

    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [selectedRows, setSelectedRows] = useState<number[]>([])
    const [countryTranslationsData, setCountryTranslationsData] = useState<CountryTranslation[]>(countryTranslations)
    const [searchQuery, setSearchQuery] = useState('')
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [newTranslationOpen, setNewTranslationOpen] = useState(false)
    const [newTranslationLoading, setNewTranslationLoading] = useState(false)
    const [newTranslationError, setNewTranslationError] = useState('')
    const [editCountryTranslationOpen, setEditCountryTranslationOpen] = useState(false)
    const [editCountryTranslationId, setEditCountryTranslationId] = useState<number | null>(null)
    const [editCountryTranslationLoading, setEditCountryTranslationLoading] = useState(false)
    const [editCountryTranslationError, setEditCountryTranslationError] = useState('')
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const formMainTranslation = useForm<z.infer<typeof updateMainTranslationSchema>>({
        resolver: zodResolver(updateMainTranslationSchema),
        defaultValues: {
            name: mainTranslation?.name || (countryTranslations.length > 0 ? countryTranslations[0].name : ''),
            locale: mainTranslation?.locale || (countryTranslations.length > 0 ? countryTranslations[0].locale : ''),
        },
    })

    async function onSubmitMainTranslation(values: z.infer<typeof updateMainTranslationSchema>) {
        setLoading(true)
        if (!mainTranslation) return
        await editCountryTranslation(values, mainTranslation?.id)
        router.refresh()
        setLoading(false)
    }

    const formNewTranslation = useForm<z.infer<typeof addCountryTranslationSchema>>({
        resolver: zodResolver(addCountryTranslationSchema),
        defaultValues: {
            name: '',
            locale: '',
            countryId: countryId,
        },
    })

    async function onSubmitNewTranslation(values: z.infer<typeof addCountryTranslationSchema>) {
        setNewTranslationLoading(true)

        const { error } = await addCountryTranslation(values)

        setNewTranslationLoading(false)

        if (error) {
            setNewTranslationError(error)
            return
        }

        setNewTranslationOpen(false)

        router.refresh()
    }

    const formEditCountryTranslation = useForm<z.infer<typeof updateCountryTranslationSchema>>({
        resolver: zodResolver(updateCountryTranslationSchema),
        defaultValues: {
            name: countryTranslations.find(countryTranslation => countryTranslation.id === editCountryTranslationId)?.name || '',
            locale: countryTranslations.find(countryTranslation => countryTranslation.id === editCountryTranslationId)?.locale || '',
        },
    })

    async function onSubmitEditCountryTranslation(values: z.infer<typeof updateCountryTranslationSchema>) {
        setEditCountryTranslationLoading(true)

        if (!editCountryTranslationId) return

        const { error } = await editCountryTranslation(values, editCountryTranslationId)

        setEditCountryTranslationLoading(false)

        if (error) {
            setEditCountryTranslationError(error)
            return
        }

        setEditCountryTranslationOpen(false)

        router.refresh()
    }

    const handleDelete = async () => {
        setDeleteLoading(true)
        await deleteCountry(parseInt(countryId))
        router.push('/countries')
        setDeleteLoading(false)
        setDeleteOpen(false)
    }

    const handleRowSelect = (id: number) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const handleSelectAll = () => {
        setSelectedRows(
            selectedRows.length === countryTranslationsData.length ? [] : countryTranslationsData.map(country => country.id)
        )
    }

    const debouncedSearch = useDebouncedCallback((value: string) => {
        const lowercasedValue = value.toLowerCase()
        if (!lowercasedValue) {
            setCountryTranslationsData(countryTranslations)
        }
        else {
            const filtered = countryTranslations.filter(country =>
                country.name?.toLowerCase().includes(lowercasedValue) ||
                country.locale?.toLowerCase().includes(lowercasedValue)
            )
            setCountryTranslationsData(filtered)
        }
    }, 300)

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        debouncedSearch(value)
    }

    const handleBulkDelete = async () => {
        setBulkDeleteLoading(true)
        await deleteCountryTranslations(selectedRows, countryId)
        router.refresh()
        setBulkDeleteLoading(false)
        setBulkDeleteOpen(false)
    }

    const handleEditCountryTranslation = (id: number) => {
        formEditCountryTranslation.setValue('name', countryTranslations.find(countryTranslation => countryTranslation.id === id)?.name || '')
        formEditCountryTranslation.setValue('locale', countryTranslations.find(countryTranslation => countryTranslation.id === id)?.locale || '')
        setEditCountryTranslationOpen(true)
        setEditCountryTranslationId(id)
    }

    return (
        <>
            <div className="flex flex-col w-full items-center justify-start h-full gap-6">
                <div className="flex max-w-7xl items-center justify-between gap-2 w-full">
                    <h1 className="text-3xl font-bold">Edit Country</h1>
                    <div className="flex items-center gap-2">
                        <Link href={`/countries/${countryId}/view`}>
                            <Button variant="outline" className='' >
                                View
                            </Button>
                        </Link>
                        <Button
                            variant="destructive"

                            onClick={() => setDeleteOpen(true)}
                            className="flex items-center gap-2"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
                <Form {...formMainTranslation}>
                    <form onSubmit={formMainTranslation.handleSubmit(onSubmitMainTranslation)} className="space-y-4 w-full max-w-7xl">
                        <div className="max-w-7xl flex max-lg:flex-wrap items-center justify-center w-full gap-4 border rounded-2xl p-6">
                            <FormField
                                control={formMainTranslation.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className='flex-1'>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2' placeholder="" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </div>
                        <div className="space-y-4 max-w-7xl w-full space-x-2">
                            <Button disabled={loading || formMainTranslation.getValues('name') === mainTranslation?.name} type='submit' variant="outline" className='bg-main text-white hover:bg-main-hovered hover:text-white' size="default">
                                {loading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                                Save changes
                            </Button>
                        </div>
                    </form>
                </Form>
                <div className="space-y-4 divide-y max-w-7xl w-full border rounded-2xl p-4 bg-[#fafafa]">
                    <div className="flex w-full items-center justify-between p-1.5">
                        <p className='font-semibold'>Translations</p>
                        <Button onClick={() => setNewTranslationOpen(true)} variant="outline" className='bg-main text-white hover:bg-main-hovered hover:text-white' size="sm">
                            <PlusIcon stroke='#fff' className="h-4 w-4" />
                            New Translation
                        </Button>
                    </div>
                    <div className='flex w-full items-center justify-end gap-2 pt-4'>
                        {selectedRows.length > 0 && (
                            <Button
                                variant="destructive"

                                onClick={() => setBulkDeleteOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Trash2Icon className="h-4 w-4" />
                                Delete Selected ({selectedRows.length})
                            </Button>
                        )}
                        <div className="relative">
                            <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
                            <Input
                                type="search"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className='focus-visible:ring-2 bg-white focus-visible:ring-main pl-8 pr-4 py-2'
                            />
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedRows.length === countryTranslationsData.length && countryTranslationsData.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className=''>Name</TableHead>
                                <TableHead className=''>Locale</TableHead>
                                <TableHead className='sr-only'>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {countryTranslationsData.map((country) => (
                                <TableRow key={country.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedRows.includes(country.id)}
                                            onCheckedChange={() => handleRowSelect(country.id)}
                                            aria-label={`Select ${country.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className=''>{country.name}</TableCell>
                                    <TableCell className=''>{country.locale}</TableCell>
                                    <TableCell className='w-[200px]'>
                                        <div className="flex space-x-2 items-center justify-end">
                                            <Button onClick={() => handleEditCountryTranslation(country.id)} className='flex items-center justify-center gap-2' variant="outline" >
                                                <Edit className="h-4 w-4" />
                                                Edit
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <DialogContent className='font-geist'>
                    <DialogHeader>
                        <DialogTitle className='font-medium'>Delete Translations</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedRows.length} translations?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button disabled={bulkDeleteLoading} variant="destructive" onClick={handleBulkDelete} className='flex items-center gap-2'>
                            {bulkDeleteLoading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                            <Trash2Icon className="h-4 w-4" />
                            Delete
                        </Button>
                        <Button disabled={bulkDeleteLoading} onClick={() => setBulkDeleteOpen(false)} className='flex items-center gap-2'>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={newTranslationOpen} onOpenChange={setNewTranslationOpen}>
                <DialogContent className='font-geist max-w-5xl'>
                    <DialogHeader>
                        <DialogTitle className='font-medium'>Create country translation</DialogTitle>
                    </DialogHeader>
                    <Form {...formNewTranslation}>
                        <form onSubmit={formNewTranslation.handleSubmit(onSubmitNewTranslation)} className="space-y-4 w-full max-w-7xl">
                            <div className="max-w-7xl flex max-lg:flex-wrap items-center justify-center w-full gap-4 border rounded-2xl p-6">
                                <FormField
                                    control={formNewTranslation.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className='flex-1'>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2' placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formNewTranslation.control}
                                    name="locale"
                                    render={({ field }) => (
                                        <FormItem className='flex-1'>
                                            <FormLabel>Locale</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2' placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {newTranslationError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                        {newTranslationError}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <DialogFooter>
                                <div className="space-y-4 max-w-7xl w-full space-x-2">
                                    <Button disabled={newTranslationLoading} type='submit' variant="outline" className='bg-main text-white hover:bg-main-hovered hover:text-white' size="default">
                                        {newTranslationLoading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                                        Create
                                    </Button>
                                    <Button onClick={() => setNewTranslationOpen(false)} disabled={newTranslationLoading} type='button' variant="outline" size="default">
                                        Cancel
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            <Dialog open={editCountryTranslationOpen} onOpenChange={setEditCountryTranslationOpen}>
                <DialogContent className='font-geist max-w-5xl'>
                    <DialogHeader>
                        <DialogTitle className='font-medium'>Edit {countryTranslations.find(countryTranslation => countryTranslation.id === editCountryTranslationId)?.name}</DialogTitle>
                    </DialogHeader>
                    <Form {...formEditCountryTranslation}>
                        <form onSubmit={formEditCountryTranslation.handleSubmit(onSubmitEditCountryTranslation)} className="space-y-4 w-full max-w-7xl">
                            <div className="max-w-7xl flex max-lg:flex-wrap items-center justify-center w-full gap-4 border rounded-2xl p-6">
                                <FormField
                                    control={formEditCountryTranslation.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className='flex-1'>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2' placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formEditCountryTranslation.control}
                                    name="locale"
                                    render={({ field }) => (
                                        <FormItem className='flex-1'>
                                            <FormLabel>Locale</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} className='max-w-[570px] focus-visible:ring-main focus-visible:ring-2' placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {editCountryTranslationError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                        {editCountryTranslationError}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <DialogFooter>
                                <div className="space-y-4 max-w-7xl w-full space-x-2">
                                    <Button disabled={editCountryTranslationLoading || (formEditCountryTranslation.getValues('name') === countryTranslations.find(countryTranslation => countryTranslation.id === editCountryTranslationId)?.name && formEditCountryTranslation.getValues('locale') === countryTranslations.find(countryTranslation => countryTranslation.id === editCountryTranslationId)?.locale)} type='submit' variant="outline" className='bg-main text-white hover:bg-main-hovered hover:text-white' size="default">
                                        {editCountryTranslationLoading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                                        Create
                                    </Button>
                                    <Button onClick={() => setEditCountryTranslationOpen(false)} disabled={editCountryTranslationLoading} type='button' variant="outline" size="default">
                                        Cancel
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className='font-geist'>
                    <DialogHeader>
                        <DialogTitle className='font-medium'>Delete Country</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {mainTranslation?.name || 'this country'}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button disabled={deleteLoading} variant="destructive" onClick={handleDelete} className='flex items-center gap-2'>
                            {deleteLoading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                            <Trash2Icon className="h-4 w-4" />
                            Delete
                        </Button>
                        <Button disabled={deleteLoading} onClick={() => setDeleteOpen(false)} className='flex items-center gap-2'>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}