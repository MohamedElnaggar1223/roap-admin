import { getQueryClient } from "@/app/get-query-client"
import AthletesTable from "@/components/admin/athletes/AthletesTable"
import { getPaginatedAthletes } from "@/lib/actions/athletes-admin.actions"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

export const metadata = {
    title: 'Athletes Management',
    description: 'View and manage all athletes',
}

export default function AthletesPage() {
    const queryClient = getQueryClient()

    void queryClient.prefetchQuery({
        queryKey: ['athletes'],
        queryFn: async () => {
            const result = await getPaginatedAthletes(1, 1000) // Large page size to get all
            return result.data
        },
    })

    return (
        <div className="container mx-auto py-10">
            <HydrationBoundary state={dehydrate(queryClient)}>
                <AthletesTable />
            </HydrationBoundary>
        </div>
    )
}