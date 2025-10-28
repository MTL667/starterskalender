'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  location: string | null;
  capacity: number;
  msResourceEmail: string | null;
  hourlyRateCents: number;
  active: boolean;
  createdAt: string;
  _count: { bookings: number };
}

export default function RoomsManagement() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 10,
    msResourceEmail: '',
    active: true,
  });

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadRooms();
  }, [session, router]);

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/admin/rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          msResourceEmail: formData.msResourceEmail || null,
        }),
      });
      loadRooms();
      setShowForm(false);
      setFormData({ name: '', location: '', capacity: 10, msResourceEmail: '', active: true });
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('Delete this room?')) return;
    try {
      await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE' });
      loadRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Rooms Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Room
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">MS Resource Email</label>
                <input
                  type="email"
                  value={formData.msResourceEmail}
                  onChange={(e) => setFormData({ ...formData, msResourceEmail: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  placeholder="room-a@example.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Capacity</th>
                <th className="p-3 text-left">MS Email</th>
                <th className="p-3 text-left">Bookings</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-t">
                  <td className="p-3 font-semibold">{room.name}</td>
                  <td className="p-3">{room.location || '-'}</td>
                  <td className="p-3">{room.capacity}</td>
                  <td className="p-3 text-sm text-gray-600">{room.msResourceEmail || '-'}</td>
                  <td className="p-3">{room._count.bookings}</td>
                  <td className="p-3">
                    <button
                      onClick={() => deleteRoom(room.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rooms.length === 0 && (
            <div className="p-6 text-center text-gray-500">No rooms yet</div>
          )}
        </div>
      </div>
    </main>
  );
}

