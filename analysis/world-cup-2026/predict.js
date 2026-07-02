/**
 * World Cup 2026 championship prediction — Poisson attack/defence Monte Carlo.
 *
 * Model:
 *  1. From each team's 2026 tournament matches, estimate attack (goals scored
 *     per game) and defence (goals conceded per game), shrunk toward the
 *     tournament mean with a 2-game Bayesian prior to tame tiny samples.
 *  2. Expected goals for A vs B:  lambda_A = attack_A * defence_B / mu,
 *     where mu is the tournament-average goals per team per game.
 *     Host nations get a +10% attack bump (all venues are home soil for them).
 *  3. Each match is sampled from independent Poissons; knockout draws go to
 *     extra time (Poisson at 1/3 rate) and then a 50/50 penalty shootout.
 *  4. Simulate the remaining bracket (5 pending R32 games -> R16 -> QF -> SF
 *     -> Final) N times and count how often each team lifts the trophy.
 *
 * Usage:  node analysis/world-cup-2026/predict.js [runs=100000]
 */

const { TEAMS, PENDING_R32, ROUND_OF_16 } = require('./data');

const RUNS = parseInt(process.argv[2] || '100000', 10);
const PRIOR_GAMES = 2;   // shrinkage strength (in games)
const HOST_BOOST = 1.10; // attack multiplier for host nations
const ET_FACTOR = 1 / 3; // extra time is 30 of 90 minutes

// ---- Team strength ratings ------------------------------------------------

function tournamentMean(teams) {
  let goals = 0;
  let games = 0;
  for (const t of Object.values(teams)) {
    for (const [gf] of t.matches) goals += gf;
    games += t.matches.length;
  }
  return goals / games;
}

const MU = tournamentMean(TEAMS);

function rate(team) {
  const gp = team.matches.length;
  let gf = 0;
  let ga = 0;
  for (const [f, a] of team.matches) {
    gf += f;
    ga += a;
  }
  return {
    attack: (gf + PRIOR_GAMES * MU) / (gp + PRIOR_GAMES),
    defence: (ga + PRIOR_GAMES * MU) / (gp + PRIOR_GAMES),
  };
}

function buildRatings(teams) {
  const ratings = {};
  for (const [name, team] of Object.entries(teams)) {
    ratings[name] = { ...rate(team), host: team.host };
  }
  return ratings;
}

// ---- Match simulation -----------------------------------------------------

function poisson(lambda) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > limit);
  return k - 1;
}

function expectedGoals(ratings, a, b) {
  const ra = ratings[a];
  const rb = ratings[b];
  const boostA = ra.host ? HOST_BOOST : 1;
  const boostB = rb.host ? HOST_BOOST : 1;
  return [
    (ra.attack * boostA * rb.defence) / MU,
    (rb.attack * boostB * ra.defence) / MU,
  ];
}

/** Returns the winner of a knockout match between named teams. */
function playKnockout(ratings, a, b) {
  const [la, lb] = expectedGoals(ratings, a, b);
  let ga = poisson(la);
  let gb = poisson(lb);
  if (ga !== gb) return ga > gb ? a : b;
  // extra time
  ga = poisson(la * ET_FACTOR);
  gb = poisson(lb * ET_FACTOR);
  if (ga !== gb) return ga > gb ? a : b;
  // penalties: coin flip
  return Math.random() < 0.5 ? a : b;
}

/** Analytic win probability (incl. ET + pens) for reporting head-to-heads. */
function winProbability(ratings, a, b, samples = 200000) {
  let wins = 0;
  for (let i = 0; i < samples; i++) {
    if (playKnockout(ratings, a, b) === a) wins += 1;
  }
  return wins / samples;
}

// ---- Tournament simulation --------------------------------------------------

function resolveSlot(slot, pendingWinners) {
  return typeof slot === 'string' ? slot : pendingWinners[slot.pending];
}

