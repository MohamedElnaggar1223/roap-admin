'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    Filter,
    Loader2,
    Trash2Icon,
} from "lucide-react"
import { getPaginatedAthletes, deleteAthletes } from '@/lib/actions/athletes-admin.actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Athlete = {
    id: number
    profileName: string | null
    academicName: string | null
    sportName: string | null
    type: 'primary' | 'fellow' | null
    userName: string | null
    userEmail: string | null
    userPhone: string | null
    firstGuardianName: string | null
    firstGuardianPhone: string | null
    certificate: string | null
}

type PaginationMeta = {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
}

type FilterState = {
    profileName: string
    academicName: string
    sportName: string
    userName: string
    userEmail: string
}

export default function AthletesTable() {
    const router = useRouter()

    const [allAthletes, setAllAthletes] = useState<Athlete[]>([])
    const [meta, setMeta] = useState<PaginationMeta>({
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
    })
    const [isPending, startTransition] = useTransition()
    const [selectedRows, setSelectedRows] = useState<number[]>([])
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [filters, setFilters] = useState<FilterState>({
        profileName: '',
        academicName: '',
        sportName: '',
        userName: '',
        userEmail: '',
    })

    const fetchAthletes = () => {
        startTransition(async () => {
            // Fetch all athletes at once
            const result = await getPaginatedAthletes(1, 1000) // Large page size to get all
            if (result?.data) {
                setAllAthletes(result.data)
                setMeta({
                    ...meta,
                    totalItems: result.data.length,
                    totalPages: Math.ceil(result.data.length / meta.pageSize)
                })
            }
            setSelectedRows([])
        })
    }

    useEffect(() => {
        fetchAthletes()
    }, [])

    // Apply filters in memory
    const filteredAthletes = useMemo(() => {
        return allAthletes.filter(athlete => {
            // Profile name filter
            if (filters.profileName && athlete.profileName) {
                if (!athlete.profileName.toLowerCase().includes(filters.profileName.toLowerCase())) {
                    return false
                }
            }

            // Academic name filter
            if (filters.academicName && athlete.academicName) {
                if (!athlete.academicName.toLowerCase().includes(filters.academicName.toLowerCase())) {
                    return false
                }
            }

            // Sport name filter
            if (filters.sportName && athlete.sportName) {
                if (!athlete.sportName.toLowerCase().includes(filters.sportName.toLowerCase())) {
                    return false
                }
            }

            // User name filter
            if (filters.userName && athlete.userName) {
                if (!athlete.userName.toLowerCase().includes(filters.userName.toLowerCase())) {
                    return false
                }
            }

            // User email filter
            if (filters.userEmail && athlete.userEmail) {
                if (!athlete.userEmail.toLowerCase().includes(filters.userEmail.toLowerCase())) {
                    return false
                }
            }

            return true
        })
    }, [allAthletes, filters])

    // Calculate pagination
    const paginatedAthletes = useMemo(() => {
        const startIndex = (meta.page - 1) * meta.pageSize
        const endIndex = startIndex + meta.pageSize
        return filteredAthletes.slice(startIndex, endIndex)
    }, [filteredAthletes, meta.page, meta.pageSize])

    // Update meta information when filters change
    useEffect(() => {
        setMeta(prev => ({
            ...prev,
            page: 1, // Reset to first page when filters change
            totalItems: filteredAthletes.length,
            totalPages: Math.ceil(filteredAthletes.length / prev.pageSize) || 1
        }))
    }, [filteredAthletes, meta.pageSize])

    const handlePageChange = (newPage: number) => {
        setMeta(prev => ({
            ...prev,
            page: newPage
        }))
    }

    const handlePageSizeChange = (newPageSize: string) => {
        const size = parseInt(newPageSize)
        setMeta(prev => ({
            ...prev,
            page: 1,
            pageSize: size,
            totalPages: Math.ceil(filteredAthletes.length / size) || 1
        }))
    }

    const handleRowSelect = (id: number) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const handleSelectAll = () => {
        setSelectedRows(
            selectedRows.length === paginatedAthletes.length ? [] : paginatedAthletes.map(athlete => athlete.id)
        )
    }

    const handleBulkDelete = async () => {
        setBulkDeleteLoading(true)
        await deleteAthletes(selectedRows)
        router.refresh()
        fetchAthletes() // Refresh data after delete
        setBulkDeleteLoading(false)
        setBulkDeleteOpen(false)
    }

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        // No need to refetch, just close the dialog
        setFiltersOpen(false)
    }

    const resetFilters = () => {
        setFilters({
            profileName: '',
            academicName: '',
            sportName: '',
            userName: '',
            userEmail: '',
        })
        setFiltersOpen(false)
    }

    return (
        <>
            <div className="flex flex-col w-full items-center justify-start h-full gap-6">
                <div className="flex max-w-7xl items-center justify-between gap-2 w-full">
                    <h1 className="text-3xl font-bold">Athletes</h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setFiltersOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </Button>
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
                    </div>
                </div>
                <div className="space-y-4 max-w-7xl w-full border rounded-2xl p-4 bg-[#fafafa]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedRows.length === paginatedAthletes.length && paginatedAthletes.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>Profile</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Academic</TableHead>
                                <TableHead>Sport</TableHead>
                                {/* <TableHead>Type</TableHead> */}
                                {/* <TableHead>Certificate</TableHead> */}
                                <TableHead>Guardian</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedAthletes.map((athlete) => (
                                <TableRow key={athlete.id.toString()}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedRows.includes(athlete.id)}
                                            onCheckedChange={() => handleRowSelect(athlete.id)}
                                            aria-label={`Select ${athlete.profileName}`}
                                        />
                                    </TableCell>
                                    <TableCell>{athlete.profileName || "-"}</TableCell>
                                    <TableCell>{athlete.userName || "-"}</TableCell>
                                    <TableCell>{athlete.userEmail || "-"}</TableCell>
                                    <TableCell>{athlete.userPhone || "-"}</TableCell>
                                    <TableCell>{athlete.academicName || "-"}</TableCell>
                                    <TableCell>{athlete.sportName || "-"}</TableCell>
                                    {/* <TableCell>
                                        {athlete.type === 'primary' ? "Primary" : "Fellow"}
                                    </TableCell> */}
                                    {/* <TableCell>
                                        {athlete.certificate ? "Yes" : "No"}
                                    </TableCell> */}
                                    <TableCell>
                                        {athlete.firstGuardianName || "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Rows per page</p>
                            <Select
                                value={meta.pageSize.toString()}
                                onValueChange={handlePageSizeChange}
                                disabled={isPending}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={meta.pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((size) => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(1)}
                                disabled={meta.page === 1 || isPending}
                            >
                                <ChevronsLeftIcon className="h-4 w-4" />
                                <span className="sr-only">First page</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(meta.page - 1)}
                                disabled={meta.page === 1 || isPending}
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                                <span className="sr-only">Previous page</span>
                            </Button>
                            <span className="text-sm">
                                Page {meta.page} of {meta.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(meta.page + 1)}
                                disabled={meta.page === meta.totalPages || isPending}
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                                <span className="sr-only">Next page</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(meta.totalPages)}
                                disabled={meta.page === meta.totalPages || isPending}
                            >
                                <ChevronsRightIcon className="h-4 w-4" />
                                <span className="sr-only">Last page</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <DialogContent className='font-geist'>
                    <DialogHeader>
                        <DialogTitle className='font-medium'>Delete Athletes</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete ({selectedRows.length}) athletes?
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

            {/* Filters Dialog */}
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DialogContent className='font-geist'>
                    <DialogHeader>
                        <DialogTitle className='font-medium'>Filter Athletes</DialogTitle>
                    </DialogHeader>
                    <Card>
                        <CardContent className="grid gap-6 pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-3">
                                    <label className="text-sm font-medium leading-none">
                                        Profile Name
                                    </label>
                                    <Input
                                        placeholder="Filter by profile name"
                                        value={filters.profileName}
                                        onChange={(e) => handleFilterChange('profileName', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-3">
                                    <label className="text-sm font-medium leading-none">
                                        User Name
                                    </label>
                                    <Input
                                        placeholder="Filter by user name"
                                        value={filters.userName}
                                        onChange={(e) => handleFilterChange('userName', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-3">
                                    <label className="text-sm font-medium leading-none">
                                        Academic
                                    </label>
                                    <Input
                                        placeholder="Filter by academic name"
                                        value={filters.academicName}
                                        onChange={(e) => handleFilterChange('academicName', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-3">
                                    <label className="text-sm font-medium leading-none">
                                        Sport
                                    </label>
                                    <Input
                                        placeholder="Filter by sport name"
                                        value={filters.sportName}
                                        onChange={(e) => handleFilterChange('sportName', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-3">
                                    <label className="text-sm font-medium leading-none">
                                        Email
                                    </label>
                                    <Input
                                        placeholder="Filter by email"
                                        value={filters.userEmail}
                                        onChange={(e) => handleFilterChange('userEmail', e.target.value)}
                                    />
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                    <DialogFooter className="flex justify-between">
                        <Button variant="outline" onClick={resetFilters}>
                            Reset Filters
                        </Button>
                        <Button onClick={applyFilters}>
                            Apply Filters
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}