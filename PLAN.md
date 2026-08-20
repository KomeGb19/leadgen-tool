# Lead Export Implementation Plan

## Context
The user wants to export leads from the lead generation tool into Excel or CSV format. Currently, leads can be viewed in a table or kanban board, filtered by various criteria, and detailed in a lead detail sheet. The export functionality should allow users to download the currently visible (filtered) leads in a spreadsheet format for further analysis or reporting.

## Approach
Based on user feedback:
- Export only filtered leads (matching current UI view)
- Place export buttons in the FiltersBar component
- Provide both CSV and Excel export formats

## Implementation Steps

### 1. Create Export Utilities
- Create `lib/export.ts` utility file with functions to:
  - Convert Lead array to CSV string
  - Convert Lead array to Excel workbook (using xlsx library)
  - Handle data formatting for spreadsheet export
  - Generate appropriate filenames with timestamps

### 2. Add Required Dependencies
- Install `xlsx` library for Excel export functionality
- Add corresponding TypeScript types if needed

### 3. Update FiltersBar Component
- Add export buttons (CSV and Excel) next to the "Clear filters" button
- Implement button click handlers to:
  - Access current filtered leads from LeadsPage context
  - Call appropriate export utility function
  - Trigger file download
  - Show success/error toast notifications

### 4. Data Selection for Export
Export the following lead properties:
- Company: name, address, city, state, zip, phone, website
- Business: category, yearsInBusiness, reviewCount, rating
- Lead: score, status, updatedAt
- Source: company.source
- Fleet: fleetSize(lead) + data confidence (FMCSA verified vs imagery estimated)
- FMCSA details (when available): usdotNumber, mcNumber, powerUnits, drivers, operatingStatus, mcs150Date
- Imagery details (when available): imageUrl, truckCountEstimate, capturedDate
- Notes count: lead.notes.length

### 5. File Download Implementation
- Create temporary Blob objects from CSV/Excel data
- Create object URLs for browser download
- Create temporary anchor elements to trigger download
- Clean up object URLs after download

### 6. Error Handling
- Handle export failures gracefully
- Show error notifications via existing toast system
- Ensure loading states are managed properly

### 7. Component Integration
- Export buttons should be visible when filters are applied or when there are leads to export
- Buttons should be disabled during export process
- Use consistent styling with existing Button components

## Key Files to Modify
1. `lib/export.ts` - New utility file
2. `components/FiltersBar.tsx` - Add export buttons and handlers
3. `package.json` - Add xlsx dependency
4. Potentially `lib/useLeads.ts` - if we need to access leads state differently

## Verification
- Test CSV export produces valid CSV that opens correctly in Excel/Google Sheets
- Test Excel export produces valid .xlsx file (if library added)
- Verify export respects current filters
- Ensure exported data matches what's visible in the UI
- Test edge cases: empty leads, leads with missing data
- Verify file downloads work in Chrome/Firefox/Safari
- Check that export doesn't break existing functionality

## Reusing Existing Patterns
- Use existing `Button` component from "@/components/ui/button"
- Use existing toast notification system from "@/components/Toast"
- Follow existing data access patterns from `useLeads` hook
- Follow existing utility function patterns in `lib/utils.ts`