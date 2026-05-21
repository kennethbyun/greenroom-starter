# AI Deal Interpreter & Settlement Calculator Brief

## 1. Problem

Greenroom already has the inputs Mariana needs to settle a show: gross box office, ticketing fees, expenses, ticket counts, deal notes, recoups, and settlement history. But for common deal types at The Crescent, especially Vs deals, percentage-of-net deals, and door deals, the in-app tool cannot interpret the deal language and turn those inputs into a clear settlement calculation.

Because the tool cannot model the deal, Mariana leaves Greenroom and uses a spreadsheet. That creates duplicate work, weakens Greenroom as the system of record, and makes the 2 a.m. settlement conversation harder to defend.

The narrow problem for this MVP:

> Mariana needs Greenroom to interpret the deal notes, show the extracted settlement terms, and calculate the artist payout with visible step-by-step math.

This is not a generic AI copilot or a full dispute workflow. It is a focused in-app settlement tool for interpreting deal language and showing the calculation.

## 2. Primary User: Mariana Reyes, Lead Booker

Mariana is the primary user because she owns the settlement conversation with the tour manager and agent.

Her job in this moment is:

> Turn the negotiated deal into a payout number she can trust, explain, and defend.

Mariana does not need AI to replace her judgment. She needs the product to read the same deal notes she trusts, extract the key terms, show its interpretation, and make the math visible enough that she can catch mistakes before sharing the payout.

## 3. Secondary User: Marcus Holland, GM

Marcus is the secondary user because settlement mistakes affect venue margin and can become costly concessions.

For this MVP, Marcus is not the main workflow owner. The feature is designed for Mariana's settlement flow. But the output should be transparent enough that Marcus can review the calculation if a payout looks risky or if an agent challenges the settlement.

Future versions could add GM approval, margin warnings, or cross-show settlement risk reporting. Those are out of scope for the MVP.

## 4. Current Workflow

Today, Mariana cannot rely on the in-app settlement tool for many common deals.

1. Mariana opens a show settlement in Greenroom.
2. Greenroom shows the available inputs: gross box office, fees, expenses, tickets, recoups, and deal notes.
3. If the deal is flat or simple percentage-of-gross, the in-app calculator can produce a payout.
4. If the deal is a Vs deal, percentage-of-net deal, or door deal, the tool says it cannot settle the show.
5. Mariana moves to a spreadsheet, manually interprets the deal notes, applies caps and deductions, and calculates payout.
6. She may later log the final result back into Greenroom, but the actual reasoning lives outside the product.

The current workflow breaks at the exact moment Greenroom should be most useful: interpreting the negotiated deal and showing the math.

## 5. Pain Points

- **The tool cannot settle common deal types.** Vs deals and percentage-of-net deals are core to The Crescent's booking program.
- **Deal truth lives in prose.** Mariana often trusts `deal_notes_freetext` more than the structured fields because the structured fields do not capture every negotiated nuance.
- **Spreadsheet fallback creates duplicate work.** The system has the inputs, but Mariana still has to rebuild the logic elsewhere.
- **The math is hard to defend when it lives outside Greenroom.** Tour managers and agents need to understand how the payout was calculated.
- **Unsupported clauses are mixed into otherwise settleable deals.** A standard Vs deal may be calculable, but a walkout pot, tier ratchet, or ambiguous marketing recoup needs human review.
- **Mistakes cost real money.** Marcus and Mariana both describe settlement errors leading to concessions and lost trust.

## 6. Proposed Solution

Build an **AI Deal Interpreter & Settlement Calculator** inside the settlement page.

The feature has two jobs:

1. **Interpret the deal**
   Read the freeform deal notes and extract the settlement terms Mariana needs to confirm:

   - deal type
   - guarantee amount
   - percentage
   - basis: gross, net, or door
   - expense cap
   - hospitality cap
   - recoup language
   - unsupported or ambiguous clauses

2. **Calculate the payout**
   Use the interpreted terms and existing show inputs to produce visible step-by-step settlement math.

MVP calculation support:

- standard Vs deal: guarantee vs percentage of net after fees and approved expenses, whichever is greater
- percentage-of-net deal: percentage of net after fees and approved expenses
- simple door deal: artist percentage of eligible door revenue after agreed deductions

The UI should show:

- extracted deal terms
- confidence / needs-review flags
- unsupported clauses, if any
- gross box office
- fees
- expenses applied
- expense cap handling
- net settlement base
- artist percentage share
- guarantee comparison when relevant
- final artist payout

Example:

> AI interpreted this as: $5,000 guarantee vs 80% of net after expenses, whichever is greater. Expenses capped at $2,500. Hospitality cap $500. Marketing recoup language needs review.

Then show:

```text
Gross box office                 $19,840
Less ticketing fees              -$1,984
Less capped expenses             -$2,500
Net settlement base              $15,356
Artist share: 80%                $12,285
Guarantee comparison              $5,000
Final artist payout              $12,285
```

For this MVP, AI interpretation should be reviewable. Mariana should see what the system extracted before trusting the payout.

Out of scope for MVP:

- automatic submission to artist team
- dispute workflow
- full support for walkout pots
- full support for tier ratchets
- receipt OCR
- configurable rule builder
- agent-facing collaboration
- automatic correction of historical settlements

## 7. Why AI Is Needed

Rules are enough once the deal terms are structured. The hard part is that the most trustworthy deal terms often live in messy prose.

AI is needed to translate deal notes into a structured settlement model:

- "guarantee vs 80% net after expenses" becomes a Vs deal
- "expenses capped at $2,500" becomes an expense cap
- "hospitality $500" becomes a hospitality cap
- "marketing recoup against gross" becomes a flagged recoup clause
- "walkout pot" or "tier ratchet" becomes an unsupported-clause warning

The AI should be bounded. It should not silently finalize the payout. It should extract terms, explain its interpretation, flag uncertainty, and let Mariana review the calculation.

This is a strong AI use case because Greenroom already has the numeric inputs. The missing layer is interpretation.

## 8. Risks & Mitigations

- **Risk: AI misinterprets deal notes.**  
  Mitigation: show extracted terms and source evidence before showing the payout as usable.

- **Risk: Mariana over-trusts the calculation.**  
  Mitigation: label the calculation as based on interpreted terms and show any needs-review clauses prominently.

- **Risk: The MVP becomes too broad.**  
  Mitigation: support only standard Vs, percentage-of-net, and simple door deals. Flag walkout pots, tier ratchets, and ambiguous recoups instead of trying to solve them.

- **Risk: Structured fields conflict with deal notes.**  
  Mitigation: compare both and show a mismatch warning when the AI interpretation differs from stored structured values.

- **Risk: Agents challenge deductions.**  
  Mitigation: make every deduction visible in the calculation steps, especially fees, expenses, caps, and recoups.

## 9. Success Metrics

- **Spreadsheet fallback reduction:** fewer unsupported settlements require Mariana to leave Greenroom.
- **Interpretation accuracy:** percentage of extracted deal terms Mariana confirms without editing during testing.
- **Calculation trust:** Mariana reports that the step-by-step math is clear enough to explain to a tour manager.
- **Time to calculate:** time required to produce a payout for standard Vs and percentage-of-net deals decreases.
- **Unsupported clause detection:** walkout pots, tier ratchets, and ambiguous recoups are flagged instead of silently calculated.
- **Payout correction reduction:** fewer payouts require correction after being shared with the artist team.

Future versions could add richer deal models, artist-facing settlement previews, GM approvals, historical pattern detection, and dispute-resolution support. The MVP should prove that Greenroom can keep Mariana inside the product for the most common spreadsheet fallback cases.
