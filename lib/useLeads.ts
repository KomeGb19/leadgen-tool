"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lead, LeadStatus } from "./types";
import { authFetch } from "./auth";
import { useAuth } from "@/contexts/AuthContext";

export function useLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"mock" | "supabase">("mock");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads ?? []);
      setSource(data.source ?? "mock");
    } catch (err) {
      console.error("Failed to load leads:", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-run whenever the logged-in user changes (login / logout)
  useEffect(() => {
    refresh();
  }, [refresh, user?.id]);

  const updateStatus = useCallback((leadId: string, status: LeadStatus) => {
    let previous: Lead | undefined;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        previous = l;
        return { ...l, status, updatedAt: new Date().toISOString() };
      })
    );

    const revert = () => {
      if (!previous) return;
      const old = previous;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? old : l)));
    };

    authFetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
      .catch((err) => {
        console.error("Failed to update lead status:", err);
        revert();
      });
  }, []);

  const addNote = useCallback((leadId: string, body: string) => {
    const noteId = crypto.randomUUID();
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              notes: [
                { id: noteId, body, author: "You", createdAt: new Date().toISOString() },
                ...l.notes,
              ],
            }
          : l
      )
    );

    const revert = () =>
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, notes: l.notes.filter((n) => n.id !== noteId) } : l
        )
      );

    authFetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: body }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
      .catch((err) => {
        console.error("Failed to add note:", err);
        revert();
      });
  }, []);

  return { leads, loading, source, refresh, updateStatus, addNote };
}