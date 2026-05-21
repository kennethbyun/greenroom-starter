# Settlement Error Detection Brief

## 1. Problem

Mariana needs artist payouts to be concrete and defensible before she shares them with the tour manager or agent.

Today, settlement errors can hide in plain sight. Greenroom may show a payout, but the underlying data can contain mismatches, missing assumptions, or status contradictions. A recoup may be included even though it is disputed. A deal note may describe a Vs deal while structured fields suggest something simpler. A settlement may appear unresolved even though sign-off text says the artist team approved it.

The narrow problem for this MVP:

> Before Mariana sends an artist payout, Greenroom should detect likely settlement errors that could make the payout wrong or hard to defend.

This MVP is not trying to rebuild every settlement calculator or support every deal type. It focuses on catching high-risk errors before the payout leaves the room.

## 2. Primary User: Mariana Reyes, Lead Booker

Mariana is the primary user because she owns the settlement conversation and the artist relationship.

Her job in this moment is:

> Send a payout number she can trust, explain, and defend.

At 2 a.m., Mariana does not need a broad analytics dashboard. She needs a short pre-payout error check that answers:

- Is there anything obviously wrong?
- Is there anything contradictory?
- Is there anything included in the payout that needs review?
- What should I fix before I send this number?

## 3. Secondary User: Marcus Holland, GM

Marcus is the secondary user because payout errors can create margin loss, concessions, and post-show escalations.

For this MVP, Marcus is not the main workflow owner. The feature is designed for Mariana's settlement flow. However, the detected errors should be clear enough that Mariana can pull Marcus in when the issue affects venue margin or relationship risk.

Future versions could add GM escalation, approval workflows, and cross-show error reporting. Those are intentionally out of scope for the MVP.

## 4. Current Workflow

Today, Mariana manually checks whether the payout is safe to send.

1. Mariana opens the settlement for a show.
2. She reviews the payout, expenses, fees, recoups, comps, deal terms, and notes.
3. She manually checks whether the settlement math seems consistent with the deal.
4. For nuanced deals, she often moves to a spreadsheet or rereads deal notes.
5. If something is wrong, she may only catch it during the settlement conversation or after the agent challenges the payout.
6. If the payout is already shared, fixing the issue can become a dispute, concession, or trust problem.

The current workflow relies on Mariana's expertise, but Greenroom does not provide a focused safety check before payout.

## 5. Pain Points

- **Likely errors are not surfaced proactively.** Mariana has to inspect the data herself before sending payout.
- **Structured fields can conflict with deal notes.** The deal notes may describe terms that the structured settlement fields do not fully capture.
- **Recoups can be applied incorrectly.** A disputed, withdrawn, or unclear recoup may still affect the payout.
- **Statuses can be misleading.** The UI badge may not match sign-off language or the underlying settlement reality.
- **Unsupported deals increase risk.** Vs deals and related variants are common at The Crescent, but unsupported logic makes errors harder to detect.
- **Late error discovery damages trust.** If the artist team finds the problem first, Mariana loses credibility even if the final correction is small.

## 6. Proposed Solution

Build a simple **Settlement Error Detection** check.

Before Mariana sends or finalizes an artist payout, Greenroom runs a focused error scan and surfaces a small set of high-risk findings.

The MVP detects four error types:

1. **Deal mismatch**
   The structured deal fields do not appear to match the freeform deal notes.

   Example: structured deal type says Flat, but notes mention "guarantee versus 80% of net."

2. **Recoup conflict**
   A recoup that affects payout is marked disputed, withdrawn, or unclear.

   Example: marketing recoup is included in settlement math, but its status is disputed.

3. **Status contradiction**
   Settlement status conflicts with sign-off text or approval language.

   Example: settlement status is Disputed, but sign-off text says "Looks good."

4. **Missing support for payout-impacting logic**
   The deal appears to use a structure Greenroom does not fully support, but the payout is still presented as if it is final.

   Example: notes mention walkout pot, tier ratchet, or Vs net logic not supported by the current calculator.

Each error finding should include:

- error type
- severity
- plain-language explanation
- source evidence
- suggested next action

Example:

> Possible recoup conflict: $650 marketing recoup is included in the payout, but the recoup status is disputed. Review before sending payout.

For this MVP, the goal is not to fix the payout automatically. The goal is to stop Mariana from sending a payout that contains a detectable issue.

Out of scope for MVP:

- automatic payout correction
- full Vs deal calculator support
- agent-facing summaries
- dispute resolution workflow
- receipt OCR
- Marcus approval workflow
- configurable rule builder
- cross-show error analytics

## 7. Why AI Is Needed

Some error detection can be rules-based. Greenroom can check whether a recoup is disputed, whether a required field is missing, or whether the status and sign-off text conflict.

AI is needed because many settlement errors are hidden in prose.

AI can help by:

- reading freeform deal notes for payout-impacting terms
- comparing deal notes against structured fields
- identifying language that suggests unsupported deal logic
- summarizing why an item may be risky
- turning messy source evidence into a plain-language finding

The AI should be bounded. It should not decide the final payout, rewrite settlement math, or resolve disputes. It should flag likely errors, show evidence, and ask Mariana to review.

This is a strong AI use case because the feature depends on interpreting messy venue language, not just calculating totals.

## 8. Risks & Mitigations

- **Risk: False positives slow Mariana down.**  
  Mitigation: limit MVP checks to high-risk, payout-impacting errors and show only a small number of findings.

- **Risk: AI misinterprets deal notes.**  
  Mitigation: show source evidence with every AI-generated finding so Mariana can verify quickly.

- **Risk: Mariana treats the check as approval.**  
  Mitigation: frame it as error detection, not settlement certification. Use language like "review needed" rather than "correct."

- **Risk: Unsupported deal types still cannot be settled in-app.**  
  Mitigation: flag unsupported payout logic explicitly instead of pretending the calculator can handle it.

- **Risk: The feature becomes too broad.**  
  Mitigation: keep v1 limited to four error types: deal mismatch, recoup conflict, status contradiction, and unsupported payout-impacting logic.

## 9. Success Metrics

- **Errors caught before payout:** number and percentage of high-risk findings surfaced before artist payout is sent.
- **Useful finding rate:** percentage of findings Mariana marks as useful or requiring review during testing.
- **False positive rate:** percentage of findings Mariana dismisses as not relevant.
- **Reduced payout corrections:** fewer settlements require payout edits after sharing with the artist team.
- **Reduced dispute triggers:** fewer disputes caused by recoup conflicts, deal mismatch, or unclear settlement status.
- **Time to review:** Mariana can complete the pre-payout error check quickly enough to use it during late-night settlement.

Future versions could add automatic correction suggestions, GM escalation, agent-facing explanations, historical error patterns, and broader deal model support. Those are important, but this MVP should prove that Greenroom can catch the most obvious payout risks before Mariana sends the number.
