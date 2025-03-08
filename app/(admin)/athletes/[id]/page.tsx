import { Suspense } from 'react'
import { getAthleteById } from '@/lib/actions/athletes-admin.actions'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, ChevronLeftIcon, MapPinIcon, PhoneIcon, MailIcon, UserIcon, ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'

export default async function AthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    console.log(id)
    const athleteId = parseInt(id.toString())

    if (isNaN(athleteId)) {
        return notFound()
    }

    const athleteData = await getAthleteById(athleteId)

    if (!athleteData) {
        return notFound()
    }

    const { athlete, bookings, recentSessions } = athleteData

    // Format birthday if exists
    const formattedBirthday = athlete.profileBirthday
        ? format(new Date(athlete.profileBirthday), 'MMMM d, yyyy')
        : 'Not provided'

    // Calculate age if birthday exists
    const age = athlete.profileBirthday
        ? Math.floor((new Date().getTime() - new Date(athlete.profileBirthday).getTime()) / 31557600000)
        : null

    // Get statistics from bookings
    const totalBookings = bookings.length
    const activeBookings = bookings.filter(b => b.status === 'success').length
    const totalSessions = bookings.reduce((acc, booking) => acc + (booking.sessionCount || 0), 0)
    const completedSessions = bookings.reduce((acc, booking) => acc + (booking.completedSessions || 0), 0)
    const upcomingSessions = bookings.reduce((acc, booking) => acc + (booking.upcomingSessions || 0), 0)

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center space-x-2">
                <Link href="/athletes">
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                        <ChevronLeftIcon className="h-4 w-4" />
                        Back to Athletes
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">Athlete Details</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left column - Personal Information */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center mb-6">
                                <Avatar className="h-24 w-24 mb-4">
                                    {athlete.profileImage ? (
                                        <AvatarImage src={athlete.profileImage} alt={athlete.profileName || 'Athlete'} />
                                    ) : (
                                        <AvatarFallback className="text-2xl">
                                            {athlete.profileName?.charAt(0) || 'A'}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <h2 className="text-xl font-semibold">{athlete.profileName || 'Unknown'}</h2>
                                <div className="text-sm text-gray-500 mt-1">
                                    {athlete.profileGender || 'Not specified'} {age ? `• ${age} years old` : ''}
                                </div>
                                <Badge className="mt-2" variant={athlete.type === 'primary' ? "default" : "secondary"}>
                                    {athlete.type === 'primary' ? "Primary Athlete" : "Fellow Athlete"}
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <CalendarIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium">Birthday</div>
                                        <div className="text-sm text-gray-500">{formattedBirthday}</div>
                                    </div>
                                </div>

                                {athlete.profileNationality && (
                                    <div className="flex items-start space-x-3">
                                        <div className="h-5 w-5 text-gray-500 mt-0.5 flex items-center justify-center">🌍</div>
                                        <div>
                                            <div className="font-medium">Nationality</div>
                                            <div className="text-sm text-gray-500">{athlete.profileNationality}</div>
                                        </div>
                                    </div>
                                )}

                                {(athlete.profileCountry || athlete.profileCity || athlete.profileStreetAddress) && (
                                    <div className="flex items-start space-x-3">
                                        <MapPinIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                                        <div>
                                            <div className="font-medium">Address</div>
                                            <div className="text-sm text-gray-500">
                                                {athlete.profileStreetAddress && <div>{athlete.profileStreetAddress}</div>}
                                                {athlete.profileCity && athlete.profileCountry && (
                                                    <div>{athlete.profileCity}, {athlete.profileCountry}</div>
                                                )}
                                                {athlete.profileCity && !athlete.profileCountry && <div>{athlete.profileCity}</div>}
                                                {!athlete.profileCity && athlete.profileCountry && <div>{athlete.profileCountry}</div>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {athlete.certificate && (
                                    <div className="flex items-start space-x-3">
                                        <div className="h-5 w-5 text-gray-500 mt-0.5 flex items-center justify-center">🎓</div>
                                        <div>
                                            <div className="font-medium">Certificate</div>
                                            <a href={athlete.certificate} className="text-sm text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
                                                View Certificate
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>User Account</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <UserIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium">Name</div>
                                        <div className="text-sm text-gray-500">{athlete.userName || 'Not provided'}</div>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <MailIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium">Email</div>
                                        <div className="text-sm text-gray-500">{athlete.userEmail || 'Not provided'}</div>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <PhoneIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium">Phone</div>
                                        <div className="text-sm text-gray-500">{athlete.userPhone || 'Not provided'}</div>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <div className="h-5 w-5 text-gray-500 mt-0.5 flex items-center justify-center">🏆</div>
                                    <div>
                                        <div className="font-medium">Account Status</div>
                                        <div className="text-sm">
                                            {athlete.userIsAthletic ? (
                                                <Badge variant="default">Athletic User</Badge>
                                            ) : (
                                                <Badge variant="outline">Regular User</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Guardian information */}
                    {(athlete.firstGuardianName || athlete.secondGuardianName) && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>Guardian Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {athlete.firstGuardianName && (
                                        <div className="space-y-3">
                                            <h3 className="font-semibold">Primary Guardian</h3>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex items-start space-x-3">
                                                    <UserIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                                                    <div>
                                                        <div className="font-medium">{athlete.firstGuardianName}</div>
                                                        {athlete.firstGuardianRelationship && (
                                                            <div className="text-gray-500">{athlete.firstGuardianRelationship}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {athlete.firstGuardianEmail && (
                                                    <div className="flex items-start space-x-3">
                                                        <MailIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                                                        <div>{athlete.firstGuardianEmail}</div>
                                                    </div>
                                                )}

                                                {athlete.firstGuardianPhone && (
                                                    <div className="flex items-start space-x-3">
                                                        <PhoneIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                                                        <div>{athlete.firstGuardianPhone}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {athlete.secondGuardianName && (
                                        <>
                                            {athlete.firstGuardianName && <Separator className="my-4" />}
                                            <div className="space-y-3">
                                                <h3 className="font-semibold">Secondary Guardian</h3>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex items-start space-x-3">
                                                        <UserIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                                                        <div>
                                                            <div className="font-medium">{athlete.secondGuardianName}</div>
                                                            {athlete.secondGuardianRelationship && (
                                                                <div className="text-gray-500">{athlete.secondGuardianRelationship}</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {athlete.secondGuardianEmail && (
                                                        <div className="flex items-start space-x-3">
                                                            <MailIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                                                            <div>{athlete.secondGuardianEmail}</div>
                                                        </div>
                                                    )}

                                                    {athlete.secondGuardianPhone && (
                                                        <div className="flex items-start space-x-3">
                                                            <PhoneIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                                                            <div>{athlete.secondGuardianPhone}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Middle and right columns */}
                <div className="md:col-span-2 space-y-6">
                    {/* Academic & Sport Information */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>Academic & Sport</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start space-x-4">
                                    <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                                        {athlete.academicImage ? (
                                            <Image
                                                src={athlete.academicImage}
                                                alt={athlete.academicName || 'Academic'}
                                                width={48}
                                                height={48}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500">
                                                Acad
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{athlete.academicName || 'Unknown Academic'}</h3>
                                        {athlete.academicSlug && (
                                            <p className="text-sm text-gray-500 mt-1">Slug: {athlete.academicSlug}</p>
                                        )}
                                    </div>
                                </div>

                                {athlete.sportName && (
                                    <div className="flex items-center">
                                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                                            🏅
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{athlete.sportName}</h3>
                                            <p className="text-sm text-gray-500 mt-1">Sport ID: {athlete.sportId}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{totalBookings}</div>
                                    <p className="text-sm text-gray-500 mt-1">Total Bookings</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{totalSessions}</div>
                                    <p className="text-sm text-gray-500 mt-1">Total Sessions</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{upcomingSessions}</div>
                                    <p className="text-sm text-gray-500 mt-1">Upcoming Sessions</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bookings & Sessions Tabs */}
                    <Tabs defaultValue="bookings" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="bookings">Bookings</TabsTrigger>
                            <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
                        </TabsList>

                        <TabsContent value="bookings" className="mt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>Bookings</CardTitle>
                                    <CardDescription>All bookings for this athlete</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {bookings.length > 0 ? (
                                        <div className="space-y-4">
                                            {bookings.map((booking) => (
                                                <div key={booking.id} className="border rounded-md p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-medium">{booking.packageName || 'Unnamed Package'}</h3>
                                                            <div className="text-sm text-gray-500 mt-1">
                                                                {booking.branchName && `at ${booking.branchName}`}
                                                            </div>
                                                        </div>
                                                        <Badge variant={booking.status === 'success' ? 'default' : (booking.status === 'pending' ? 'outline' : 'destructive')}>
                                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                                        <div>
                                                            <div className="text-sm text-gray-500">Price</div>
                                                            <div>{booking.price.toFixed(2)}AED</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-500">Sessions</div>
                                                            <div>{booking.sessionCount || 0}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-500">Completed</div>
                                                            <div>{booking.completedSessions || 0}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-500">Upcoming</div>
                                                            <div>{booking.upcomingSessions || 0}</div>
                                                        </div>
                                                    </div>

                                                    {booking.nextSessionDate && (
                                                        <div className="mt-4 text-sm flex items-center text-blue-600">
                                                            <CalendarIcon className="h-4 w-4 mr-1" />
                                                            <span>Next session on {format(new Date(booking.nextSessionDate), 'MMM d, yyyy')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No bookings found for this athlete.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="sessions" className="mt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>Recent Sessions</CardTitle>
                                    <CardDescription>Last 10 sessions for this athlete</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {recentSessions.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentSessions.map((session) => (
                                                <div key={session.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                            <ClockIcon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium">{session.packageName || 'Session'}</h4>
                                                            <div className="text-sm text-gray-500 mt-0.5">
                                                                {format(new Date(session.date), 'MMMM d, yyyy')} • {session.from} - {session.to}
                                                            </div>
                                                            {session.branchName && (
                                                                <div className="text-sm text-gray-500">
                                                                    at {session.branchName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge variant={
                                                        session.status === 'accepted' ? 'success' :
                                                            (session.status === 'upcoming' ? 'default' :
                                                                (session.status === 'pending' ? 'outline' : 'destructive'))
                                                    }>
                                                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No sessions found for this athlete.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}