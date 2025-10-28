'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SystemSettings() {
  const { data: session } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState({
    enableBookings: true,
    requireApproval: false,
    maxBookingDuration: 120,
    maxAdvanceBooking: 30,
  });

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadSettings();
  }, [session, router]);

  const loadSettings = async () => {
    // In future, fetch from /api/admin/settings
    // For now, use local state
  };

  const handleSave = async () => {
    // In future, save to /api/admin/settings
    alert('Settings saved (not yet implemented)');
  };

  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">System Settings</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Back
          </button>
        </div>

        <div className="space-y-6">
          {/* Booking Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Booking Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold">Enable Bookings</label>
                  <p className="text-sm text-gray-600">Allow users to make room bookings</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableBookings}
                  onChange={(e) => setSettings({ ...settings, enableBookings: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold">Require Approval</label>
                  <p className="text-sm text-gray-600">Bookings need admin approval</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireApproval}
                  onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Max Booking Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.maxBookingDuration}
                  onChange={(e) => setSettings({ ...settings, maxBookingDuration: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Max Advance Booking (days)</label>
                <input
                  type="number"
                  value={settings.maxAdvanceBooking}
                  onChange={(e) => setSettings({ ...settings, maxAdvanceBooking: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            </div>
          </div>

          {/* Microsoft Graph Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Microsoft Graph Integration</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Calendars.ReadWrite - Create/update calendar events</p>
              <p>• MailboxSettings.Read - Read calendar settings</p>
              <p>• Place.Read.All - List available rooms</p>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                Configure in <a href="https://portal.azure.com" target="_blank" className="underline">Azure Portal</a>
              </p>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <strong>External users</strong> can only see BUSY/FREE slots, not meeting details.
              </p>
              <p className="text-gray-600">
                <strong>Internal users</strong> can see all booking details.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

