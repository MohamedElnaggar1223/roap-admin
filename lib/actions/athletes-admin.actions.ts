'use server'

import { db } from "@/db"
import {
    academicAthletic, users, profiles, academics, sports,
    sportTranslations, academicTranslations, bookings, bookingSessions,
    packages, programs, branches
} from "@/db/schema"
import { inArray, sql, asc, desc, SQL, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isAdmin } from "../admin"
import { getImageUrl } from "../supabase-images-server"

export async function getPaginatedAthletes(
    page: number = 1,
    pageSize: number = 10,
    orderBy: SQL = asc(academicAthletic.id)
) {
    console.log("GETTING ATHLETES")
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
            academicId: academicAthletic.academicId,
            sportName: sql<string>`st.name`,
            sportId: academicAthletic.sportId,
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

export async function getAthleteById(id: number) {
    const isAdminRes = await isAdmin()
    if (!isAdminRes) return null;

    // Get athlete details
    const [athlete] = await db
        .select({
            id: academicAthletic.id,
            academicId: academicAthletic.academicId,
            userId: academicAthletic.userId,
            profileId: academicAthletic.profileId,
            sportId: academicAthletic.sportId,
            certificate: academicAthletic.certificate,
            type: academicAthletic.type,
            firstGuardianName: academicAthletic.firstGuardianName,
            firstGuardianRelationship: academicAthletic.firstGuardianRelationship,
            firstGuardianEmail: academicAthletic.firstGuardianEmail,
            firstGuardianPhone: academicAthletic.firstGuardianPhone,
            secondGuardianName: academicAthletic.secondGuardianName,
            secondGuardianRelationship: academicAthletic.secondGuardianRelationship,
            secondGuardianEmail: academicAthletic.secondGuardianEmail,
            secondGuardianPhone: academicAthletic.secondGuardianPhone,
            profileName: profiles.name,
            profileGender: profiles.gender,
            profileBirthday: profiles.birthday,
            profileImage: profiles.image,
            profileRelationship: profiles.relationship,
            profileCountry: profiles.country,
            profileNationality: profiles.nationality,
            profileCity: profiles.city,
            profileStreetAddress: profiles.streetAddress,
            userName: users.name,
            userEmail: users.email,
            userPhone: users.phoneNumber,
            userIsAthletic: users.isAthletic,
            academicName: sql<string>`at.name`,
            academicSlug: academics.slug,
            academicImage: academics.image,
            sportName: sql<string>`st.name`,
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
        .where(eq(academicAthletic.id, id))
        .limit(1)

    if (!athlete || !athlete.profileId) {
        return null;
    }

    // Get bookings for this athlete
    const bookings_data = await db
        .select({
            id: bookings.id,
            status: bookings.status,
            packageId: bookings.packageId,
            price: bookings.price,
            packagePrice: bookings.packagePrice,
            entryFeesPaid: bookings.entryFeesPaid,
            createdAt: bookings.createdAt,
            updatedAt: bookings.updatedAt,
            packageName: packages.name,
            programId: packages.programId,
            programName: programs.name,
            branchId: programs.branchId,
            branchName: sql<string>`bt.name`,
            sessionCount: sql<number>`COUNT(${bookingSessions.id})`.mapWith(Number),
            upcomingSessions: sql<number>`SUM(CASE WHEN ${bookingSessions.status} = 'upcoming' THEN 1 ELSE 0 END)`.mapWith(Number),
            completedSessions: sql<number>`SUM(CASE WHEN ${bookingSessions.status} = 'accepted' THEN 1 ELSE 0 END)`.mapWith(Number),
            cancelledSessions: sql<number>`SUM(CASE WHEN ${bookingSessions.status} = 'cancelled' THEN 1 ELSE 0 END)`.mapWith(Number),
            nextSessionDate: sql<string>`MIN(CASE WHEN ${bookingSessions.status} = 'upcoming' THEN ${bookingSessions.date}::text ELSE NULL END)`,
        })
        .from(bookings)
        .leftJoin(
            packages,
            sql`${bookings.packageId} = ${packages.id}`
        )
        .leftJoin(
            programs,
            sql`${packages.programId} = ${programs.id}`
        )
        .leftJoin(
            branches,
            sql`${programs.branchId} = ${branches.id}`
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
            bookingSessions,
            sql`${bookings.id} = ${bookingSessions.bookingId}`
        )
        .where(eq(bookings.profileId, athlete.profileId))
        .groupBy(
            bookings.id,
            packages.id,
            programs.id,
            branches.id,
            sql`bt.name`
        )
        .orderBy(desc(bookings.createdAt))

    // Get recent booking sessions for this athlete
    const recentSessions = await db
        .select({
            id: bookingSessions.id,
            date: bookingSessions.date,
            from: bookingSessions.from,
            to: bookingSessions.to,
            status: bookingSessions.status,
            bookingId: bookingSessions.bookingId,
            packageName: packages.name,
            branchName: sql<string>`bt.name`,
        })
        .from(bookingSessions)
        .innerJoin(
            bookings,
            sql`${bookingSessions.bookingId} = ${bookings.id}`
        )
        .leftJoin(
            packages,
            sql`${bookings.packageId} = ${packages.id}`
        )
        .leftJoin(
            programs,
            sql`${packages.programId} = ${programs.id}`
        )
        .leftJoin(
            branches,
            sql`${programs.branchId} = ${branches.id}`
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
        .where(eq(bookings.profileId, athlete.profileId))
        .orderBy(desc(bookingSessions.date))
        .limit(10)

    const athleteImage = await getImageUrl(athlete.profileImage)
    const academicImage = await getImageUrl(athlete.academicImage)

    return {
        athlete: {
            ...athlete,
            profileImage: athleteImage,
            academicImage: academicImage
        },
        bookings: bookings_data,
        recentSessions
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