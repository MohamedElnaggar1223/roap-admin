import AthletesTable from "@/components/admin/athletes/AthletesTable"

export const metadata = {
    title: 'Athletes Management',
    description: 'View and manage all athletes',
}

export default function AthletesPage() {
    return (
        <div className="container mx-auto py-10">
            <AthletesTable />
        </div>
    )
}