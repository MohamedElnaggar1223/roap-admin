'use server'

import { db } from '@/db'
import { spokenLanguages, spokenLanguageTranslations } from '@/db/schema'
import { and, asc, eq, inArray, SQL, sql } from 'drizzle-orm'
import { isAdmin } from '../admin'
import { revalidatePath } from 'next/cache'

export async function getPaginatedSpokenLanguages(
    page: number = 1,
    pageSize: number = 10,
    orderBy: SQL = asc(spokenLanguages.id)
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
            id: spokenLanguages.id,
            name: sql<string>`t.name`,
            locale: sql<string>`t.locale`,
        })
        .from(spokenLanguages)
        .innerJoin(
            sql`(
                SELECT slt.spoken_language_id, slt.name, slt.locale
                FROM ${spokenLanguageTranslations} slt
                WHERE slt.locale = 'en'
                UNION
                SELECT slt2.spoken_language_id, slt2.name, slt2.locale
                FROM ${spokenLanguageTranslations} slt2
                INNER JOIN (
                    SELECT spoken_language_id, MIN(locale) as first_locale
                    FROM ${spokenLanguageTranslations}
                    WHERE spoken_language_id NOT IN (
                        SELECT spoken_language_id 
                        FROM ${spokenLanguageTranslations} 
                        WHERE locale = 'en'
                    )
                    GROUP BY spoken_language_id
                ) first_trans ON slt2.spoken_language_id = first_trans.spoken_language_id 
                AND slt2.locale = first_trans.first_locale
            ) t`,
            sql`t.spoken_language_id = ${spokenLanguages.id}`
        )
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset)

    const [{ count }] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(spokenLanguages)

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

export async function getSpokenLanguage(id: string) {
    const isAdminRes = await isAdmin()

    if (!isAdminRes) return null

    const data = await db.query.spokenLanguageTranslations.findFirst({
        where: eq(spokenLanguages.id, parseInt(id)),
        with: {
            spokenLanguage: {
                columns: {
                    id: true,
                }
            },
        },
        columns: {
            name: true
        }
    })

    return data
}

export const editSpokenLanguage = async (values: { name: string, id: number }) => {
    try {
        const isAdminRes = await isAdmin()

        if (!isAdminRes) return {
            error: 'You are not authorized to perform this action',
        }

        await db.transaction(async (tx) => {
            await tx
                .update(spokenLanguages)
                .set({
                    updatedAt: sql`now()`
                })
                .where(eq(spokenLanguages.id, values.id))

            await tx
                .update(spokenLanguageTranslations)
                .set({
                    name: values.name,
                    updatedAt: sql`now()`
                })
                .where(and(
                    eq(spokenLanguageTranslations.spokenLanguageId, values.id),
                    eq(spokenLanguageTranslations.locale, 'en')
                ))
        })

        revalidatePath('/spoken-languages')
        return { success: true }

    } catch (error) {
        console.error('Error updating spoken language:', error)

        if (error instanceof Error) {
            return {
                error: error.message
            }
        }

        return {
            error: 'Something went wrong while updating spoken language'
        }
    }
}

export const createSpokenLanguage = async (values: { name: string }) => {
    try {
        const isAdminRes = await isAdmin()

        if (!isAdminRes) return {
            error: 'You are not authorized to perform this action',
        }

        const [newLanguage] = await db
            .insert(spokenLanguages)
            .values({
                createdAt: sql`now()`,
                updatedAt: sql`now()`
            })
            .returning({
                id: spokenLanguages.id
            })

        if (!newLanguage?.id) {
            throw new Error("Failed to create spoken language")
        }

        await db.insert(spokenLanguageTranslations).values({
            spokenLanguageId: newLanguage.id,
            locale: 'en',
            name: values.name,
            createdAt: sql`now()`,
            updatedAt: sql`now()`
        })

        revalidatePath('/spoken-languages')
        return { success: true }

    } catch (error) {
        console.error('Error creating spoken language:', error)

        if (error instanceof Error) {
            return {
                error: error.message
            }
        }

        return {
            error: 'Something went wrong while creating spoken language'
        }
    }
}

export async function deleteSpokenLanguages(ids: number[]) {
    const isAdminRes = await isAdmin()

    if (!isAdminRes) return {
        error: 'You are not authorized to perform this action',
    }

    await db.delete(spokenLanguages).where(inArray(spokenLanguages.id, ids))

    revalidatePath('/spoken-languages')
}

export async function getAllSpokenLanguages() {
    try {
        const languages = await db
            .select({
                id: spokenLanguages.id,
                name: sql<string>`t.name`,
                locale: sql<string>`t.locale`,
            })
            .from(spokenLanguages)
            .innerJoin(
                sql`(
                    SELECT slt.spoken_language_id, slt.name, slt.locale
                    FROM ${spokenLanguageTranslations} slt
                    WHERE slt.locale = 'en'
                    UNION
                    SELECT slt2.spoken_language_id, slt2.name, slt2.locale
                    FROM ${spokenLanguageTranslations} slt2
                    INNER JOIN (
                        SELECT spoken_language_id, MIN(locale) as first_locale
                        FROM ${spokenLanguageTranslations}
                        WHERE spoken_language_id NOT IN (
                            SELECT spoken_language_id 
                            FROM ${spokenLanguageTranslations} 
                            WHERE locale = 'en'
                        )
                        GROUP BY spoken_language_id
                    ) first_trans ON slt2.spoken_language_id = first_trans.spoken_language_id 
                    AND slt2.locale = first_trans.first_locale
                ) t`,
                sql`t.spoken_language_id = ${spokenLanguages.id}`
            )

        return languages

    } catch (error) {
        console.error('Error fetching spoken languages:', error)
        return null
    }
}