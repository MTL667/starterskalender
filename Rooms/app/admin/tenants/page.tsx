'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: string;
  tenantId: string;
  name: string | null;
  active: boolean;
  createdAt: string;
}

export default function TenantsManagement() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ tenantId: '', name: '', active: true });

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadTenants();
  }, [session, router]);

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      loadTenants();
      setShowForm(false);
      setFormData({ tenantId: '', name: '', active: true });
    } catch (error) {
      console.error('Error creating tenant:', error);
    }
  };

  const toggleTenant = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      loadTenants();
    } catch (error) {
      console.error('Error toggling tenant:', error);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tenants Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Tenant
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
                <label className="block text-sm font-semibold mb-2 text-gray-900">Tenant ID</label>
                <input
                  type="text"
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 text-gray-900"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 text-gray-900"
                  placeholder="Company Name"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm font-semibold text-gray-900">Active</label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3 text-left text-white font-semibold">Tenant ID</th>
                <th className="p-3 text-left text-white font-semibold">Name</th>
                <th className="p-3 text-left text-white font-semibold">Status</th>
                <th className="p-3 text-left text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm text-gray-900">{tenant.tenantId}</td>
                  <td className="p-3 text-gray-700">{tenant.name || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${tenant.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tenant.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleTenant(tenant.id, tenant.active)}
                      className="text-blue-600 hover:underline text-sm font-semibold"
                    >
                      {tenant.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && (
            <div className="p-6 text-center text-gray-700 font-medium">No tenants yet</div>
          )}
        </div>
      </div>
    </main>
  );
}

