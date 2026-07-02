# World Cup 2026 Prediction Model

A Poisson attack/defence Monte Carlo model over the real 2026 tournament
results (group stage + Round of 32, as of July 2, 2026).

## Run

```bash
npm run predict:worldcup          # 100,000 simulations
node analysis/world-cup-2026/predict.js 500000   # custom run count
```

## Method

1. **Ratings** — each surviving team's attack (goals scored/game) and defence
   (goals conceded/game) from its 2026 matches, shrunk toward the tournament
   mean with a 2-game Bayesian prior (small-sample control; 3-4 games per team).
2. **Match model** — expected goals for A vs B:
   `λ_A = attack_A × defence_B / μ` where μ is tournament-average goals per
   team per game. Hosts (Mexico, USA, Canada) get a +10% attack bump. Scores
   are sampled from independent Poissons; knockout draws go to extra time
   (1/3-rate Poisson) then a 50/50 shootout.
3. **Tournament** — the 5 unplayed Round-of-32 matches are simulated first,
   winners slot into the published Round-of-16 bracket, then QF → SF → Final,
   repeated 100,000 times.

## Data caveats

- Scores were compiled from public match reports (Yahoo, FOX, UEFA.com, ESPN,
  NBC/GMA). A minority of group-stage scorelines could not be individually
  confirmed and were reconstructed from standings context — flagged with
  `est: true` in `data.js`.
- Penalty shootouts are modelled as coin flips; the model has no player-level
  information (injuries, suspensions, fatigue).
- Germany and the Netherlands were eliminated in the Round of 32 (both on
  penalties after 1-1 draws vs Paraguay and Morocco). The script includes a
  counterfactual bracket showing what their title odds would have been had
  they won those shootouts.
