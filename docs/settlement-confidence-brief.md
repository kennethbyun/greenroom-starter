# Settlement Variance Alert Brief

## 1. Problem

Settlement risk builds before the final settlement conversation. At The Crescent, the projected artist payout can move throughout the show lifecycle as ticket sales finalize, fees post, expenses get added, comps are counted, recoups are interpreted, and deal terms are applied. Today, Mariana does not have a clear way to see when that projected payout has changed materially or why it changed.

That means the most stressful part of settlement often starts with surprise. Mariana may walk into the 2 a.m. conversation expecting one number, only to realize the final take-home has shifted because of a late expense, a comp rule, a recoup, or a mismatch between deal notes and structured deal fields.

The problem is not just that the final number changes. It is that the change is hard to detect, hard to explain, and hard to defend under pressure.

Greenroom should help bookers answer:

- Did the projected settlement change significantly?
- What caused the change?
- Is the change expected, explainable, or risky?
- Does Mariana need to act before the artist team asks about it?

## 2. Primary User: Mariana Reyes, Lead Booker

Mariana owns the booking relationship and is accountable for the settlement conversation. She needs to know when the settlement is drifting away from expectation early enough to investigate and prepare.

Her core job is:

> Know when the projected artist payout changes materially, understand why, and be ready to explain it before the tour manager asks.

Mariana does not need another dashboard full of numbers. She needs a timely alert that says, in plain language: "This settlement moved by $740 since your last review, mostly because marketing recoup and final ticketing fees were added."

The feature should support her judgment, not replace it. She decides whether the variance is acceptable, whether it needs an explanation, and whether Marcus should be pulled in.

## 3. Secondary User: Marcus Holland, GM

Marcus cares about margin protection, operational control, and avoiding avoidable disputes. He needs visibility when a settlement variance may affect the venue's financial outcome or create relationship risk.

His core job is:

> Understand which shows have meaningful settlement movement and where venue margin or artist trust is at risk.

Marcus does not need to review every small change. He needs escalation for meaningful variance: payout shifts above a threshold, new disputed recoups, expenses that push the deal into a different outcome, or changes that make the venue materially less profitable.

## 4. Current Workflow

Today, settlement changes are discovered manually and often late.

1. Mariana reviews the show details, deal notes, expected ticket sales, and settlement assumptions before or during show day.
2. Ticket sales, fees, expenses, comps, and recoups continue changing as the show gets closer to settlement.
3. Greenroom stores many of these inputs, but does not clearly show how the projected settlement has changed since Mariana last reviewed it.
4. Mariana may move to a spreadsheet for nuanced deals, especially Vs deals or deals with recoups.
5. At settlement time, she compares the final number against her expectation from memory, notes, or spreadsheet math.
6. If the artist payout changed materially, she has to reconstruct the cause while the tour manager is waiting.
7. If the explanation is weak or surprising, the issue may become a dispute, concession, or Monday follow-up.

The current workflow makes Mariana responsible for both monitoring the variance and explaining the variance, without giving her a clean variance trail.

## 5. Pain Points

- **Variance is invisible until it is painful.** Greenroom shows settlement data, but it does not proactively call out meaningful movement in projected artist payout or venue margin.
- **The cause of change is scattered.** A payout shift may be caused by ticketing fees, added expenses, recoups, comps, deal interpretation, or final sales, but Mariana has to piece that together manually.
- **Late changes create relationship risk.** A tour manager is more likely to challenge a number if the explanation sounds improvised.
- **Nuanced deals make variance harder to trust.** Vs deals, net-based deals, walkout pots, and recoup terms can make a small input change produce a larger payout impact.
- **Structured data is not always the truth.** Deal notes may explain why a variance matters, while structured fields may miss or misrepresent the underlying agreement.
- **Marcus sees the impact too late.** The GM may only learn about a margin hit or concession after settlement has already become tense.

## 6. Proposed Solution

Build a **Settlement Variance Alert** feature.

