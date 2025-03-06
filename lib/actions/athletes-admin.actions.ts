'use server'

import { db } from "@/db"
import { academicAthletic, users, profiles, academics, sports, sportTranslations, academicTranslations } from "@/db/schema"
import { inArray, sql, asc, desc, SQL } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isAdmin } from "../admin"

export async function getPaginatedAthletes(
    page: number = 1,
    pageSize: number = 10,
    orderBy: SQL = asc(academicAthletic.id)
) {
    const isAdminRes = await isAdmin()
    if (!isAdminRes) return {
        data: [],
        meta: {
            page: 1,
            pageSize: 10,
            totalItems: 0,
            totalPages: 0,
        },
    }

    const offset = (page - 1) * pageSize

    const data = await db
        .select({
            id: academicAthletic.id,
            profileName: profiles.name,
            academicName: sql<string>`at.name`,
            sportName: sql<string>`st.name`,
            type: academicAthletic.type,
            userName: users.name,
            userEmail: users.email,
            userPhone: users.phoneNumber,
            firstGuardianName: academicAthletic.firstGuardianName,
            firstGuardianPhone: academicAthletic.firstGuardianPhone,
            certificate: academicAthletic.certificate,
        })
        .from(academicAthletic)
        .leftJoin(
            users,
            sql`${academicAthletic.userId} = ${users.id}`
        )
        .leftJoin(
            profiles,
            sql`${academicAthletic.profileId} = ${profiles.id}`
        )
        .leftJoin(
            academics,
            sql`${academicAthletic.academicId} = ${academics.id}`
        )
        .leftJoin(
            sports,
            sql`${academicAthletic.sportId} = ${sports.id}`
        )
        .leftJoin(
            sql`(
                SELECT at.academic_id, at.name, at.locale
                FROM academic_translations at
                WHERE at.locale = 'en'
                UNION
                SELECT at2.academic_id, at2.name, at2.locale
                FROM academic_translations at2
                INNER JOIN (
                    SELECT academic_id, MIN(locale) as first_locale
                    FROM academic_translations
                    WHERE academic_id NOT IN (
                        SELECT academic_id
                        FROM academic_translations
                        WHERE locale = 'en'
                    )
                    GROUP BY academic_id
                ) first_trans ON at2.academic_id = first_trans.academic_id
                AND at2.locale = first_trans.first_locale
            ) at`,
            sql`at.academic_id = ${academics.id}`
        )
        .leftJoin(
            sql`(
                SELECT st.sport_id, st.name, st.locale
                FROM sport_translations st
                WHERE st.locale = 'en'
                UNION
                SELECT st2.sport_id, st2.name, st2.locale
                FROM sport_translations st2
                INNER JOIN (
                    SELECT sport_id, MIN(locale) as first_locale
                    FROM sport_translations
                    WHERE sport_id NOT IN (
                        SELECT sport_id
                        FROM sport_translations
                        WHERE locale = 'en'
                    )
                    GROUP BY sport_id
                ) first_trans ON st2.sport_id = first_trans.sport_id
                AND st2.locale = first_trans.first_locale
            ) st`,
            sql`st.sport_id = ${sports.id}`
        )
        .orderBy(orderBy)

    // Get the total count
    const [{ count }] = await db
        .select({
            count: sql`count(*)`.mapWith(Number)
        })
        .from(academicAthletic)

    return {
        data,
        meta: {
            page,
            pageSize,
            totalItems: count,
            totalPages: Math.ceil(count / pageSize),
        },
    }
}

export const deleteAthletes = async (ids: number[]) => {
    const isAdminRes = await isAdmin()
    if (!isAdminRes) return {
        data: null,
        error: 'You are not authorized to perform this action',
    }

    await db.delete(academicAthletic).where(inArray(academicAthletic.id, ids))
    revalidatePath('/athletes')
}