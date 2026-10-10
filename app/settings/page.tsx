"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, isSuperUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<
    Array<{
      id: string;
      email: string;
      role: "super_user" | "state_user" | null;
      allowedStates: string[] | null;
    }>
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"super_user" | "state_user">(
    "state_user",
  );
  const [stateCodes, setStateCodes] = useState<string[]>([]);
  const [stateInput, setStateInput] = useState<string>("");

  // US state codes for dropdown (can be expanded)
  const US_STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch("/api/settings/users", {
        headers: {
          // The cookie with the session will be sent automatically
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      console.error("Fetch users error:", err);
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim().toUpperCase();
    if (value && US_STATES.includes(value)) {
      setStateCodes((prev) => {
        if (!prev.includes(value)) {
          return [...prev, value];
        }
        return prev;
      });
      setStateInput("");
    } else if (value) {
      // Optional: show validation error
      setFormError("Please enter a valid US state code");
    }
  };

  const handleAddState = () => {
    const value = stateInput.trim().toUpperCase();
    if (value && US_STATES.includes(value)) {
      setStateCodes((prev) => {
        if (!prev.includes(value)) {
          return [...prev, value];
        }
        return prev;
      });
      setStateInput("");
      setFormError(null);
    } else if (value) {
      setFormError("Please enter a valid US state code");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    if (!selectedUserId) {
      setFormError("Please select a user");
      setFormLoading(false);
      return;
    }

    try {
      const response = await authFetch("/api/settings/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
          stateCodes: selectedRole === "state_user" ? stateCodes : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update permissions");
      }

      // Success: reset form and refetch users
      setSelectedUserId("");
      setSelectedRole("state_user");
      setStateCodes([]);
      setStateInput("");
      setFormError(null);
      await fetchUsers();
    } catch (err: any) {
      console.error("Update permissions error:", err);
      setFormError(err.message || "Failed to update permissions");
    } finally {
      setFormLoading(false);
    }
  };

  // If the user is not a super user, redirect to dashboard
  if (!isSuperUser()) {
    router.push("/");
    return null; // Prevent rendering while redirecting
  }

  return (
    <div className="flex flex-col gap-5 p-6 ml-60">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Settings
        </div>
        <h1 className="font-display text-3xl uppercase text-paper">
          User Management
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage user roles and state permissions. Only super users can access
          this page.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner className="h-10 w-10" />
          <p className="mt-2 text-muted">Loading users...</p>
        </div>
      )}

      {/* Users table */}
      {!loading && (
        <>
          <h2 className="text-lg font-semibold mb-3">Users</h2>
          <Card className="mb-6">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-rail text-left font-mono text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Allowed States</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-center text-muted"
                      >
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-line last:border-0"
                      >
                        <td className="px-3 py-2 text-sm font-mono">
                          {user.email || user.id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2 text-sm font-mono">
                          {user.role === "super_user" ? (
                            <span className="text-amber">Super User</span>
                          ) : user.role === "state_user" ? (
                            <span className="text-paper">State User</span>
                          ) : (
                            <span className="text-muted">No Role</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-mono">
                          {user.allowedStates &&
                          user.allowedStates.length > 0 ? (
                            <span className="flex flex-wrap gap-1">
                              {user.allowedStates.map((state) => (
                                <Badge key={state} variant="outline">
                                  {state}
                                </Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="text-muted">All States</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-mono space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove all permissions for ${user.email}?`,
                                )
                              ) {
                                authFetch("/api/settings/permissions", {
                                  method: "DELETE",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ userId: user.id }),
                                })
                                  .then((res) => {
                                    if (res.ok) {
                                      fetchUsers();
                                    } else {
                                      alert("Failed to remove permissions");
                                    }
                                  })
                                  .catch((err) => {
                                    console.error(err);
                                    alert("Error removing permissions");
                                  });
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Permissions Form */}
      <Card className="mb-6 p-4">
        <h2 className="text-lg font-semibold mb-4">
          Assign Role & Permissions
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form Error */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* User Select */}
            <div>
              <label className="block text-sm font-mono text-muted mb-1">
                User
              </label>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ?? "")}
                disabled={formLoading}
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email || `${user.id.slice(0, 8)}...`}
                  </option>
                ))}
              </Select>
            </div>

            {/* Role Select */}
            <div>
              <label className="block text-sm font-mono text-muted mb-1">
                Role
              </label>
              <Select
                value={selectedRole}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "super_user" || value === "state_user") {
                    setSelectedRole(value);
                  }
                }}
                disabled={formLoading}
              >
                <option value="">Select role</option>
                <option value="super_user">Super User</option>
                <option value="state_user">State User</option>
              </Select>
            </div>

            {/* State Codes Input (only for state_user) */}
            {selectedRole === "state_user" && (
              <div className="col-span-2">
                <label className="block text-sm font-mono text-muted mb-1">
                  State Codes (for State User role)
                </label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={stateInput}
                    onChange={(e) => setStateInput(e.target.value)}
                    placeholder="Enter state code (e.g., CA)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddState();
                      }
                    }}
                    disabled={formLoading}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddState}
                    disabled={formLoading || !stateInput.trim()}
                  >
                    Add
                  </Button>
                  {/* Display selected state codes */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {stateCodes.map((code) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 bg-amber/20 text-amber text-xs rounded flex items-center"
                      >
                        {code}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setStateCodes((prev) =>
                              prev.filter((c) => c !== code),
                            );
                          }}
                          className="ml-1 p-0 hover:text-amber"
                        >
                          ×
                        </Button>
                      </span>
                    ))}
                  </div>
                  {/* Validation error for state codes */}
                  {formError &&
                    selectedRole === "state_user" &&
                    stateCodes.length === 0 && (
                      <div className="mt-2 text-sm text-red-500">
                        Please add at least one state code
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={formLoading || !selectedUserId}
            className="w-full bg-amber text-paper hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formLoading ? "Saving..." : "Save Permissions"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
