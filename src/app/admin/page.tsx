"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AdminData {
  rateLimitEnabled: boolean;
  whitelistedUsers: string[];
}

interface UsageData {
  [email: string]: {
    count: number;
    lastReset: string;
  };
}

interface AdminStatus {
  adminData: AdminData;
  usageData: UsageData;
  totalUsers: number;
}

function AdminPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if user is admin
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user?.email) {
      router.push("/");
      return;
    }

    if (session.user.email !== "hi@harsh.fun") {
      router.push("/");
      return;
    }

    fetchAdminStatus();
  }, [session, status, router]);

  const fetchAdminStatus = async () => {
    try {
      const response = await fetch("/api/admin/status");
      if (response.ok) {
        const data = await response.json();
        setAdminStatus(data);
      } else {
        setError("Failed to fetch admin status");
      }
    } catch (error) {
      setError("Failed to fetch admin status");
    } finally {
      setLoading(false);
    }
  };

  const updateAdminSettings = async (rateLimitEnabled: boolean, whitelistedUsers: string[]) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rateLimitEnabled,
          whitelistedUsers,
        }),
      });

      if (response.ok) {
        setSuccess("Settings updated successfully");
        fetchAdminStatus(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update settings");
      }
    } catch (error) {
      setError("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleRateLimit = () => {
    if (!adminStatus) return;
    
    const newRateLimitEnabled = !adminStatus.adminData.rateLimitEnabled;
    updateAdminSettings(newRateLimitEnabled, adminStatus.adminData.whitelistedUsers);
  };

  const addWhitelistedUser = () => {
    if (!adminStatus || !newEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (adminStatus.adminData.whitelistedUsers.includes(newEmail)) {
      setError("Email is already whitelisted");
      return;
    }

    const newWhitelistedUsers = [...adminStatus.adminData.whitelistedUsers, newEmail];
    updateAdminSettings(adminStatus.adminData.rateLimitEnabled, newWhitelistedUsers);
    setNewEmail("");
  };

  const removeWhitelistedUser = (email: string) => {
    if (!adminStatus) return;

    const newWhitelistedUsers = adminStatus.adminData.whitelistedUsers.filter(
      (user) => user !== email
    );
    updateAdminSettings(adminStatus.adminData.rateLimitEnabled, newWhitelistedUsers);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeUntilReset = (lastReset: string) => {
    const resetTime = new Date(lastReset);
    resetTime.setHours(resetTime.getHours() + 24);
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Reset now";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.email || session.user.email !== "hi@harsh.fun") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                Admin: {session.user.email}
              </span>
              <button
                onClick={() => router.push("/")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                ← Back to App
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {adminStatus && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Rate Limit Settings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Rate Limit Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Rate Limiting</span>
                  <button
                    onClick={toggleRateLimit}
                    disabled={saving}
                    className={`px-4 py-2 rounded ${
                      adminStatus.adminData.rateLimitEnabled
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {adminStatus.adminData.rateLimitEnabled ? "Disable" : "Enable"}
                  </button>
                </div>

                <div className="text-sm text-gray-400">
                  <p>Current Status: {adminStatus.adminData.rateLimitEnabled ? "Enabled" : "Disabled"}</p>
                  <p>Users affected: {adminStatus.totalUsers}</p>
                </div>
              </div>
            </div>

            {/* Whitelist Management */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Whitelisted Users</h2>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === "Enter" && addWhitelistedUser()}
                  />
                  <button
                    onClick={addWhitelistedUser}
                    disabled={saving || !newEmail.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {adminStatus.adminData.whitelistedUsers.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                      <span className="text-sm">{email}</span>
                      <button
                        onClick={() => removeWhitelistedUser(email)}
                        disabled={saving}
                        className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  {adminStatus.adminData.whitelistedUsers.length === 0 && (
                    <p className="text-gray-400 text-sm">No whitelisted users</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Statistics */}
        {adminStatus && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Usage Count</th>
                    <th className="text-left py-2">Last Reset</th>
                    <th className="text-left py-2">Time Until Reset</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(adminStatus.usageData).map(([email, data]) => (
                    <tr key={email} className="border-b border-gray-700">
                      <td className="py-2">{email}</td>
                      <td className="py-2">{data.count}/3</td>
                      <td className="py-2">{formatDate(data.lastReset)}</td>
                      <td className="py-2">{getTimeUntilReset(data.lastReset)}</td>
                    </tr>
                  ))}
                  
                  {Object.keys(adminStatus.usageData).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">
                        No usage data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SessionProvider>
      <AdminPageContent />
    </SessionProvider>
  );
} 