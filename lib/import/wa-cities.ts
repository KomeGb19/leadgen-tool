// Common Puget Sound / western WA cities — used to reliably locate the city
// boundary in "CompanyName Address City" merged text, since street-type
// abbreviations (ST, SW, AVE, RD...) are also plain words and can't be
// distinguished from a city name by pattern alone.
export const WA_CITIES: Set<string> = new Set([
  "seattle","auburn","snohomish","everett","puyallup","tacoma","bonney lake","milton",
  "spanaway","renton","kent","mill creek","roy","lake stevens","graham","woodinville",
  "enumclaw","stanwood","edmonds","sumner","portland","hobart","vashon","bothell",
  "ravensdale","maple valley","kirkland","arlington","north bend","covington","monroe",
  "granite falls","buckley","bellevue","redmond","federal way","tukwila","burien",
  "sammamish","issaquah","shoreline","lynnwood","mountlake terrace","mercer island",
  "des moines","normandy park","seatac","black diamond","carnation","duvall","fall city",
  "north bend","skykomish","gold bar","index","sultan","startup","marysville","lake forest park",
  "woodway","brier","kenmore","newcastle","clyde hill","medina","hunts point","yarrow point",
  "pacific","algona","bellingham","olympia","university place","lakewood","gig harbor",
]);