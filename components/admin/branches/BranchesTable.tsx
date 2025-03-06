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
import { getPaginatedBranches, deleteBranches } from '@/lib/actions/branches.actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Branch = {
    id: number
    name: string | null
    academicName: string | null
    latitude: string | null
    longitude: string | null
    isDefault: boolean
    rate: number | null
    reviews: number | null
    hidden: boolean
}

type PaginationMeta = {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
}

type FilterState = {
    academicName: string
    hidden: string
    isDefault: string
}

export default function BranchesTable() {
    const router = useRouter()

    const [allBranches, setAllBranches] = useState<Branch[]>([])
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
        academicName: '',
        hidden: 'all',
        isDefault: 'all',
    })

    const fetchBranches = () => {
        startTransition(async () => {
            // Fetch all branches at once
            const result = await getPaginatedBranches(1, 1000) // Large page size to get all
            if (result?.data) {
                setAllBranches(result.data)
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
        fetchBranches()
    }, [])

    // Apply filters in memory
    const filteredBranches = useMemo(() => {
        return allBranches.filter(branch => {
            // Academic name filter
            if (filters.academicName && branch.academicName) {
                if (!branch.academicName.toLowerCase().includes(filters.academicName.toLowerCase())) {
                    return false
                }
            }

            // Hidden status filter
            if (filters.hidden === 'true' && !branch.hidden) {
                return false
            }
            if (filters.hidden === 'false' && branch.hidden) {
                return false
            }

            // Default branch filter
            if (filters.isDefault === 'true' && !branch.isDefault) {
                return false
            }
            if (filters.isDefault === 'false' && branch.isDefault) {
                return false
            }

            return true
        })
    }, [allBranches, filters])

    // Calculate pagination
    const paginatedBranches = useMemo(() => {
        const startIndex = (meta.page - 1) * meta.pageSize
        const endIndex = startIndex + meta.pageSize
        return filteredBranches.slice(startIndex, endIndex)
    }, [filteredBranches, meta.page, meta.pageSize])

    // Update meta information when filters change
    useEffect(() => {
        setMeta(prev => ({
            ...prev,
            page: 1, // Reset to first page when filters change
            totalItems: filteredBranches.length,
            totalPages: Math.ceil(filteredBranches.length / prev.pageSize)
        }))
    }, [filteredBranches, meta.pageSize])

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
            totalPages: Math.ceil(filteredBranches.length / size)
        }))
    }

    const handleRowSelect = (id: number) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const handleSelectAll = () => {
        setSelectedRows(
            selectedRows.length === paginatedBranches.length ? [] : paginatedBranches.map(branch => branch.id)
        )
    }

    const handleBulkDelete = async () => {
        setBulkDeleteLoading(true)
        await deleteBranches(selectedRows)
        router.refresh()
        fetchBranches() // Refresh data after delete
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
            academicName: '',
            hidden: '',
            isDefault: '',
        })
        setFiltersOpen(false)
    }

    return (
        <>
            <div className="flex flex-col w-full items-center justify-start h-full gap-6">
                <div className="flex max-w-7xl items-center justify-between gap-2 w-full">
                    <h1 className="text-3xl font-bold">Branches</h1>
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
                                        checked={selectedRows.length === paginatedBranches.length && paginatedBranches.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Academic</TableHead>
                                <TableHead className="text-center">Default</TableHead>
                                <TableHead className="text-center">Rating</TableHead>
                                <TableHead className="text-center">Reviews</TableHead>
                                <TableHead className="text-center">Hidden</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBranches.map((branch) => (
                                <TableRow key={branch.id.toString()}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedRows.includes(branch.id)}
                                            onCheckedChange={() => handleRowSelect(branch.id)}
                                            aria-label={`Select ${branch.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>{branch.name}</TableCell>
                                    <TableCell>{branch.academicName}</TableCell>
                                    <TableCell className="text-center">
                                        {branch.isDefault ? "Yes" : "No"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {branch.rate ? branch.rate.toFixed(1) : "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {branch.reviews || 0}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {branch.hidden ? "Yes" : "No"}
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
                                Page {meta.page} of {meta.totalPages || 1}
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
                        <DialogTitle className='font-medium'>Delete Branches</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete ({selectedRows.length}) branches?
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
                        <DialogTitle className='font-medium'>Filter Branches</DialogTitle>
                    </DialogHeader>
                    <Card>
                        <CardContent className="grid gap-6 pt-6">
                            <div className="grid gap-3">
                                <label className="text-sm font-medium leading-none">
                                    Academic Name
                                </label>
                                <Input
                                    placeholder="Filter by academic name"
                                    value={filters.academicName}
                                    onChange={(e) => handleFilterChange('academicName', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-3">
                                <label className="text-sm font-medium leading-none">
                                    Hidden Status
                                </label>
                                <Select
                                    value={filters.hidden}
                                    onValueChange={(value) => handleFilterChange('hidden', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select hidden status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="true">Hidden</SelectItem>
                                        <SelectItem value="false">Visible</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-3">
                                <label className="text-sm font-medium leading-none">
                                    Default Branch
                                </label>
                                <Select
                                    value={filters.isDefault}
                                    onValueChange={(value) => handleFilterChange('isDefault', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select default status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="true">Default</SelectItem>
                                        <SelectItem value="false">Not Default</SelectItem>
                                    </SelectContent>
                                </Select>
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