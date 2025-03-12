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
    Eye,
    Filter,
    Loader2,
    Trash2Icon,
} from "lucide-react"
import { getPaginatedAthletes, deleteAthletes } from '@/lib/actions/athletes-admin.actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { useSuspenseQuery } from '@tanstack/react-query'

type Athlete = {
    id: number
    profileName: string | null
    academicName: string | null
    academicId: number | null
    sportName: string | null
    sportId: number | null
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
    userPhone: string
}

type AcademicGroup = {
    academicId: number
    academicName: string
    athletes: Athlete[]
    isExpanded: boolean
}

export default function AthletesTable() {
    const router = useRouter()

    // const [allAthletes, setAllAthletes] = useState<Athlete[]>([])
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
        userPhone: '',
    })
    const [expandedAcademics, setExpandedAcademics] = useState<number[]>([])

    // const fetchAthletes = () => {
    //     startTransition(async () => {
    //         // Fetch all athletes at once
    //         const result = await getPaginatedAthletes(1, 1000) // Large page size to get all
    //         if (result?.data) {
    //             setAllAthletes(result.data)
    //             setMeta({
    //                 ...meta,
    //                 totalItems: result.data.length,
    //                 totalPages: Math.ceil(result.data.length / meta.pageSize)
    //             })

    //             // Expand all academics by default
    //             const academicIds = [...new Set(result.data.map(athlete => athlete.academicId))];
    //             setExpandedAcademics(academicIds as number[]);
    //         }
    //         setSelectedRows([])
    //     })
    // }

    const { data: allAthletes, isLoading: isAthletesLoading, refetch } = useSuspenseQuery({
        queryKey: ['athletes'],
        queryFn: async () => {
            // Fetch all athletes at once
            const result = await getPaginatedAthletes(1, 1000) // Large page size to get all
            if (result?.data) {
                // setAllAthletes(result.data)
                // setMeta({
                //     ...meta,
                //     totalItems: result.data.length,
                //     totalPages: Math.ceil(result.data.length / meta.pageSize)
                // })

                // Expand all academics by default
                const academicIds = [...new Set(result.data.map(athlete => athlete.academicId))];
                setExpandedAcademics(academicIds as number[]);
            }
            setSelectedRows([])
            return result.data
        },
    })

    // Get all unique sports from athletes
    // const availableSports = useMemo(() => {
    //     const sportsMap = new Map<number, { id: number, name: string }>();

    //     allAthletes?.forEach(athlete => {
    //         if (athlete.sportId && athlete.sportName) {
    //             if (!sportsMap.has(athlete.sportId)) {
    //                 sportsMap.set(athlete.sportId, {
    //                     id: athlete.sportId,
    //                     name: athlete.sportName
    //                 });
    //             }
    //         }
    //     });

    //     return Array.from(sportsMap.values());
    // }, [allAthletes]);

    console.log("All athletes", allAthletes)

    // Apply filters in memory
    const filteredAthletes = useMemo(() => {
        return allAthletes?.filter(athlete => {
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

            // User phone filter
            if (filters.userPhone && athlete.userPhone) {
                if (!athlete.userPhone.toLowerCase().includes(filters.userPhone.toLowerCase())) {
                    return false
                }
            }

            return true
        })
    }, [allAthletes, filters])

    // Group athletes by academic
    const academicGroups = useMemo(() => {
        const groups = new Map<number, Athlete[]>();

        filteredAthletes.forEach(athlete => {
            if (athlete.academicId) {
                if (!groups.has(athlete.academicId)) {
                    groups.set(athlete.academicId, []);
                }
                groups.get(athlete.academicId)!.push(athlete);
            }
        });

        return Array.from(groups.entries()).map(([academicId, athletes]) => ({
            academicId,
            academicName: athletes[0]?.academicName || 'Unknown Academic',
            athletes,
            isExpanded: expandedAcademics.includes(academicId)
        }));
    }, [filteredAthletes, expandedAcademics]);

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
            totalItems: filteredAthletes.length,
            totalPages: Math.ceil(filteredAthletes.length / prev.pageSize) || 1
        }))
    }, [filteredAthletes, meta.pageSize])

    const handleRowSelect = (id: number) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const handleSelectAllInGroup = (academicId: number) => {
        const athleteIdsInGroup = academicGroups
            .find(g => g.academicId === academicId)?.athletes
            .map(athlete => athlete.id) || [];

        const allSelected = athleteIdsInGroup.every(id => selectedRows.includes(id));

        if (allSelected) {
            // Unselect all in this group
            setSelectedRows(prev => prev.filter(id => !athleteIdsInGroup.includes(id)));
        } else {
            // Select all in this group
            const newSelectedRows = [...selectedRows];
            athleteIdsInGroup.forEach(id => {
                if (!newSelectedRows.includes(id)) {
                    newSelectedRows.push(id);
                }
            });
            setSelectedRows(newSelectedRows);
        }
    };

    const handleSelectAll = () => {
        if (selectedRows.length === filteredAthletes.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredAthletes.map(athlete => athlete.id));
        }
    }

    const handleBulkDelete = async () => {
        setBulkDeleteLoading(true)
        await deleteAthletes(selectedRows)
        router.refresh()
        // fetchAthletes() // Refresh data after delete
        refetch()
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
            userPhone: '',
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
                                    <Badge className="ml-2">{group.athletes.length} Athletes</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={group.athletes.every(athlete => selectedRows.includes(athlete.id)) && group.athletes.length > 0}
                                        onCheckedChange={() => handleSelectAllInGroup(group.academicId)}
                                        aria-label={`Select all athletes for ${group.academicName}`}
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
                                                    checked={group.athletes.every(athlete =>
                                                        selectedRows.includes(athlete.id)) && group.athletes.length > 0}
                                                    onCheckedChange={() => handleSelectAllInGroup(group.academicId)}
                                                    aria-label={`Select all athletes for ${group.academicName}`}
                                                />
                                            </TableHead>
                                            <TableHead>Profile</TableHead>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Sport</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Phone number</TableHead>
                                            <TableHead>Guardian</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.athletes.map((athlete) => (
                                            <TableRow key={athlete.id.toString()}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedRows.includes(athlete.id)}
                                                        onCheckedChange={() => handleRowSelect(athlete.id)}
                                                        aria-label={`Select ${athlete.profileName}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{athlete.profileName || "-"}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{athlete.userName || "-"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {athlete.sportName ? (
                                                        <Badge variant="outline">{athlete.sportName}</Badge>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-gray-500">{athlete.userEmail || ""}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-gray-500">{athlete.userPhone || ""}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {athlete.firstGuardianName ? (
                                                        <div className="flex flex-col">
                                                            <span>{athlete.firstGuardianName}</span>
                                                            <span className="text-sm text-gray-500">{athlete.firstGuardianPhone || ""}</span>
                                                        </div>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/athletes/${athlete.id}`}>
                                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="h-4 w-4" />
                                                            <span className="sr-only">View</span>
                                                        </Button>
                                                    </Link>
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
                            No athletes found matching the current filters.
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                            {selectedRows.length} of {filteredAthletes.length} athletes selected
                        </div>

                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Total athletes: {filteredAthletes.length}</p>
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
                                <div className="grid gap-3">
                                    <label className="text-sm font-medium leading-none">
                                        Phone Number
                                    </label>
                                    <Input
                                        placeholder="Filter by phone number"
                                        value={filters.userPhone}
                                        onChange={(e) => handleFilterChange('userPhone', e.target.value)}
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