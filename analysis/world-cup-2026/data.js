/**
 * FIFA World Cup 2026 — results dataset as of July 2, 2026 (through Round of 32).
 *
 * Compiled from public match reports (Yahoo Sports, FOX Sports, UEFA.com, ESPN,
 * NBC/GMA news wires). Each entry is one match from THIS tournament:
 * [goalsFor, goalsAgainst] from the team's perspective, `est: true` marks
 * scorelines that were not individually confirmed in reports and were
 * reconstructed from final standings context (kept conservative).
 *
 * Only teams still alive on July 2 are simulated. Germany and the Netherlands
 * are included for the counterfactual analysis: both were eliminated in the
 * Round of 32 on penalties (draws after 120 minutes — recorded here as draws).
 */

// Matches: group stage + Round of 32 (played matches only)
const TEAMS = {
  // ---- Already qualified for Round of 16 ----
  Mexico:      { host: true,  matches: [[2, 0], [1, 0], [3, 0], [2, 0]] },
  Canada:      { host: true,  matches: [[1, 1], [6, 0], [1, 3], [1, 0]] },
  USA:         { host: true,  matches: [[4, 1], [2, 0], [2, 3], [2, 0]] },
  Morocco:     { host: false, matches: [[1, 1], [1, 0], [4, 2], [1, 1]] }, // advanced on pens vs Netherlands
  Paraguay:    { host: false, matches: [[1, 4], [0, 1], [0, 0], [1, 1]] }, // advanced on pens vs Germany
  Brazil:      { host: false, matches: [[1, 1], [3, 0], [3, 0], [2, 1]] },
  Norway:      { host: false, matches: [[4, 1], [2, 1], [2, 1, { est: true }], [2, 1]] },
  France:      { host: false, matches: [[3, 1], [3, 0, { est: true }], [1, 2], [3, 0]] },
  England:     { host: false, matches: [[4, 2], [0, 0], [2, 0], [2, 1]] },
  Belgium:     { host: false, matches: [[1, 1], [5, 1], [2, 0, { est: true }], [3, 2]] }, // R32 win a.e.t.
  Spain:       { host: false, matches: [[0, 0], [1, 0], [4, 0, { est: true }], [3, 0]] },

  // ---- Round of 32 still pending (5 matches) ----
  Portugal:    { host: false, matches: [[6, 0, { est: true }], [0, 1, { est: true }], [0, 0]] },
  Croatia:     { host: false, matches: [[2, 4], [2, 1], [2, 0, { est: true }]] },
  Switzerland: { host: false, matches: [[3, 1], [2, 1, { est: true }], [1, 0, { est: true }]] },
  Algeria:     { host: false, matches: [[0, 3], [2, 1], [3, 3]] },
  Australia:   { host: false, matches: [[0, 2], [0, 0], [2, 1, { est: true }]] },
  Egypt:       { host: false, matches: [[1, 1], [2, 0, { est: true }], [1, 1, { est: true }]] },
  Argentina:   { host: false, matches: [[3, 0], [2, 0], [3, 1]] },
  CapeVerde:   { host: false, matches: [[0, 0], [1, 0, { est: true }], [1, 1, { est: true }]] },
  Colombia:    { host: false, matches: [[1, 0], [0, 0], [2, 0, { est: true }]] },
  Ghana:       { host: false, matches: [[0, 0], [1, 2], [2, 0, { est: true }]] },

  // ---- Eliminated in Round of 32 (counterfactual only) ----
  Germany:     { host: false, matches: [[7, 1], [2, 1], [1, 2, { est: true }], [1, 1]] }, // out on pens vs Paraguay
  Netherlands: { host: false, matches: [[2, 2], [3, 1], [2, 0, { est: true }], [1, 1]] }, // out on pens vs Morocco
};

// Round of 32 matches not yet played as of July 2 evening (ET)
const PENDING_R32 = [
  ['Portugal', 'Croatia'],
  ['Switzerland', 'Algeria'],
  ['Australia', 'Egypt'],
  ['Argentina', 'CapeVerde'],
  ['Colombia', 'Ghana'],
];

// Round of 16 bracket (July 4-7). Strings are team names; objects reference a
// pending R32 match by index — the simulated winner slots in.
const ROUND_OF_16 = [
  ['Canada', 'Morocco'],                        // M1 - Jul 4, Houston
  ['Paraguay', 'France'],                       // M2 - Jul 4, Philadelphia
  ['Brazil', 'Norway'],                         // M3 - Jul 5, East Rutherford
  ['Mexico', 'England'],                        // M4 - Jul 5, Mexico City
  [{ pending: 0 }, 'Spain'],                    // M5 - Jul 6, Dallas
  ['USA', 'Belgium'],                           // M6 - Jul 6, Seattle
  [{ pending: 3 }, { pending: 2 }],             // M7 - Jul 7, Atlanta
  [{ pending: 1 }, { pending: 4 }],             // M8 - Jul 7, Vancouver
];

// Quarterfinals pair adjacent R16 winners (M1vM2, M3vM4, M5vM6, M7vM8),
// semifinals pair adjacent QF winners — standard FIFA bracket flow.

module.exports = { TEAMS, PENDING_R32, ROUND_OF_16 };
