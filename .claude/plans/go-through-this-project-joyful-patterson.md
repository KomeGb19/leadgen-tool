# Plan: Add PE Ownership and CEO Information to Hauler Lead Finder

## Context
The user wants to extend the lead generation tool to include information about whether a company is owned by another Private Equity (PE) firm and to identify the company's CEO. This information will aid private equity users in making investment decisions by understanding the ownership structure of potential target companies.

## Approach
We will implement this feature by:
1. Extending the database schema to store CEO and PE ownership data in the companies table.
2. Creating a new EXA utility function to fetch CEO and PE ownership information using natural language queries.
3. Modifying the lead enrichment process (/api/enrich) to call this new function and store the results when processing companies (both new discoveries and refreshes).
4. Adding a new ownership tab in the Lead Detail Sheet component to display the CEO and PE ownership information.
5. Ensuring the UI handles loading states and missing data gracefully.

## Implementation Steps

### 1. Database Schema Updates
   - Add three new columns to the `companies` table in supabase/schema.sql:
     - `ceo` TEXT NULL
     - `is_pe_owned` BOOLEAN NULL DEFAULT false
     - `pe_owner` TEXT NULL (name of the private equity firm)
   - Update the Company interface in lib/types.ts to include these new fields.

### 2. EXA Utility Function
   - Create a new asynchronous function `searchCompanyCeoAndPeOwnership` in lib/exa.ts.
   - This function will take company name and location hint, call the EXA API with a deep research query designed to extract:
     * CEO name
     * Whether the company is PE-owned (boolean
     * Name of the PE owning firm (if applicable)
   - Use EXA's outputSchema feature to get structured JSON response.
   - Handle errors and return null values for missing data.

### 3. Enrichment Process Updates
   - In lib/api/enrich/route.ts:
     - Import the new EXA function.
     - For each new company discovered from Google Places:
       * Call the new EXA function after the existing EXA founding year call (or in parallel).
       * Include the returned ceo, is_pe_owned, pe_owner values in the companies upsert.
     - For each existing company being refreshed in the refresh loop:
       * Similarly call the EXA function and update the companies record with the new fields.
   - Ensure error handling so that failure to fetch ownership data doesn't break the enrichment pipeline.

### 4. UI Updates - Lead Detail Sheet
   - Modify components/LeadDetailSheet.tsx:
     - Add a new tab labeled "Ownership" alongside Overview, FMCSA, Satellite, Notes.
     - In the new tab's content, display:
       * CEO name (if available)
       * PE ownership status: "Yes, owned by [PE Firm Name]" or "No, not PE-owned"
       * Handle loading state while data is being fetched (if we decide to fetch on demand) or show cached data from the lead prop.
   - Since the data will be stored in the company record, we can access it via `lead.company.ceo`, `lead.company.is_pe_owned`, `lead.company.pe_owner`.
   - Add appropriate UI components (text, badges) to present this information clearly.

### 5. TypeScript Updates
   - Update lib/types.ts Company interface with the new fields.
   - Ensure all places where companies are used (like in the mock data) are updated if necessary for consistency.

### 6. Optional: Mock Data Updates
   - Update lib/mock-data.ts to include sample CEO and PE ownership data for the mock companies to facilitate testing.

## Key Files to Modify
1. supabase/schema.sql - Add new columns to companies table
2. lib/types.ts - Update Company interface
3. lib/exa.ts - Add new EXA function for CEO and PE ownership
4. app/api/enrich/route.ts - Modify enrichment process to call new function and store data
5. components/LeadDetailSheet.tsx - Add new ownership tab and display logic
6. lib/mock-data.ts - (Optional) Add sample data for mock companies

## Verification
- Test that the new database columns are present and can be written to.
- Verify that the EXA function returns expected structure for test companies.
- Confirm that during lead enrichment, the CEO and PE ownership data is stored in the database.
- Check that the Lead Detail Sheet shows the new tab with correct information when data is available.
- Ensure UI handles missing data gracefully (shows "Not available" or similar).
- Test that existing functionality (scoring, FMCSA, imagery) remains unaffected.
- Validate that both new company discovery and company refresh processes update the ownership data.

## Reusing Existing Patterns
- Follow the existing EXA API pattern in lib/exa.ts (using fetch, outputSchema, error handling).
- Use the same upsert approach as existing company fields in the enrichment process.
- Follow the existing tab structure and InfoRow component patterns in LeadDetailSheet.tsx.
- Maintain consistent error logging and handling as seen throughout the codebase.