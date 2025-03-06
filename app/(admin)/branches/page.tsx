import BranchesTable from "@/components/admin/branches/BranchesTable"

export const metadata = {
    title: 'Branches Management',
    description: 'View and manage all branches',
}

export default function BranchesPage() {
    return (
        <div className="container mx-auto py-10">
            <BranchesTable />
        </div>
    )
}