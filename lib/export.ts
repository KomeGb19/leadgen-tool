  import type { Lead } from "./types";

/**
 * Converts a Lead object to a flat object suitable for spreadsheet export
 */
function leadToExportRow(lead: Lead): Record<string, any> {
  const { company, fmcsa, imagery, score, status, notes, updatedAt, id } = lead;

  // Determine fleet size and data confidence
  const fleetSize = fmcsa?.powerUnits ?? imagery?.truckCountEstimate ?? 0;
  const dataConfidence = fmcsa ? "Verified (FMCSA)" : imagery ? "Estimated (imagery)" : "Unknown";

  return {
    // Lead Information
    "Lead ID": id,

    // Company Information
    "Company Name": company.name,
    "Address": company.address,
    "City": company.city,
    "State": company.state,
    "ZIP": company.zip ?? "",
    "Phone": company.phone ?? "",
    "Website": company.website ?? "",

    // Business Details
    "Category": company.category.replace("_", " "),
    "Years in Business": company.yearsInBusiness ?? "",
    "Review Count": company.reviewCount ?? "",
    "Rating": company.rating ?? "",

    // Lead Information
    "Lead Score": score,
    "Lead Status": status,
    "Last Updated": new Date(updatedAt).toLocaleString(),
    "Notes Count": notes.length,

    // Source Information
    "Data Source": company.source.replace("_", " ").toUpperCase(),
    "Fleet Size": fleetSize,
    "Data Confidence": dataConfidence,

    // FMCSA Details (if available)
    "USDOT #": fmcsa?.usdotNumber ?? "",
    "MC #": fmcsa?.mcNumber ?? "",
    "Power Units": fmcsa?.powerUnits ?? "",
    "Drivers": fmcsa?.drivers ?? "",
    "Operating Status": fmcsa?.operatingStatus ?? "",
    "MCS-150 Date": fmcsa?.mcs150Date ? new Date(fmcsa.mcs150Date).toLocaleDateString() : "",

    // Imagery Details (if available)
    "Image URL": imagery?.imageUrl ?? "",
    "Truck Count Estimate": imagery?.truckCountEstimate ?? "",
    "Image Captured Date": imagery?.capturedDate ? new Date(imagery.capturedDate).toLocaleDateString() : "",
  };
}

/**
 * Converts an array of leads to CSV format
 */
export function leadsToCsv(leads: Lead[]): string {
  if (leads.length === 0) {
    return "";
  }

  // Convert leads to export rows
  const rows = leads.map(leadToExportRow);

  // Get headers from the first row
  const headers = Object.keys(rows[0]);

  // Create CSV content
  const csvContent = [
    headers.join(","), // Header row
    ...rows.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if value contains comma, quote, or newline
        if (typeof value === "string" &&
            (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      }).join(",")
    )
  ].join("\n");

  return csvContent;
}

/**
 * Exports leads to CSV file and triggers download
 */
export function exportLeadsToCsv(leads: Lead[], filenamePrefix = "leads"): void {
  const csv = leadsToCsv(leads);
  if (!csv) {
    throw new Error("No data to export");
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const filename = `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.csv`;

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports leads to Excel file and triggers download
 * Note: This function requires the 'xlsx' library to be installed
 */
export async function exportLeadsToExcel(leads: Lead[], filenamePrefix = "leads"): Promise<void> {
  try {
    // Dynamically import xlsx to avoid making it a hard dependency if not used
    const XLSX = await import("xlsx");

    // Convert leads to export rows
    const rows = leads.map(leadToExportRow);

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const filename = `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.xlsx`;

    // Trigger download
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to export to Excel: ${error instanceof Error ? error.message : String(error)}`);
  }
}