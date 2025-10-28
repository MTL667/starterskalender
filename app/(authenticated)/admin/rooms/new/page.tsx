"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function NewRoomPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    capacity: 1,
    location: "",
    msResourceEmail: "",
    hourlyRateCents: 0,
    active: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create room")
      }

      router.push("/admin/rooms")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room")
      setLoading(false)
    }
  }

  if (!session || session.user?.role !== "HR_ADMIN") {
    return <div className="container mx-auto p-6">Access Denied</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Room</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Room Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="capacity" className="block text-sm font-medium mb-1">
            Capacity *
          </label>
          <input
            id="capacity"
            type="number"
            required
            min="1"
            value={formData.capacity}
            onChange={(e) =>
              setFormData({ ...formData, capacity: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-1">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="msResourceEmail" className="block text-sm font-medium mb-1">
            Microsoft Resource Email
          </label>
          <input
            id="msResourceEmail"
            type="email"
            value={formData.msResourceEmail}
            onChange={(e) =>
              setFormData({ ...formData, msResourceEmail: e.target.value })
            }
            placeholder="room-1@domain.com"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">
            Resource mailbox email for Graph integration
          </p>
        </div>

        <div>
          <label htmlFor="hourlyRateCents" className="block text-sm font-medium mb-1">
            Hourly Rate (in cents, e.g. 500 = €5.00)
          </label>
          <input
            id="hourlyRateCents"
            type="number"
            min="0"
            value={formData.hourlyRateCents}
            onChange={(e) =>
              setFormData({ ...formData, hourlyRateCents: parseInt(e.target.value) || 0 })
            }
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="active" className="text-sm font-medium">
            Active
          </label>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
          <Link
            href="/admin/rooms"
            className="flex-1 px-4 py-2 border rounded-lg text-center hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

