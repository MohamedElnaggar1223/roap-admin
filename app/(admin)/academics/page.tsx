'use client'

import { useState, useEffect, useTransition } from 'react'
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
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronsLeftIcon,
	ChevronsRightIcon,
	Edit,
	Eye,
	EyeOff,
	Loader2,
	SearchIcon,
	Trash2Icon,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { acceptAcademic, deleteAcademics, getPaginatedAcademics, rejectAcademic, toggleAcademicHidden } from '@/lib/actions/academics.actions'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { startImpersonation, stopImpersonation } from '@/lib/actions/impersonations.actions'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Academic = {
	id: number
	slug: string
	description: string | null
	entryFees: number
	userId: number | null
	userName: string | null
	onboarded: boolean
	status: 'pending' | 'accepted' | 'rejected' | null
	hidden: boolean
	sportsCount: number;
	locationsCount: number;
}

type PaginationMeta = {
	page: number
	pageSize: number
	totalItems: number
	totalPages: number
}

const AcademicsTable = ({ academics, selectedRows, onSelectRow, onSelectAll, handleChange, setRefetch, meta }: {
	academics: Academic[]
	selectedRows: number[]
	onSelectRow: (id: number) => void
	onSelectAll: () => void
	statusFilter: string
	handleChange: (academyId: string) => Promise<void>
	setRefetch: React.Dispatch<React.SetStateAction<boolean>>
	meta: PaginationMeta
}) => {
	const router = useRouter()
	const [acceptAcademicLoading, setAcceptAcademicLoading] = useState<number | null>(null)
	const [rejectAcademicOpen, setRejectAcademicOpen] = useState(false)
	const [rejectAcademicId, setRejectAcademicId] = useState<number | null>(null)
	const [rejectAcademicLoading, setRejectAcademicLoading] = useState(false)
	const [toggleVisibilityLoading, setToggleVisibilityLoading] = useState<number | null>(null)

	const handleAcceptAcademic = async (academicId: number) => {
		setAcceptAcademicLoading(academicId)
		await acceptAcademic(academicId)
		setAcceptAcademicLoading(null)
		router.refresh()
		setRefetch((prev) => !prev)
	}

	const handleRejectAcademic = async () => {
		if (!rejectAcademicId) return
		setRejectAcademicLoading(true)
		await rejectAcademic(rejectAcademicId)
		setRejectAcademicLoading(false)
		router.refresh()
		setRefetch((prev) => !prev)
	}

	const handleToggleVisibility = async (academicId: number) => {
		setToggleVisibilityLoading(academicId)
		try {
			await toggleAcademicHidden(academicId)
			setRefetch(prev => !prev)
		} catch (error) {
			console.error('Error toggling visibility:', error)
		} finally {
			setToggleVisibilityLoading(null)
		}
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">
							#
						</TableHead>
						<TableHead className="w-12">
							<Checkbox
								checked={selectedRows.length === academics.length && academics.length > 0}
								onCheckedChange={onSelectAll}
								aria-label="Select all"
							/>
						</TableHead>
						<TableHead className="min-w-[400px]">Name</TableHead>
						<TableHead className="min-w-[600px]">Description</TableHead>
						<TableHead className="min-w-[200px]">Entry Fees</TableHead>
						<TableHead className="min-w-[200px]">Academic Lead</TableHead>
						<TableHead className="min-w-[200px]">Status</TableHead>
						<TableHead className="min-w-[200px]">Sports</TableHead>
						<TableHead className="min-w-[200px]">Locations</TableHead>
						<TableHead className="sr-only">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{academics.map((academic, index) => (
						<TableRow key={academic.id}>
							<TableCell>{(meta.page - 1) * meta.pageSize + index + 1}</TableCell>
							<TableCell>
								<Checkbox
									checked={selectedRows.includes(academic.id)}
									onCheckedChange={() => onSelectRow(academic.id)}
									aria-label={`Select ${academic.slug}`}
								/>
							</TableCell>
							<TableCell>{academic.slug}</TableCell>
							<TableCell>{academic.description ? academic.description.substring(0, 100) + '...' : 'N/A'}</TableCell>
							<TableCell>${academic.entryFees.toFixed(2)}</TableCell>
							<TableCell>{academic.userName || 'N/A'}</TableCell>
							<TableCell>{academic.status || 'pending'}</TableCell>
							<TableCell>{academic.sportsCount}</TableCell>
							<TableCell>{academic.locationsCount}</TableCell>
							<TableCell>
								<div className="flex space-x-2">
									{/* <Button variant="outline" className="flex items-center gap-2">
										<Edit className="h-4 w-4" />
										Edit
									</Button> */}
									<Button onClick={() => handleChange(academic.userId?.toString()!)} variant="outline" className="flex items-center gap-2">
										<Eye className="h-4 w-4" />
										View
									</Button>
									<Button
										onClick={() => handleToggleVisibility(academic.id)}
										variant="outline"
										className={cn("flex items-center gap-2", academic.hidden && 'bg-black text-white')}
										disabled={toggleVisibilityLoading === academic.id}
									>
										{toggleVisibilityLoading === academic.id ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : academic.hidden ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
										{academic.hidden ? 'Show' : 'Hide'}
									</Button>
									{academic.status === 'pending' && (
										<>
											<Button
												disabled={acceptAcademicLoading === academic.id}
												onClick={() => handleAcceptAcademic(academic.id)}
												className="bg-green-600 text-white hover:bg-green-700"
											>
												Accept
											</Button>
											<Button
												disabled={acceptAcademicLoading === academic.id}
												onClick={() => { setRejectAcademicOpen(true); setRejectAcademicId(academic.id); }}
												className="bg-red-600 text-white hover:bg-red-700"
											>
												Reject
											</Button>
										</>
									)}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<Dialog open={rejectAcademicOpen} onOpenChange={setRejectAcademicOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Academic</DialogTitle>
						<DialogDescription>
							Are you sure you want to reject this academic?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							disabled={rejectAcademicLoading}
							variant="destructive"
							onClick={handleRejectAcademic}
						>
							{rejectAcademicLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Reject
						</Button>
						<Button
							disabled={rejectAcademicLoading}
							onClick={() => setRejectAcademicOpen(false)}
						>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

export default function AcademicsContainer() {
	const [academics, setAcademics] = useState<Academic[]>([])
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
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [activeTab, setActiveTab] = useState('all')
	const [loading, setLoading] = useState(false)
	const [refetch, setRefetch] = useState(false)
	const [searchInput, setSearchInput] = useState('')
	const [searchQuery, setSearchQuery] = useState('')
	const [filteredAcademics, setFilteredAcademics] = useState<Academic[]>([])
	const [totalAcademics, setTotalAcademics] = useState<number>(0)
	const router = useRouter()

	const fetchAcademics = (page: number, pageSize: number) => {
		startTransition(async () => {
			const result = await getPaginatedAcademics(page, pageSize)
			setAcademics(result?.data)
			setMeta(result?.meta)
			setTotalAcademics(result?.meta.totalItems || 0)
		})
	}

	useEffect(() => {
		fetchAcademics(meta.page, meta.pageSize)
	}, [refetch])

	const handlePageChange = (newPage: number) => {
		fetchAcademics(newPage, meta.pageSize)
	}

	const handlePageSizeChange = (newPageSize: string) => {
		fetchAcademics(1, parseInt(newPageSize))
	}

	const handleRowSelect = (id: number) => {
		setSelectedRows(prev =>
			prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
		)
	}

	const handleSelectAll = () => {
		setSelectedRows(
			selectedRows.length === academics.length ? [] : academics.map(academy => academy.id)
		)
	}

	const handleBulkDelete = async () => {
		setBulkDeleteLoading(true)
		await deleteAcademics(selectedRows)
		fetchAcademics(meta.page, meta.pageSize)
		setSelectedRows([])
		setBulkDeleteLoading(false)
		setBulkDeleteOpen(false)
	}

	useEffect(() => {
		filterAcademics()
	}, [academics, statusFilter, activeTab, searchQuery])

	const debouncedSearch = useDebouncedCallback((value: string) => {
		setSearchQuery(value)
	}, 300)

	const filterAcademics = () => {
		let filtered = [...academics]

		// Apply status filter
		if (activeTab === 'onboarded') {
			filtered = filtered.filter(academy => academy.onboarded)
		}
		if (statusFilter !== 'all') {
			filtered = filtered.filter(academy => academy.status === statusFilter)
		}

		// Apply search query
		if (searchQuery) {
			const lowercasedValue = searchQuery.toLowerCase()
			filtered = filtered.filter(academy =>
				academy.slug?.toLowerCase().includes(lowercasedValue) ||
				academy.description?.toLowerCase().includes(lowercasedValue) ||
				academy.userName?.toLowerCase().includes(lowercasedValue)
			)
		}

		setFilteredAcademics(filtered)
	}

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value
		setSearchInput(value)
		debouncedSearch(value)
	}

	const handleChange = async (academyId: string) => {
		try {
			setLoading(true)
			if (academyId === 'stop') {
				await stopImpersonation()
			} else {
				await startImpersonation(parseInt(academyId))
			}
			router.push('/academy/dashboard')
		} catch (error) {
			console.error('Failed to switch academy:', error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col w-full items-center justify-center h-full gap-6">
			<div className="flex max-w-7xl items-center justify-between gap-2 w-full">
				<h1 className="text-3xl font-bold">Academics</h1>
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
						Total Academics: {totalAcademics}
					</span>
					{filteredAcademics.length !== totalAcademics && (
						<span className="text-sm text-gray-500">
							(Showing {filteredAcademics.length})
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
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
					{activeTab === 'all' && (
						<>
							<Label htmlFor="statusFilter" className="text-sm font-medium">Status: </Label>
							<Select onValueChange={setStatusFilter} value={statusFilter}>
								<SelectTrigger id="statusFilter" className="w-[180px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="accepted">Accepted</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
								</SelectContent>
							</Select>
						</>
					)}
					<div className="relative">
						<SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
						<Input
							type="search"
							placeholder="Search..."
							value={searchInput}
							onChange={handleSearchChange}
							className="focus-visible:ring-2 bg-white focus-visible:ring-main pl-8 pr-4 py-2"
						/>
					</div>
				</div>
			</div>

			<div className="space-y-4 max-w-7xl w-full border rounded-2xl p-4 bg-[#fafafa]">
				<Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="all">All Academics</TabsTrigger>
						<TabsTrigger value="onboarded">On Boarded Academics</TabsTrigger>
					</TabsList>
					<TabsContent value="all" className="mt-6">
						<AcademicsTable
							academics={filteredAcademics}
							selectedRows={selectedRows}
							onSelectRow={handleRowSelect}
							onSelectAll={handleSelectAll}
							statusFilter={statusFilter}
							handleChange={handleChange}
							setRefetch={setRefetch}
							meta={meta}
						/>
					</TabsContent>
					<TabsContent value="onboarded" className="mt-6">
						<AcademicsTable
							academics={filteredAcademics}
							selectedRows={selectedRows}
							onSelectRow={handleRowSelect}
							onSelectAll={handleSelectAll}
							statusFilter={statusFilter}
							handleChange={handleChange}
							setRefetch={setRefetch}
							meta={meta}
						/>
					</TabsContent>
				</Tabs>

				<div className="flex items-center justify-between pt-4">
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

			<Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Academics</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete ({selectedRows.length}) academics?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							disabled={bulkDeleteLoading}
							variant="destructive"
							onClick={handleBulkDelete}
							className="flex items-center gap-2"
						>
							{bulkDeleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							<Trash2Icon className="h-4 w-4" />
							Delete
						</Button>
						<Button
							disabled={bulkDeleteLoading}
							onClick={() => setBulkDeleteOpen(false)}
						>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}