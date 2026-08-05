"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lead, LeadStatus } from "./types";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"mock" | "supabase">("mock");

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads ?? []);
    setSource(data.source ?? "mock");
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback((leadId: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l)));
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }, []);

  const addNote = useCallback((leadId: string, body: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              notes: [
                { id: crypto.randomUUID(), body, author: "You", createdAt: new Date().toISOString() },
                ...l.notes,
              ],
            }
          : l
      )
    );
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: body }),
    });
  }, []);

  return { leads, loading, source, refresh, updateStatus, addNote };
}
