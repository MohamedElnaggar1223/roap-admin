'use server'
import { db } from '@/db'
import { branches, branchTranslations, branchFacility, branchSport, programs, reviews } from '@/db/schema'
import { auth } from '@/auth'
import { and, eq, inArray, not, sql } from 'drizzle-orm'
import { revalidateTag, unstable_cache } from 'next/cache'
import { slugify } from '../utils'
import { cookies } from 'next/headers'
import { fetchPlaceInformation, getPlaceId } from './reviews.actions'

const getLocationsAction = async (academicId: number) => {
    return unstable_cache(async (academicId: number) => {
        const locations = await db
            .select({
                id: branches.id,
                name: sql<string>`t.name`,
                locale: sql<string>`t.locale`,
                nameInGoogleMap: branches.nameInGoogleMap,
                url: branches.url,
                isDefault: branches.isDefault,
                rate: branches.rate,
                sports: sql<string[]>`(
                SELECT COALESCE(array_agg(sport_id), ARRAY[]::integer[])
                FROM ${branchSport}
                WHERE ${branchSport.branchId} = ${branches.id}
            )`,
                amenities: sql<string[]>`(
                SELECT COALESCE(array_agg(facility_id), ARRAY[]::integer[])
                FROM ${branchFacility}
                WHERE ${branchFacility.branchId} = ${branches.id}
            )`
            })
            .from(branches)
            .innerJoin(
                sql`(
                SELECT bt.branch_id, bt.name, bt.locale
                FROM ${branchTranslations} bt
                WHERE bt.locale = 'en'
                UNION
                SELECT bt2.branch_id, bt2.name, bt2.locale
                FROM ${branchTranslations} bt2
                INNER JOIN (
                    SELECT branch_id, MIN(locale) as first_locale
                    FROM ${branchTranslations}
                    WHERE branch_id NOT IN (
                        SELECT branch_id 
                        FROM ${branchTranslations} 
                        WHERE locale = 'en'
                    )
                    GROUP BY branch_id
                ) first_trans ON bt2.branch_id = first_trans.branch_id 
                AND bt2.locale = first_trans.first_locale
            ) t`,
                sql`t.branch_id = ${branches.id}`
            )
            .where(eq(branches.academicId, academicId))

        console.log("Ran")

        const transformedLocations = locations.map(location => ({
            ...location,
            sports: location.sports || [],
            facilities: location.amenities || [],
        }))

        return {
            data: transformedLocations,
            error: null
        }
    }, [`locations-${academicId.toString()}`], { tags: [`locations-${academicId.toString()}`], revalidate: 3600 })(academicId)
}

