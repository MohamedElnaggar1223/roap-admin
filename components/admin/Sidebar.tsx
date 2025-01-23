"use client"

import * as React from "react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenuButton,
    SidebarRail,
} from "@/components/ui/sidebar"
import { CMS } from "./CMS"
import { JoinUs } from "./JoinUs"
import { UserManagement } from "./UserManagement"
import { BookOpen, Component, Contact, Languages, Users, Volleyball } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog-no-close";
import { signOut } from 'next-auth/react';
import { Loader2, LogOut } from "lucide-react"

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    const [loading, setLoading] = React.useState(false)

    const handleLogOut = async () => {
        setLoading(true)
        await signOut({ redirect: true, redirectTo: '/' })
        setLoading(false)
    }

    return (
        <>
            <Sidebar className='font-medium' collapsible="icon" {...props}>
                <SidebarHeader>
                    <Image
                        src="/images/roapLogo.svg"
                        alt="Logo"
                        width={100}
                        height={100}
                        className='mx-auto'
                    />
                </SidebarHeader>
                <SidebarContent className="">
                    <SidebarGroup>
                        <Link href='/academics'>
                            <SidebarMenuButton className={cn(pathname?.includes('/academics') && 'bg-sidebar-accent')} tooltip='Academics'>
                                <Contact className={cn(pathname?.includes('/academics') && 'stroke-main')} />
                                <span className={cn(pathname?.includes('/academics') && 'text-main')}>Academics</span>
                            </SidebarMenuButton>
                        </Link>
                        <Link href='/sports'>
                            <SidebarMenuButton className={cn(pathname?.includes('/sports') && 'bg-sidebar-accent')} tooltip='Sports'>
                                <Volleyball className={cn(pathname?.includes('/sports') && 'stroke-main')} />
                                <span className={cn(pathname?.includes('/sports') && 'text-main')}>Sports</span>
                            </SidebarMenuButton>
                        </Link>
                        <Link href='/amenities'>
                            <SidebarMenuButton className={cn(pathname?.includes('/amenities') && 'bg-sidebar-accent')} tooltip='Amenities'>
                                <Component className={cn(pathname?.includes('/amenities') && 'stroke-main')} />
                                <span className={cn(pathname?.includes('/amenities') && 'text-main')}>Amenities</span>
                            </SidebarMenuButton>
                        </Link>
                        <Link href='/genders'>
                            <SidebarMenuButton className={cn(pathname?.includes('/genders') && 'bg-sidebar-accent')} tooltip='Genders'>
                                <Users className={cn(pathname?.includes('/genders') && 'stroke-main')} />
                                <span className={cn(pathname?.includes('/genders') && 'text-main')}>Genders</span>
                            </SidebarMenuButton>
                        </Link>
                        <Link href='/pages'>
                            <SidebarMenuButton className={cn(pathname?.includes('/pages') && 'bg-sidebar-accent')} tooltip='Pages'>
                                <BookOpen className={cn(pathname?.includes('/pages') && 'stroke-main')} />
                                <span className={cn(pathname?.includes('/pages') && 'text-main')}>Pages</span>
                            </SidebarMenuButton>
                        </Link>
                        <Link href='/spoken-languages'>
                            <SidebarMenuButton className={cn(pathname?.includes('/spoken-languages') && 'bg-sidebar-accent')} tooltip='Spoken-languages'>
                                <Languages className={cn(pathname?.includes('/spoken-languages') && 'stroke-main')} />
                                <span className={cn(pathname?.includes('/spoken-languages') && 'text-main')}>Spoken Languages</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarGroup>
                    {/* <CMS /> */}
                    {/* <JoinUs /> */}
                    {/* <UserManagement /> */}

                </SidebarContent>
                <SidebarFooter>
                    <div onClick={handleLogOut} className='flex py-2 cursor-pointer text-sm items-center justify-center gap-1'>
                        <LogOut size={16} />
                        <span>Log Out</span>
                    </div>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>
            <Dialog open={loading}>
                <DialogContent className='flex items-center justify-center bg-transparent border-none shadow-none outline-none'>
                    <DialogTitle />
                    <Loader2 className='animate-spin' size={42} color="#000" />
                </DialogContent>
            </Dialog>
        </>
    )
}
