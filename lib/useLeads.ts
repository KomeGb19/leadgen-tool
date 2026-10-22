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

  const researchOwnership = useCallback(async (leadId: string) => {
    try {
      const res = await authFetch(`/api/leads/${leadId}/ownership`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const ownership = data.ownership ?? null;

      if (!ownership) {
        return;
      }

      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== leadId) return lead;

          return {
            ...lead,
            company: {
              ...lead.company,
              ownershipStatus: ownership.ownership_status ?? lead.company.ownershipStatus,
              parentCompany: ownership.parent_company ?? lead.company.parentCompany,
              acquisitionYear:
                ownership.acquisition_year ?? lead.company.acquisitionYear ?? null,
              ownershipConfidence: ownership.confidence ?? lead.company.ownershipConfidence,
              ownershipSources: ownership.sources ?? lead.company.ownershipSources ?? [],
              ownershipResearchedAt: new Date().toISOString(),
            },
          };
        })
      );
    } catch (err) {
      console.error("Failed to research ownership:", err);
    }
  }, []);

  const researchHotLeads = useCallback(async () => {
    const hotLeadIds = leads.filter((lead) => lead.score >= 80).map((lead) => lead.id);
    for (const leadId of hotLeadIds) {
      await researchOwnership(leadId);
    }
  }, [leads, researchOwnership]);

  return {
    leads,
    loading,
    source,
    refresh,
    updateStatus,
    addNote,
    researchOwnership,
    researchHotLeads,
  };
}