export async function getLocations() {
    const session = await auth()

    if (!session?.user) {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const cookieStore = await cookies()
    const impersonatedId = session.user.role === 'admin'
        ? cookieStore.get('impersonatedAcademyId')?.value
        : null

    // Build the where condition based on user role and impersonation
    const academicId = session.user.role === 'admin' && impersonatedId
        ? parseInt(impersonatedId)
        : parseInt(session.user.id)

    // If not admin and not academic, return error
    if (session.user.role !== 'admin' && session.user.role !== 'academic') {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const academic = await db.query.academics.findFirst({
        where: (academics, { eq }) => eq(academics.userId, academicId),
        columns: {
            id: true,
        }
    })

    if (!academic) {
        return { error: 'Academy not found', data: null }
    }

    const locations = await getLocationsAction(academic.id)

    return locations
}

async function manageAssessmentPrograms(tx: any, branchId: number, academicId: number, sportIds: number[]) {
    await tx.insert(programs).values(
        sportIds.map(sportId => ({
            name: 'Assessment',
            type: 'TEAM',
            academicId: academicId,
            branchId: branchId,
            sportId: sportId,
            createdAt: sql`now()`,
            updatedAt: sql`now()`
        }))
    )
}

export async function createLocation(data: {
    name: string
    nameInGoogleMap: string
    url: string
    isDefault: boolean
    sports: number[]
    facilities: number[]
    latitude?: string
    longitude?: string
}) {
    const session = await auth()

    if (!session?.user) {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const cookieStore = await cookies()
    const impersonatedId = session.user.role === 'admin'
        ? cookieStore.get('impersonatedAcademyId')?.value
        : null

    // Build the where condition based on user role and impersonation
    const academicId = session.user.role === 'admin' && impersonatedId
        ? parseInt(impersonatedId)
        : parseInt(session.user.id)

    // If not admin and not academic, return error
    if (session.user.role !== 'admin' && session.user.role !== 'academic') {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const academy = await db.query.academics.findFirst({
        where: (academics, { eq }) => eq(academics.userId, academicId),
        columns: {
            id: true,
        }
    })

    try {
        return await db.transaction(async (tx) => {

            if (!academy) return { error: 'Academy not found' }

            const slug = slugify(data.name)
            /*const existingBranch = await tx.query.branches.findFirst({
                where: (branches, { eq }) => eq(branches.slug, slug)
            })

            if (existingBranch) {
                return {
                    error: 'A location with this name already exists',
                    field: 'name'
                }
            }*/

            if (data.isDefault) {
                await db
                    .update(branches)
                    .set({ isDefault: false })
                    .where(eq(branches.academicId, academy.id))
            }

            const ratesAndReviews = await fetchPlaceInformation(data.nameInGoogleMap)
            const placeId = await getPlaceId(data.nameInGoogleMap)

            const [branch] = await db
                .insert(branches)
                .values({
                    nameInGoogleMap: data.nameInGoogleMap,
                    url: data.url,
                    isDefault: data.isDefault ? true : false,
                    slug,
                    academicId: academy.id,
                    latitude: ratesAndReviews?.latitude?.toString() ?? '',
                    longitude: ratesAndReviews?.longitude?.toString() ?? '',
                    rate: ratesAndReviews?.rating ?? null,
                    reviews: ratesAndReviews?.reviews?.length ?? null,
                    placeId: placeId ?? null,
                })
                .returning({
                    id: branches.id,
                })

            if (ratesAndReviews?.reviews && placeId) {
                await tx.insert(reviews).values(
                    ratesAndReviews.reviews.map(review => ({
                        branchId: branch.id,
                        placeId: placeId,
                        authorName: review.author_name,
                        authorUrl: review.author_url || null,
                        language: review.language || 'en',
                        originalLanguage: review.original_language || review.language || 'en',
                        profilePhotoUrl: review.profile_photo_url || null,
                        rating: review.rating,
                        relativeTimeDescription: review.relative_time_description,
                        text: review.text,
                        time: review.time,
                        translated: review.translated || false,
                        createdAt: sql`now()`,
                        updatedAt: sql`now()`
                    }))
                )
            }

            await tx.insert(branchTranslations).values({
                branchId: branch.id,
                locale: 'en',
                name: data.name,
                createdAt: sql`now()`,
                updatedAt: sql`now()`,
            })

            await Promise.all([
                data.sports.length > 0 ?
                    tx.insert(branchSport)
                        .values(
                            data.sports.map(sportId => ({
                                branchId: branch.id,
                                sportId,
                                createdAt: sql`now()`,
                                updatedAt: sql`now()`,
                            }))
                        ) : Promise.resolve(),

                data.facilities.length > 0 ?
                    tx.insert(branchFacility)
                        .values(
                            data.facilities.map(facilityId => ({
                                branchId: branch.id,
                                facilityId,
                                createdAt: sql`now()`,
                                updatedAt: sql`now()`,
                            }))
                        ) : Promise.resolve(),
                data.sports.length > 0 ?
                    manageAssessmentPrograms(tx, branch.id, academy.id, data.sports) : Promise.resolve()
            ])


            return { data: branch, error: null, field: null }
        })
    } catch (error) {
        console.error('Error creating location:', error)
        if ((error as any)?.code === '23505' && (error as any)?.constraint === 'branches_slug_unique') {
            return {
                error: 'A location with this name already exists',
                field: 'name'
            }
        }
        return { error: 'Failed to create location' }
    }
    finally {
        revalidateTag(`locations-${academy?.id}`)
        revalidateTag(`programs-${academy?.id}`)
    }
}

export async function updateLocation(id: number, data: {
    name: string
    nameInGoogleMap: string
    url: string
    isDefault: boolean
    sports: number[]
    facilities: number[]
    latitude?: string
    longitude?: string
}) {
    const session = await auth()

    if (!session?.user) {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const cookieStore = await cookies()
    const impersonatedId = session.user.role === 'admin'
        ? cookieStore.get('impersonatedAcademyId')?.value
        : null

    // Build the where condition based on user role and impersonation
    const academicId = session.user.role === 'admin' && impersonatedId
        ? parseInt(impersonatedId)
        : parseInt(session.user.id)

    // If not admin and not academic, return error
    if (session.user.role !== 'admin' && session.user.role !== 'academic') {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const academy = await db.query.academics.findFirst({
        where: (academics, { eq }) => eq(academics.userId, academicId),
        columns: {
            id: true,
        }
    })

    if (!academy) return { error: 'Academy not found' }

    const ratesAndReviews = await fetchPlaceInformation(data.nameInGoogleMap)
    const placeId = await getPlaceId(data.nameInGoogleMap)

    try {
        await Promise.all([
            data.isDefault ? db
                .update(branches)
                .set({ isDefault: false, updatedAt: sql`now()` })
                .where(
                    and(
                        eq(branches.academicId, academy.id),
                        not(eq(branches.id, id))
                    )
                ) : Promise.resolve(),

            db.update(branches)
                .set({
                    nameInGoogleMap: data.nameInGoogleMap,
                    url: data.url,
                    isDefault: data.isDefault,
                    updatedAt: sql`now()`,
                    latitude: ratesAndReviews?.latitude?.toString() ?? '',
                    longitude: ratesAndReviews?.longitude?.toString() ?? '',
                    rate: ratesAndReviews?.rating ?? null,
                    reviews: ratesAndReviews?.reviews?.length ?? null,
                    placeId: placeId ?? null,
                })
                .where(eq(branches.id, id)),

            (async () => {
                if (ratesAndReviews?.reviews && placeId) {
                    // First, delete existing reviews for this branch
                    await db.delete(reviews)
                        .where(eq(reviews.branchId, id))

                    // Then insert new reviews
                    await db.insert(reviews).values(
                        ratesAndReviews.reviews.map(review => ({
                            branchId: id,
                            placeId: placeId,
                            authorName: review.author_name,
                            authorUrl: review.author_url || null,
                            language: review.language || 'en',
                            originalLanguage: review.original_language || review.language || 'en',
                            profilePhotoUrl: review.profile_photo_url || null,
                            rating: review.rating,
                            relativeTimeDescription: review.relative_time_description,
                            text: review.text,
                            time: review.time,
                            translated: review.translated || false,
                            createdAt: sql`now()`,
                            updatedAt: sql`now()`
                        }))
                    )
                }
            })(),

            db.update(branchTranslations)
                .set({
                    name: data.name,
                    updatedAt: sql`now()`
                })
                .where(
                    and(
                        eq(branchTranslations.branchId, id),
                        eq(branchTranslations.locale, 'en')
                    )
                )
        ])

        const [existingSports, existingFacilities] = await Promise.all([
            db
                .select({ sportId: branchSport.sportId })
                .from(branchSport)
                .where(eq(branchSport.branchId, id)),

            db
                .select({ facilityId: branchFacility.facilityId })
                .from(branchFacility)
                .where(eq(branchFacility.branchId, id))
        ])

        const existingSportIds = existingSports.map(s => s.sportId)
        const existingFacilityIds = existingFacilities.map(f => f.facilityId)

        const sportsToAdd = data.sports.filter(id => !existingSportIds.includes(id))
        const sportsToRemove = existingSportIds.filter(id => !data.sports.includes(id))
        const facilitiesToAdd = data.facilities.filter(id => !existingFacilityIds.includes(id))
        const facilitiesToRemove = existingFacilityIds.filter(id => !data.facilities.includes(id))

        await Promise.all([
            sportsToRemove.length > 0 ?
                db.delete(branchSport)
                    .where(and(
                        eq(branchSport.branchId, id),
                        inArray(branchSport.sportId, sportsToRemove)
                    )) : Promise.resolve(),

            sportsToAdd.length > 0 ?
                db.insert(branchSport)
                    .values(sportsToAdd.map(sportId => ({
                        branchId: id,
                        sportId,
                        createdAt: sql`now()`,
                        updatedAt: sql`now()`,
                    }))) : Promise.resolve(),

            facilitiesToRemove.length > 0 ?
                db.delete(branchFacility)
                    .where(and(
                        eq(branchFacility.branchId, id),
                        inArray(branchFacility.facilityId, facilitiesToRemove)
                    )) : Promise.resolve(),

            facilitiesToAdd.length > 0 ?
                db.insert(branchFacility)
                    .values(facilitiesToAdd.map(facilityId => ({
                        branchId: id,
                        facilityId,
                        createdAt: sql`now()`,
                        updatedAt: sql`now()`,
                    }))) : Promise.resolve(),
            sportsToRemove.length > 0 ?
                db.delete(programs)
                    .where(and(
                        eq(programs.branchId, id),
                        inArray(programs.sportId, sportsToRemove),
                        eq(programs.type, 'assessment')
                    )) : Promise.resolve(),
            sportsToAdd.length > 0 ?
                manageAssessmentPrograms(db, id, academy.id, sportsToAdd) : Promise.resolve()
        ])

        // revalidatePath('/academy/academy/locations')
        return { success: true }

    } catch (error) {
        console.error('Error updating location:', error)
        return { error: 'Failed to update location' }
    }
    finally {
        revalidateTag(`locations-${academy?.id}`)
        revalidateTag(`programs-${academy?.id}`)
    }
}

export async function deleteLocations(ids: number[]) {
    const session = await auth()

    if (!session?.user) {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const cookieStore = await cookies()
    const impersonatedId = session.user.role === 'admin'
        ? cookieStore.get('impersonatedAcademyId')?.value
        : null

    // Build the where condition based on user role and impersonation
    const academicId = session.user.role === 'admin' && impersonatedId
        ? parseInt(impersonatedId)
        : parseInt(session.user.id)

    // If not admin and not academic, return error
    if (session.user.role !== 'admin' && session.user.role !== 'academic') {
        return { error: 'You are not authorized to perform this action', field: null, data: [] }
    }

    const academy = await db.query.academics.findFirst({
        where: (academics, { eq }) => eq(academics.userId, academicId),
        columns: {
            id: true,
        }
    })

    if (!academy) return { error: 'Academy not found' }

    await Promise.all(ids.map(async id => await db.delete(branches).where(eq(branches.id, id))))

    revalidateTag(`locations-${academy?.id}`)

    return { success: true }
}