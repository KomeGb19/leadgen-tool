"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/Toast";
import type { ParsedRow, ParseResult } from "@/lib/types";

export default function ImportPage() {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const { push } = useToast();
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      setParsing(true);
      setResult(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/import/parse", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Parse failed");
        setResult(data);
        const warnCount = data.rows.filter((r: ParsedRow) => r.warning).length;
        push(
          `Parsed ${data.rows.length} rows${warnCount ? ` — ${warnCount} need review` : ""}`,
          warnCount ? "default" : "success",
        );
      } catch (err) {
        push(err instanceof Error ? err.message : "Parse failed", "error");
      } finally {
        setParsing(false);
      }
    },
    [push],
  );

  function updateRow(index: number, patch: Partial<ParsedRow>) {
    if (!result) return;
    setResult({
      ...result,
      rows: result.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    });
  }

  async function commit() {
    if (!result) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: result.rows,
          sourceLabel: result.sourceLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      push(
        `Imported ${data.inserted} leads (${data.fmcsaMatched} FMCSA matches, ${data.geocodeFailed} need manual geocoding)`,
        "success",
      );
      router.push("/leads");
    } catch (err) {
      push(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setCommitting(false);
    }
  }

  const includedCount = result?.rows.filter((r) => r.include).length ?? 0;

  return (
    <div className="flex flex-col gap-5 p-6 ml-60">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Discovery
        </div>
        <h1 className="font-display text-3xl uppercase text-paper">
          Import registry list
        </h1>
        <p className="mt-1 text-sm text-muted">
          Upload a certified hauler PDF (e.g. King County) or a CSV export —
          review the parsed rows, then import.
        </p>
      </div>

      {!result && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded border-2 border-dashed py-20 text-center transition-colors ${
            dragOver ? "border-amber bg-amber/5" : "border-line"
          }`}
        >
          {parsing ? (
            <p className="font-mono text-sm text-muted">Parsing file...</p>
          ) : (
            <>
              <p className="text-paper">Drag a .pdf or .csv here</p>
              <p className="text-xs text-muted">or</p>
              <label>
                <input
                  type="file"
                  accept=".pdf,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <span className="cursor-pointer rounded border border-line bg-panel px-4 py-2 text-sm text-paper hover:border-muted">
                  Choose file
                </span>
              </label>
            </>
          )}
        </div>
      )}

      {result && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{result.sourceLabel}</Badge>
              <span className="font-mono text-[11px] text-muted">
                {result.rows.length} rows parsed · {includedCount} selected for
                import
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                Upload a different file
              </Button>
              <Button
                variant="amber"
                size="sm"
                disabled={committing || includedCount === 0}
                onClick={commit}
              >
                {committing ? "Importing..." : `Import ${includedCount} leads`}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-rail text-left font-mono text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Zip</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Categories</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-line last:border-0 ${
                        !row.include
                          ? "opacity-40"
                          : row.warning
                            ? "bg-warn/5"
                            : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) =>
                            updateRow(i, { include: e.target.checked })
                          }
                          className="accent-amber"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.companyName}
                          onChange={(e) =>
                            updateRow(i, { companyName: e.target.value })
                          }
                          className="w-full bg-transparent text-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60"
                        />
                        {row.warning && (
                          <div className="mt-0.5 font-mono text-[10px] text-warn">
                            {row.warning}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.address}
                          onChange={(e) =>
                            updateRow(i, { address: e.target.value })
                          }
                          className="w-full bg-transparent text-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60"
                        />
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {row.city ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted">
                        {row.zip ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted">
                        {row.phone ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.categories.length === 0 && (
                            <span className="text-muted">—</span>
                          )}
                          {row.categories.map((c) => (
                            <Badge key={c} variant="outline">
                              {c.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
