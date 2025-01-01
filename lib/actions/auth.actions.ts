'use server'
import { db } from "@/db"
import { users } from "@/db/schema"
import { academics } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

type SignInInput = {
    email: string
    password: string
}

export async function signIn(data: SignInInput) {
    try {
        const user = await db.query.users.findFirst({
            where: eq(sql`lower(${users.email})`, data.email.toLowerCase()),
            columns: {
                id: true,
                role: true,
            }
        })

        if (!user) {
            return { error: "User not found" }
        }

        if (user.role === 'academic') {
            const academy = await db.query.academics.findFirst({
                where: eq(academics.userId, user.id),
                columns: {
                    status: true
                }
            })

            if (!academy) {
                return { error: "Academy not found" }
            }

            if (academy.status === 'pending') {
                return { error: "pending" }
            }

            if (academy.status === 'rejected') {
                return { error: "rejected" }
            }
        }

        return { success: true }

    } catch (error) {
        console.error("Sign in error:", error)
        return { error: "Something went wrong" }
    }
}