"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

interface Room {
  id: string
  name: string
  capacity: number
  location: string | null
  msResourceEmail: string | null
  hourlyRateCents: number
  active: boolean
  createdAt: string
  _count?: {
    bookings: number
  }
}

export default function AdminRoomsPage() {
  const { data: session, status } = useSession()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  useEffect(() => {
    if (status === "authenticated") {
      fetchRooms()
    }
  }, [status])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/rooms")
      
      if (!res.ok) {
        throw new Error("Failed to fetch rooms")
      }

      const data = await res.json()
      setRooms(data.rooms || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rooms")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) {
      return
    }

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete room")
      }

      await fetchRooms()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete room")
    }
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100)
  }

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status === "unauthenticated" || session?.user?.role !== "HR_ADMIN") {
    return <div className="flex items-center justify-center min-h-screen">Access Denied</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Room Management</h1>
          <p className="text-gray-600 mt-1">Manage available meeting rooms</p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Room
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading rooms...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-semibold">{room.name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    room.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {room.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p>Capacity: {room.capacity} people</p>
                {room.location && <p>Location: {room.location}</p>}
                {room.msResourceEmail && (
                  <p className="truncate" title={room.msResourceEmail}>
                    MS: {room.msResourceEmail}
                  </p>
                )}
                <p>Rate: {formatPrice(room.hourlyRateCents)}/hour</p>
                {room._count && (
                  <p>Active bookings: {room._count.bookings}</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/admin/rooms/${room.id}`}
                  className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(room.id)}
                  className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {rooms.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No rooms found. Create your first room above.
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/admin"
          className="text-blue-600 hover:underline"
        >
          ← Back to Admin
        </Link>
      </div>
    </div>
  )
}

