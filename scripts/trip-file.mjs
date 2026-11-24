/**
 * The check of a trip file (local/trip.json). One function, so the rules of
 * a good trip file live in one place; scripts/create-trip.mjs calls it
 * before it writes anything.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (value) => typeof value === "string" && DAY.test(value) && !Number.isNaN(Date.parse(value));
const isText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;

/**
 * Checks a parsed trip file and lists what is wrong with it, so the script
 * can stop before it writes half a trip.
 *
 * Inputs: file — the parsed JSON of local/trip.json. Its shape is
 * data/trip.example.json. `crew` may be empty (plan, case 8); `summary`,
 * `note` and `noteBy` may be left out.
 * idFromName — the id rule of web/src/lib/ids.ts, passed in so that two
 * names that give one id ("Kai" and "KAI") count as equal.
 * Output: a list of problems, each naming the field; an empty list means
 * the file is good.
 * Examples:
 *   the example file                          → []
 *   a date option of 2027-03-01 to 2027-02-24 → ["dateOptions[0] ends before it starts"]
 */
export function validateTripFile(file, idFromName) {
  if (typeof file !== "object" || file === null || Array.isArray(file)) return ["the file is not a JSON object"];
  const problems = [];

  if (!isText(file.name, 80)) problems.push("name is missing or longer than 80 characters");
  for (const field of ["summary", "note", "noteBy"]) {
    if (file[field] !== undefined && !isText(file[field], 200)) problems.push(`${field} must be text of 1 to 200 characters`);
  }

  const season = file.season ?? {};
  const seasonGood = isDay(season.from) && isDay(season.to) && season.from <= season.to;
  if (!seasonGood) problems.push("season needs from and to as YYYY-MM-DD, from first");

  const anchor = file.anchor ?? {};
  const anchorGood = isText(anchor.name, 40) && isDay(anchor.date);
  if (!anchorGood) problems.push("anchor needs a name and a date as YYYY-MM-DD");

  const destinations = file.destinations;
  if (typeof destinations !== "object" || destinations === null || Object.keys(destinations).length === 0) {
    problems.push("destinations is missing");
  } else {
    for (const [id, destination] of Object.entries(destinations)) {
      if (!/^[A-Za-z0-9]{1,40}$/.test(id)) problems.push(`destinations.${id}: the id must be letters and digits only`);
      if (!isText(destination?.name, 40)) problems.push(`destinations.${id}.name is missing`);
    }
  }

  if (!Array.isArray(file.dateOptions)) {
    problems.push("dateOptions is missing; use [] for none");
  } else {
    file.dateOptions.forEach((option, i) => {
      const where = `dateOptions[${i}]`;
      if (!isDay(option?.from) || !isDay(option?.to)) return problems.push(`${where} needs from and to as YYYY-MM-DD`);
      if (option.to < option.from) return problems.push(`${where} ends before it starts`);
      if (seasonGood && (option.from < season.from || option.to > season.to)) problems.push(`${where} lies outside the season`);
    });
  }

  if (!Array.isArray(file.crew)) {
    problems.push("crew is missing; use [] for none");
  } else {
    const seen = new Map();
    file.crew.forEach((name, i) => {
      if (!isText(name, 24)) return problems.push(`crew[${i}] must be a name of 1 to 24 characters`);
      const id = idFromName(name);
      if (seen.has(id)) problems.push(`crew has two equal names: "${seen.get(id)}" and "${name}"`);
      else seen.set(id, name);
    });
  }

  return problems;
}