function simulateTournament(ratings, roundOf16) {
  const pendingWinners = PENDING_R32.map(([a, b]) => playKnockout(ratings, a, b));
  let round = roundOf16.map(([sa, sb]) =>
    [resolveSlot(sa, pendingWinners), resolveSlot(sb, pendingWinners)]
  );
  const reached = { SF: [], F: [] };
  while (round.length > 1) {
    const winners = round.map(([a, b]) => playKnockout(ratings, a, b));
    if (winners.length === 4) reached.SF = winners;
    if (winners.length === 2) reached.F = winners;
    const next = [];
    for (let i = 0; i < winners.length; i += 2) next.push([winners[i], winners[i + 1]]);
    round = next;
  }
  const champion = playKnockout(ratings, round[0][0], round[0][1]);
  return { champion, finalists: reached.F, semifinalists: reached.SF };
}

function runSimulation(roundOf16, label) {
  const ratings = buildRatings(TEAMS);
  const titles = {};
  const finals = {};
  const semis = {};
  for (let i = 0; i < RUNS; i++) {
    const { champion, finalists, semifinalists } = simulateTournament(ratings, roundOf16);
    titles[champion] = (titles[champion] || 0) + 1;
    for (const t of finalists) finals[t] = (finals[t] || 0) + 1;
    for (const t of semifinalists) semis[t] = (semis[t] || 0) + 1;
  }
  const pct = (n) => (100 * (n || 0)) / RUNS;
  const table = Object.keys(titles)
    .sort((x, y) => titles[y] - titles[x])
    .map((team) => ({
      team,
      'win title %': +pct(titles[team]).toFixed(2),
      'reach final %': +pct(finals[team]).toFixed(2),
      'reach semis %': +pct(semis[team]).toFixed(2),
    }));
  console.log(`\n=== ${label} (${RUNS.toLocaleString()} simulations) ===`);
  console.table(table);
  return { titles, ratings };
}

// ---- Main -------------------------------------------------------------------

console.log(`Tournament mean goals per team per game: ${MU.toFixed(3)}`);
console.log('\nTeam ratings (attack = xG scored/game, defence = xG conceded/game, shrunk):');
const ratings = buildRatings(TEAMS);
console.table(
  Object.entries(ratings)
    .sort((a, b) => (b[1].attack - b[1].defence) - (a[1].attack - a[1].defence))
    .map(([team, r]) => ({
      team,
      attack: +r.attack.toFixed(2),
      defence: +r.defence.toFixed(2),
      'net strength': +(r.attack - r.defence).toFixed(2),
    }))
);

// 1) Actual bracket
runSimulation(ROUND_OF_16, 'ACTUAL bracket — who wins the 2026 World Cup');

// 2) Counterfactual: Germany and Netherlands had won their shootouts
const counterfactualR16 = ROUND_OF_16.map(([a, b]) => {
  const swap = (s) => (s === 'Paraguay' ? 'Germany' : s === 'Morocco' ? 'Netherlands' : s);
  return [typeof a === 'string' ? swap(a) : a, typeof b === 'string' ? swap(b) : b];
});
runSimulation(
  counterfactualR16,
  'COUNTERFACTUAL — if Germany & Netherlands had won their R32 shootouts'
);

// 3) Germany / Netherlands headline numbers
console.log('\n=== Germany & Netherlands ===');
console.log('Actual chance of winning the 2026 World Cup: 0.00% (both eliminated in the Round of 32 on penalties)');
console.log(`Model strength — Germany: attack ${ratings.Germany.attack.toFixed(2)}, defence ${ratings.Germany.defence.toFixed(2)}`);
console.log(`Model strength — Netherlands: attack ${ratings.Netherlands.attack.toFixed(2)}, defence ${ratings.Netherlands.defence.toFixed(2)}`);
console.log(`Single-match model odds vs their conquerors:`);
console.log(`  Germany beats Paraguay:     ${(100 * winProbability(ratings, 'Germany', 'Paraguay')).toFixed(1)}%  (they still went out on pens)`);
console.log(`  Netherlands beats Morocco:  ${(100 * winProbability(ratings, 'Netherlands', 'Morocco')).toFixed(1)}%  (they still went out on pens)`);
