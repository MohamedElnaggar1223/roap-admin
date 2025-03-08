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
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpIcon,
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
import { Badge } from "@/components/ui/badge"

type Sport = {
    id: number
    name: string
}

type Branch = {
    id: number
    name: string | null
    academicName: string | null
    academicId: number | null
    latitude: string | null
    longitude: string | null
    isDefault: boolean
    rate: number | null
    reviews: number | null
    hidden: boolean
    sports: Sport[]
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
    sportId: string
}

type AcademicGroup = {
    academicId: number
    academicName: string
    branches: Branch[]
    isExpanded: boolean
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
        sportId: 'all',
    })
    const [expandedAcademics, setExpandedAcademics] = useState<number[]>([])

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

                // Expand all academics by default
                const academicIds = [...new Set(result.data.map(branch => branch.academicId))];
                setExpandedAcademics(academicIds as number[]);
            }
            setSelectedRows([])
        })
    }

    useEffect(() => {
        fetchBranches()
    }, [])

    // Get all unique sports from branches
    const availableSports = useMemo(() => {
        const sportsMap = new Map<number, Sport>();

        allBranches.forEach(branch => {
            branch.sports?.forEach(sport => {
                if (!sportsMap.has(sport.id)) {
                    sportsMap.set(sport.id, sport);
                }
            });
        });

        return Array.from(sportsMap.values());
    }, [allBranches]);

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

            // Sport filter
            if (filters.sportId !== 'all' && branch.sports) {
                const sportId = parseInt(filters.sportId);
                if (!branch.sports.some(sport => sport.id === sportId)) {
                    return false;
                }
            }

            return true
        })
    }, [allBranches, filters])

    // Group branches by academic
    const academicGroups = useMemo(() => {
        const groups = new Map<number, Branch[]>();

        filteredBranches.forEach(branch => {
            if (branch.academicId) {
                if (!groups.has(branch.academicId)) {
                    groups.set(branch.academicId, []);
                }
                groups.get(branch.academicId)!.push(branch);
            }
        });

        return Array.from(groups.entries()).map(([academicId, branches]) => ({
            academicId,
            academicName: branches[0]?.academicName || 'Unknown Academic',
            branches,
            isExpanded: expandedAcademics.includes(academicId)
        }));
    }, [filteredBranches, expandedAcademics]);

    const handleToggleAcademicExpand = (academicId: number) => {
        setExpandedAcademics(prev =>
            prev.includes(academicId)
                ? prev.filter(id => id !== academicId)
                : [...prev, academicId]
        );
    };

    // Update meta information when filters change
    useEffect(() => {
        setMeta(prev => ({
            ...prev,
            page: 1, // Reset to first page when filters change
            totalItems: filteredBranches.length,
            totalPages: Math.ceil(filteredBranches.length / prev.pageSize) || 1
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
            totalPages: Math.ceil(filteredBranches.length / size) || 1
        }))
    }

    const handleRowSelect = (id: number) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const handleSelectAllInGroup = (academicId: number) => {
        const branchIdsInGroup = academicGroups
            .find(g => g.academicId === academicId)?.branches
            .map(branch => branch.id) || [];

        const allSelected = branchIdsInGroup.every(id => selectedRows.includes(id));

        if (allSelected) {
            // Unselect all in this group
            setSelectedRows(prev => prev.filter(id => !branchIdsInGroup.includes(id)));
        } else {
            // Select all in this group
            const newSelectedRows = [...selectedRows];
            branchIdsInGroup.forEach(id => {
                if (!newSelectedRows.includes(id)) {
                    newSelectedRows.push(id);
                }
            });
            setSelectedRows(newSelectedRows);
        }
    };

    const handleSelectAll = () => {
        if (selectedRows.length === filteredBranches.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredBranches.map(branch => branch.id));
        }
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
            sportId: '',
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
                    {academicGroups.map((group) => (
                        <div key={group.academicId} className="mb-6 border rounded-lg overflow-hidden">
                            <div
                                className="bg-gray-100 p-3 flex items-center justify-between cursor-pointer"
                                onClick={() => handleToggleAcademicExpand(group.academicId)}
                            >
                                <div className="flex items-center gap-2">
                                    {group.isExpanded ?
                                        <ChevronUpIcon className="h-5 w-5" /> :
                                        <ChevronDownIcon className="h-5 w-5" />
                                    }
                                    <h3 className="font-semibold text-lg">
                                        {group.academicName}
                                    </h3>
                                    <Badge className="ml-2">{group.branches.length} Branches</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={group.branches.every(branch => selectedRows.includes(branch.id)) && group.branches.length > 0}
                                        onCheckedChange={() => handleSelectAllInGroup(group.academicId)}
                                        aria-label={`Select all branches for ${group.academicName}`}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>

                            {group.isExpanded && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={group.branches.every(branch =>
                                                        selectedRows.includes(branch.id)) && group.branches.length > 0}
                                                    onCheckedChange={() => handleSelectAllInGroup(group.academicId)}
                                                    aria-label={`Select all branches for ${group.academicName}`}
                                                />
                                            </TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead className="text-center">Default</TableHead>
                                            <TableHead className="text-center">Rating</TableHead>
                                            <TableHead className="text-center">Reviews</TableHead>
                                            <TableHead className="text-center">Hidden</TableHead>
                                            <TableHead>Sports</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.branches.map((branch) => (
                                            <TableRow key={branch.id.toString()}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedRows.includes(branch.id)}
                                                        onCheckedChange={() => handleRowSelect(branch.id)}
                                                        aria-label={`Select ${branch.name}`}
                                                    />
                                                </TableCell>
                                                <TableCell>{branch.name}</TableCell>
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
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {branch.sports?.map(sport => (
                                                            <Badge key={sport.id} variant="outline">{sport.name}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    ))}

                    {isPending ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : academicGroups.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No branches found matching the current filters.
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                            {selectedRows.length} of {filteredBranches.length} branches selected
                        </div>

                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Total branches: {filteredBranches.length}</p>
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
                                    Sport
                                </label>
                                <Select
                                    value={filters.sportId}
                                    onValueChange={(value) => handleFilterChange('sportId', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select sport" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sports</SelectItem>
                                        {availableSports.map(sport => (
                                            <SelectItem key={sport.id} value={sport.id.toString()}>
                                                {sport.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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