Greenroom should track projected settlement snapshots over time and alert Mariana when the projected artist payout or venue margin changes beyond a meaningful threshold. The alert should explain what changed, why it changed, and what action Mariana should consider.

The feature has four parts:

1. **Baseline snapshot**
   Greenroom captures a settlement projection at important moments, such as show confirmation, day-of-show review, pre-settlement review, or whenever Mariana manually marks a projection as reviewed.

2. **Variance detection**
   Greenroom compares the latest projection against the baseline and flags material movement. Thresholds could include dollar change, percentage change, guarantee crossover, margin impact, or disputed-recoup involvement.

3. **Cause explanation**
   The alert breaks down the drivers of the change, such as:

   - final ticket sales changed
   - ticketing fees posted
   - expenses were added or recategorized
   - comps affected paid capacity
   - a recoup was added, disputed, withdrawn, or included
   - the deal crossed from guarantee to upside
   - deal notes suggest a term that differs from structured fields

4. **Recommended action**
   The alert gives Mariana a practical next step:

   - review before sending settlement
   - add artist-facing explanation
   - confirm recoup approval
   - ask Marcus to review margin impact
   - mark variance as expected

The product stance is:

> Greenroom should warn Mariana when the settlement story changes, then help her explain the change before it becomes a confrontation.

## 7. Why AI Is Needed

Some variance detection should be rules-based. Greenroom can calculate whether payout changed by more than $500, whether expenses increased, or whether a recoup was added after the baseline.

AI is needed for the explanation layer because the most important reasons often live outside clean numeric fields.

AI can help by:

- translating numeric movement into a plain-language explanation
- comparing structured deal fields against freeform deal notes
- identifying whether the variance touches a negotiated term
- summarizing recoup descriptions and statuses
- drafting an internal note for Mariana or Marcus
- drafting an artist-facing explanation Mariana can edit

AI should be bounded. It should not decide whether the settlement is correct or finalize payout. It should explain the likely drivers, cite the underlying evidence, and make uncertainty visible.

This feature is a good AI fit because the core user need is not only calculation. It is interpretation: "What changed, why did it change, and how do I explain it without sounding like I just found out?"

## 8. Risks & Mitigations

- **Risk: Too many alerts create noise.**  
  Mitigation: alert only on material variance, such as dollar threshold, percentage threshold, guarantee crossover, disputed item involvement, or margin impact.

- **Risk: AI explains the wrong cause.**  
  Mitigation: show a numeric variance breakdown first, then use AI to summarize with citations to source fields, notes, or recoup items.

- **Risk: Mariana ignores alerts if they feel generic.**  
  Mitigation: make each alert specific: amount changed, direction of change, primary drivers, and recommended action.

- **Risk: Unsupported deal types make projections less reliable.**  
  Mitigation: label projection confidence clearly. For unsupported or partially supported deals, alert on input changes and deal-note mismatches without pretending the payout is final.

- **Risk: Artist-facing explanations expose internal uncertainty.**  
  Mitigation: separate internal alert language from external explanation drafts. Mariana chooses what gets shared.

- **Risk: Marcus gets pulled into too many shows.**  
  Mitigation: only escalate to Marcus when variance affects venue margin materially, involves a disputed item, or crosses a configurable threshold.

## 9. Success Metrics

- **Variance awareness:** percentage of material payout changes surfaced before final settlement.
- **Alert usefulness:** percentage of alerts Mariana marks as useful, expected, or requiring action.
- **Reduced surprise at settlement:** Mariana reports fewer cases where final payout differs unexpectedly from her pre-settlement expectation.
- **Dispute reduction:** fewer settlements move into disputed or revised states due to recoups, expenses, or deal interpretation.
- **Concession reduction:** fewer post-show concessions caused by late or poorly explained settlement changes.
- **Time to explain variance:** Mariana can identify the main cause of a material payout change faster.
- **GM escalation quality:** Marcus receives fewer but more relevant settlement escalations.
- **Spreadsheet fallback reduction:** fewer settlements require Mariana to manually track projected-vs-final changes outside Greenroom.
