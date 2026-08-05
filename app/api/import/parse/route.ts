import { NextResponse } from "next/server";
import { parseHaulerPdf } from "@/lib/import/pdf-king-county";
import { parseHaulerCsv } from "@/lib/import/csv-parser";
import type { ParseResult } from "@/lib/types";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let result: ParseResult;
    if (name.endsWith(".pdf")) {
      const rows = await parseHaulerPdf(buffer);
      result = { rows, sourceLabel: file.name, fileType: "pdf" };
    } else if (name.endsWith(".csv")) {
      const rows = parseHaulerCsv(buffer.toString("utf-8"));
      result = { rows, sourceLabel: file.name, fileType: "csv" };
    } else {
      return NextResponse.json({ error: "Only .pdf and .csv files are supported" }, { status: 400 });
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "No rows could be parsed from this file — check the format matches a hauler registry list" },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse file" },
      { status: 500 }
    );
  }
}