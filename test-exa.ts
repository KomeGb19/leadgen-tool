import { searchCompanyFoundedYear, calculateYearsInBusiness } from "./lib/exa";

async function testExa() {
  try {
    console.log("Testing Exa with known company...");
    const result = await searchCompanyFoundedYear("McDonald's", "Seattle, WA");
    if (result?.founded_year) {
      const years = calculateYearsInBusiness(result.founded_year);
      console.log(`Success! Founded: ${result.founded_year}, Years in business: ${years}`);
      console.log("Full result:", result);
    } else {
      console.log("No result returned from Exa");
    }
  } catch (error) {
    console.error("Exa test failed:", error);
  }
}

testExa();