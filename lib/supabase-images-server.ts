'use server'
import { createClient } from '@/utils/supabase/server'

export async function getImageUrl(path: string | null) {
    if (!path) return null

    if (path.startsWith('http')) {
        return path
    }

    const supabase = await createClient()

    const storagePath = path.replace('images/', '')

    const { data: exists } = await supabase.storage
        .from('images')
        .list('', {
            search: storagePath
        })

    if (!exists || exists.length === 0) {
        return null
    }

    const { data } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath)

    return data.publicUrl
}

export async function deleteFromStorage(paths: string[]) {
    if (!paths?.length) return

    try {
        const supabase = await createClient()

        // Group paths by storage bucket
        const pathsByBucket = paths.reduce((acc, path) => {
            // Skip external URLs and empty paths
            if (!path || path.startsWith('http')) return acc

            // Extract bucket name and file path
            const [bucket, ...rest] = path.split('/')
            const filePath = rest.join('/')

            if (bucket && filePath) {
                if (!acc[bucket]) acc[bucket] = []
                acc[bucket].push(filePath)
            }

            return acc
        }, {} as Record<string, string[]>)

        // Delete files from each bucket
        await Promise.all(
            Object.entries(pathsByBucket).map(async ([bucket, bucketPaths]) => {
                if (!bucketPaths.length) return

                const { error } = await supabase.storage
                    .from(bucket)
                    .remove(bucketPaths)

                if (error) {
                    console.error(`Error deleting files from ${bucket}:`, error)
                    throw error
                }
            })
        )
    } catch (error) {
        console.error('Error in deleteFromStorage:', error)
        // Don't throw - we don't want to roll back the DB transaction if storage deletion fails
        // Instead, these could be logged and cleaned up by a separate process
    }
}