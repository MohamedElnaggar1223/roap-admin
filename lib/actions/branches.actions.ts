'use server'

import { db } from "@/db"
import { branches, academics, academicTranslations, branchSport, sports, sportTranslations } from "@/db/schema"
import { inArray, sql, asc, desc, SQL } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isAdmin } from "../admin"

export async function getPaginatedBranches(
    page: number = 1,
    pageSize: number = 10,
    orderBy: SQL = asc(branches.id)
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

    const branchesWithTranslations = await db
        .select({
            id: branches.id,
            name: sql<string>`bt.name`,
            academicName: sql<string>`at.name`,
            academicId: branches.academicId,
            latitude: branches.latitude,
            longitude: branches.longitude,
            isDefault: branches.isDefault,
            rate: branches.rate,
            reviews: branches.reviews,
            hidden: branches.hidden,
        })
        .from(branches)
        .leftJoin(
            academics,
            sql`${branches.academicId} = ${academics.id}`
        )
        .leftJoin(
            sql`(
                SELECT bt.branch_id, bt.name, bt.locale
                FROM branch_translations bt
                WHERE bt.locale = 'en'
                UNION
                SELECT bt2.branch_id, bt2.name, bt2.locale
                FROM branch_translations bt2
                INNER JOIN (
                    SELECT branch_id, MIN(locale) as first_locale
                    FROM branch_translations
                    WHERE branch_id NOT IN (
                        SELECT branch_id
                        FROM branch_translations
                        WHERE locale = 'en'
                    )
                    GROUP BY branch_id
                ) first_trans ON bt2.branch_id = first_trans.branch_id
                AND bt2.locale = first_trans.first_locale
            ) bt`,
            sql`bt.branch_id = ${branches.id}`
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
        .orderBy(orderBy)

    const branchIds = branchesWithTranslations.map(branch => branch.id);

    const branchSportsResult = await db
        .select({
            branchId: branchSport.branchId,
            sportId: sports.id,
            sportName: sql<string>`st.name`,
        })
        .from(branchSport)
        .leftJoin(
            sports,
            sql`${branchSport.sportId} = ${sports.id}`
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
        .where(inArray(branchSport.branchId, branchIds))

    // Organize sports by branch
    const sportsByBranch = new Map();
    branchSportsResult.forEach(item => {
        if (!sportsByBranch.has(item.branchId)) {
            sportsByBranch.set(item.branchId, []);
        }
        sportsByBranch.get(item.branchId).push({
            id: item.sportId,
            name: item.sportName
        });
    });

    // Combine branch data with sports
    const data = branchesWithTranslations.map(branch => ({
        ...branch,
        sports: sportsByBranch.get(branch.id) || []
    }));

    // Get the total count of branches
    const [{ count }] = await db
        .select({
            count: sql`count(*)`.mapWith(Number)
        })
        .from(branches)

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

export const deleteBranches = async (ids: number[]) => {
    const isAdminRes = await isAdmin()
    if (!isAdminRes) return {
        data: null,
        error: 'You are not authorized to perform this action',
    }

    await db.delete(branches).where(inArray(branches.id, ids))
    revalidatePath('/branches')
}