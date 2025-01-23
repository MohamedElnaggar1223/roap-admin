import EditSpokenLanguage from "@/components/admin/spoken-languages/EditSpokenLanguage"
import { getSpokenLanguage } from "@/lib/actions/spoken-languages.actions"

type Params = Promise<{ id: string }>

type Props = {
    params: Params
}

export default async function EditSpokenLanguagePage({ params }: Props) {
    const { id } = await params

    const spokenLanguage = await getSpokenLanguage(id)

    return <EditSpokenLanguage
        spokenLanguage={spokenLanguage}
        spokenLanguageId={id}
        key={JSON.stringify(spokenLanguage)}
    />
}