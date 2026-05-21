/**
 * Deal calculation logic for the in-app settlement tool.
 *
 * This module now does two jobs:
 *   1. Interpret the deal terms Mariana wrote in prose.
 *   2. Calculate the payout with visible settlement steps.
 *
 * The interpreter is intentionally bounded for the case-study prototype. It
 * supports standard Vs, percentage-of-net, and simple door deals, and flags
 * clauses that still need human review instead of silently guessing.
 */

import type { Deal, Expense, TicketSale, Bonus } from "@/db/schema";

type SupportedDealType =
  | "flat"
  | "percentage_of_gross"
  | "percentage_of_net"
  | "vs"
  | "door";

type Confidence = "high" | "medium" | "needs_review";

export type InterpretedDealTerm = {
  label: string;
  value: string;
  source: "Deal notes" | "Structured field" | "System inference";
  confidence: Confidence;
};

export type DealInterpretation = {
  dealType: SupportedDealType;
  summary: string;
  terms: InterpretedDealTerm[];
  warnings: {
    label: string;
    detail: string;
    severity: "medium" | "high";
  }[];
};

type SettlementStep = { label: string; value: number; note?: string };

export type SettlementCalculation =
  | {
      supported: true;
      grossBoxOffice: number;
      netBoxOffice: number;
      totalExpenses: number;
      totalToArtist: number;
      steps: SettlementStep[];
      finalFormula: string;
      bonusesApplied: { label: string; amount: number; reason: string }[];
      bonusesNotTriggered: { label: string; amount: number; reason: string }[];
      interpretation?: DealInterpretation;
    }
  | {
      supported: false;
      reason: string;
      dealType: Deal["dealType"];
      interpretation?: DealInterpretation;
    };

interface CalcInput {
  deal: Deal;
  ticketSales: TicketSale[];
  expenses: Expense[];
  venueCapacity?: number;
  ticketsSold?: number;
}

type ExpenseTotals = {
  rawPassThrough: number;
  hospitalityRaw: number;
  hospitalityApplied: number;
  beforeOverallCap: number;
  applied: number;
  absorbed: number;
  cappedByHospitality: boolean;
  cappedByOverall: boolean;
};

export function parseBonuses(deal: Deal): Bonus[] {
  if (!deal.bonusesJson) return [];
  try {
    const parsed = JSON.parse(deal.bonusesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function calculateSettlement(input: CalcInput): SettlementCalculation {
  const { deal, ticketSales, expenses, venueCapacity, ticketsSold } = input;

  const grossBoxOffice = ticketSales.reduce((sum, t) => sum + t.gross, 0);
  const totalFees = ticketSales.reduce((sum, t) => sum + t.fees, 0);
  const netBoxOffice = grossBoxOffice - totalFees;
  const expenseTotals = calculateExpenseTotals(expenses, deal);
  const totalExpenses = expenseTotals.applied;
  const tickets =
    ticketsSold ?? ticketSales.reduce((sum, t) => sum + (t.qty ?? 0), 0);
  const interpretation = interpretDeal(deal);

  if (deal.dealType === "flat") {
    if (deal.guaranteeAmount == null) {
      return {
        supported: false,
        reason: "Flat deal is missing a guarantee amount.",
        dealType: deal.dealType,
        interpretation,
      };
    }

    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: deal.guaranteeAmount + bonusResult.totalApplied,
      steps: [
        {
          label: "Flat guarantee",
          value: deal.guaranteeAmount,
          note: "No expense deductions. The guarantee is the payout floor.",
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `flat ${deal.guaranteeAmount} + bonuses ${bonusResult.totalApplied} = ${(
            deal.guaranteeAmount + bonusResult.totalApplied
          ).toFixed(2)}`
        : `flat guarantee = ${deal.guaranteeAmount}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
      interpretation,
    };
  }

  if (deal.dealType === "percentage_of_gross") {
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Percentage-of-gross deal is missing a percentage.",
        dealType: deal.dealType,
        interpretation,
      };
    }

    const payout = grossBoxOffice * deal.percentage;
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: payout + bonusResult.totalApplied,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        {
          label: `Artist share (${(deal.percentage * 100).toFixed(0)}%)`,
          value: payout,
          note: "Percentage of gross. No expense deductions.",
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `gross * ${deal.percentage} + bonuses = ${(
            payout + bonusResult.totalApplied
          ).toFixed(2)}`
        : `gross * ${deal.percentage} = ${payout.toFixed(2)}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
      interpretation,
    };
  }

  if (deal.dealType === "percentage_of_net") {
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Percentage-of-net deal is missing a percentage.",
        dealType: deal.dealType,
        interpretation,
      };
    }

    const settlementBase = Math.max(0, netBoxOffice - totalExpenses);
    const payout = settlementBase * deal.percentage;
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: payout + bonusResult.totalApplied,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        {
          label: "Less ticketing fees",
          value: -totalFees,
          note: "Net deals deduct ticketing fees before applying the split.",
        },
        expenseStep(expenseTotals),
        {
          label: "Net settlement base",
          value: settlementBase,
          note: "Gross minus fees and capped pass-through expenses.",
        },
        {
          label: `Artist share (${(deal.percentage * 100).toFixed(0)}%)`,
          value: payout,
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: `(${grossBoxOffice.toFixed(2)} - ${totalFees.toFixed(
        2,
      )} - ${totalExpenses.toFixed(2)}) * ${deal.percentage} = ${payout.toFixed(
        2,
      )}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
      interpretation,
    };
  }

  if (deal.dealType === "vs") {
    if (deal.guaranteeAmount == null || deal.percentage == null) {
      return {
        supported: false,
        reason: "Vs deal is missing a guarantee amount or percentage.",
        dealType: deal.dealType,
        interpretation,
      };
    }

    const settlementBase =
      deal.percentageBasis === "gross"
        ? grossBoxOffice
        : Math.max(0, netBoxOffice - totalExpenses);
    const percentagePayout = settlementBase * deal.percentage;
    const guarantee = deal.guaranteeAmount;
    const basePayout = Math.max(guarantee, percentagePayout);
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });
    const percentageSideWon = percentagePayout >= guarantee;
    const appliedBonuses = percentageSideWon ? bonusResult.applied : [];
    const totalAppliedBonuses = appliedBonuses.reduce((s, b) => s + b.amount, 0);

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: basePayout + totalAppliedBonuses,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        {
          label: "Less ticketing fees",
          value: -totalFees,
          note:
            deal.percentageBasis === "gross"
              ? "Shown for transparency. This deal's split is based on gross."
              : "Net deals deduct ticketing fees before applying the split.",
        },
        ...(deal.percentageBasis === "gross" ? [] : [expenseStep(expenseTotals)]),
        {
          label:
            deal.percentageBasis === "gross"
              ? "Gross settlement base"
              : "Net settlement base",
          value: settlementBase,
          note:
            deal.percentageBasis === "gross"
              ? "Percentage is applied to gross based on the interpreted deal language."
              : "Gross minus fees and capped pass-through expenses.",
        },
        {
          label: `Artist share (${(deal.percentage * 100).toFixed(0)}%)`,
          value: percentagePayout,
        },
        {
          label: "Guarantee comparison",
          value: guarantee,
          note: percentageSideWon
            ? "Percentage payout beats the guarantee."
            : "Guarantee beats the percentage payout.",
        },
        ...appliedBonuses.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula:
        `max(${guarantee.toFixed(2)}, ${settlementBase.toFixed(2)} * ${
          deal.percentage
        })` +
        (totalAppliedBonuses ? ` + bonuses ${totalAppliedBonuses.toFixed(2)}` : "") +
        ` = ${(basePayout + totalAppliedBonuses).toFixed(2)}`,
      bonusesApplied: appliedBonuses,
      bonusesNotTriggered: [
        ...bonusResult.notTriggered,
        ...(percentageSideWon
          ? []
          : bonusResult.applied.map((b) => ({
              ...b,
              reason:
                "Bonus would trigger on gross, but the guarantee side won this Vs calculation.",
            }))),
      ],
      interpretation,
    };
  }

  if (deal.dealType === "door") {
    const payout = Math.max(0, grossBoxOffice - totalExpenses);

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: payout,
      steps: [
        { label: "Gross door revenue", value: grossBoxOffice },
        expenseStep(expenseTotals),
        {
          label: "Artist receives door after expenses",
          value: payout,
          note: "Simple door deal interpreted as ticket revenue minus capped expenses.",
        },
      ],
      finalFormula: `${grossBoxOffice.toFixed(2)} - ${totalExpenses.toFixed(
        2,
      )} = ${payout.toFixed(2)}`,
      bonusesApplied: [],
      bonusesNotTriggered: [],
      interpretation,
    };
  }

  return {
    supported: false,
    dealType: deal.dealType,
    reason: "This deal type is not supported by the in-app settlement tool yet.",
    interpretation,
  };
}

function calculateExpenseTotals(expenses: Expense[], deal: Deal): ExpenseTotals {
  const passThrough = expenses.filter((e) => !e.absorbedByVenue);
  const rawPassThrough = passThrough.reduce((sum, e) => sum + e.amount, 0);
  const absorbed = expenses
    .filter((e) => e.absorbedByVenue)
    .reduce((sum, e) => sum + e.amount, 0);
  const hospitalityRaw = passThrough
    .filter((e) => e.category === "hospitality")
    .reduce((sum, e) => sum + e.amount, 0);
  const nonHospitality = passThrough
    .filter((e) => e.category !== "hospitality")
    .reduce((sum, e) => sum + e.amount, 0);
  const hospitalityApplied =
    deal.hospitalityCap == null
      ? hospitalityRaw
      : Math.min(hospitalityRaw, deal.hospitalityCap);
  const beforeOverallCap = nonHospitality + hospitalityApplied;
  const applied =
    deal.expenseCap == null
      ? beforeOverallCap
      : Math.min(beforeOverallCap, deal.expenseCap);

  return {
    rawPassThrough,
    hospitalityRaw,
    hospitalityApplied,
    beforeOverallCap,
    applied,
    absorbed,
    cappedByHospitality: hospitalityApplied < hospitalityRaw,
    cappedByOverall: applied < beforeOverallCap,
  };
}

function expenseStep(expenses: ExpenseTotals): SettlementStep {
  const notes = [
    expenses.cappedByHospitality
      ? `Hospitality capped from ${expenses.hospitalityRaw.toFixed(2)} to ${expenses.hospitalityApplied.toFixed(2)}.`
      : null,
    expenses.cappedByOverall
      ? `Overall expense cap reduced pass-through expenses from ${expenses.beforeOverallCap.toFixed(2)} to ${expenses.applied.toFixed(2)}.`
      : null,
    expenses.absorbed > 0
      ? `${expenses.absorbed.toFixed(2)} absorbed by venue and not deducted.`
      : null,
  ].filter(Boolean);

  return {
    label: "Less capped expenses",
    value: -expenses.applied,
    note: notes.length
      ? notes.join(" ")
      : "Approved pass-through expenses applied to the settlement.",
  };
}

export function interpretDeal(deal: Deal): DealInterpretation {
  const notes = deal.dealNotesFreetext ?? "";
  const lower = notes.toLowerCase();
  const noteGuarantee = extractMoneyNear(lower, [
    "guarantee",
    "g'tee",
    "gtee",
  ]);
  const notePercentage = extractPercentage(lower);
  const noteExpenseCap = extractMoneyNear(lower, ["expense cap", "expenses capped", "expenses to"]);
  const noteHospitalityCap = extractMoneyNear(lower, ["hospitality", "hosp"]);
  const basis =
    lower.includes("gross") && !lower.includes("net")
      ? "gross"
      : lower.includes("door")
        ? "door"
        : lower.includes("net")
          ? "net"
          : deal.percentageBasis;

  const interpretedType = (() => {
    if (lower.includes("door")) return "door";
    if (lower.includes(" vs ") || lower.includes(" guarantee vs") || lower.includes("g'tee vs")) {
      return "vs";
    }
    if (lower.includes("net")) return "percentage_of_net";
    return deal.dealType;
  })() as SupportedDealType;

  const terms: InterpretedDealTerm[] = [
    {
      label: "Deal type",
      value: labelDealType(interpretedType),
      source: inferredFromNotes(interpretedType, deal.dealType, notes),
      confidence: interpretedType === deal.dealType ? "high" : "needs_review",
    },
  ];

  if (deal.guaranteeAmount != null || noteGuarantee != null) {
    terms.push({
      label: "Guarantee",
      value: moneyValue(noteGuarantee ?? deal.guaranteeAmount),
      source: noteGuarantee != null ? "Deal notes" : "Structured field",
      confidence: compareNullableNumbers(noteGuarantee, deal.guaranteeAmount),
    });
  }

  if (deal.percentage != null || notePercentage != null) {
    terms.push({
      label: "Artist percentage",
      value: percentageValue(notePercentage ?? deal.percentage),
      source: notePercentage != null ? "Deal notes" : "Structured field",
      confidence: compareNullableNumbers(notePercentage, deal.percentage),
    });
  }

  if (basis) {
    terms.push({
      label: "Percentage basis",
      value: basis,
      source: lower.includes(basis) ? "Deal notes" : "Structured field",
      confidence: basis === deal.percentageBasis || basis === "door" ? "high" : "medium",
    });
  }

  if (deal.expenseCap != null || noteExpenseCap != null) {
    terms.push({
      label: "Expense cap",
      value: moneyValue(noteExpenseCap ?? deal.expenseCap),
      source: noteExpenseCap != null ? "Deal notes" : "Structured field",
      confidence: compareNullableNumbers(noteExpenseCap, deal.expenseCap),
    });
  }

  if (deal.hospitalityCap != null || noteHospitalityCap != null) {
    terms.push({
      label: "Hospitality cap",
      value: moneyValue(noteHospitalityCap ?? deal.hospitalityCap),
      source: noteHospitalityCap != null ? "Deal notes" : "Structured field",
      confidence: compareNullableNumbers(noteHospitalityCap, deal.hospitalityCap),
    });
  }

  const warnings = interpretationWarnings(deal, notes, interpretedType);

  return {
    dealType: interpretedType,
    summary: summarizeInterpretation(interpretedType, terms, warnings),
    terms,
    warnings,
  };
}

function interpretationWarnings(
  deal: Deal,
  notes: string,
  interpretedType: SupportedDealType,
): DealInterpretation["warnings"] {
  const lower = notes.toLowerCase();
  const warnings: DealInterpretation["warnings"] = [];

  if (interpretedType !== deal.dealType) {
    warnings.push({
      label: "Structured deal mismatch",
      detail: `Deal notes look like ${labelDealType(interpretedType)}, but the stored deal type is ${labelDealType(deal.dealType)}.`,
      severity: "high",
    });
  }

  if (lower.includes("walkout")) {
    warnings.push({
      label: "Walkout pot needs review",
      detail:
        "This prototype flags walkout language instead of trying to calculate it automatically.",
      severity: "high",
    });
  }

  if (lower.includes("ratchet") || lower.includes("tier")) {
    warnings.push({
      label: "Tiered split needs review",
      detail:
        "Tier ratchets can change the artist percentage by sales level. Review before using this payout.",
      severity: "high",
    });
  }

  if (lower.includes("recoup")) {
    warnings.push({
      label: "Recoup language detected",
      detail:
        "The notes mention recoup language. Confirm whether it is inside the expense cap, outside the cap, or only informational.",
      severity: "medium",
    });
  }

  return warnings;
}

function summarizeInterpretation(
  dealType: SupportedDealType,
  terms: InterpretedDealTerm[],
  warnings: DealInterpretation["warnings"],
) {
  const guarantee = terms.find((t) => t.label === "Guarantee")?.value;
  const percentage = terms.find((t) => t.label === "Artist percentage")?.value;
  const basis = terms.find((t) => t.label === "Percentage basis")?.value;
  const cap = terms.find((t) => t.label === "Expense cap")?.value;

  if (dealType === "vs") {
    return `Interpreted as ${guarantee ?? "a guarantee"} vs ${percentage ?? "a percentage"} of ${basis ?? "net"}, whichever is greater${cap ? `, with expenses capped at ${cap}` : ""}.`;
  }
  if (dealType === "percentage_of_net") {
    return `Interpreted as ${percentage ?? "a percentage"} of net after fees and expenses${cap ? `, with expenses capped at ${cap}` : ""}.`;
  }
  if (dealType === "door") {
    return `Interpreted as a simple door deal: ticket revenue minus capped expenses.`;
  }
  if (warnings.length > 0) {
    return `Interpreted as ${labelDealType(dealType)} with ${warnings.length} item${warnings.length === 1 ? "" : "s"} needing review.`;
  }
  return `Interpreted as ${labelDealType(dealType)}.`;
}

function extractPercentage(text: string) {
  const match = text.match(/(\d{2,3})\s*%/);
  if (!match) return null;
  return Number(match[1]) / 100;
}

function extractMoneyNear(text: string, anchors: string[]) {
  for (const anchor of anchors) {
    const index = text.indexOf(anchor);
    if (index === -1) continue;
    const after = text.slice(index, index + 80);
    const afterMatch = after.match(/\$?(\d{1,3}(?:,\d{3})+|\d{3,5})/);
    if (afterMatch) return Number(afterMatch[1].replace(/,/g, ""));

    const before = text.slice(Math.max(0, index - 40), index);
    const beforeMatches = [
      ...before.matchAll(/\$?(\d{1,3}(?:,\d{3})+|\d{3,5})/g),
    ];
    const beforeMatch = beforeMatches[beforeMatches.length - 1]?.[1];
    if (beforeMatch) return Number(beforeMatch.replace(/,/g, ""));
  }
  return null;
}

function compareNullableNumbers(
  noteValue: number | null,
  structuredValue: number | null,
): Confidence {
  if (noteValue == null || structuredValue == null) return "medium";
  return Math.abs(noteValue - structuredValue) < 0.001 ? "high" : "needs_review";
}

function inferredFromNotes(
  interpretedType: SupportedDealType,
  structuredType: Deal["dealType"],
  notes: string,
): InterpretedDealTerm["source"] {
  if (!notes.trim()) return "Structured field";
  return interpretedType === structuredType ? "Deal notes" : "System inference";
}

function labelDealType(type: string) {
  const labels: Record<string, string> = {
    flat: "Flat guarantee",
    percentage_of_gross: "Percentage of gross",
    percentage_of_net: "Percentage of net",
    vs: "Vs deal",
    door: "Door deal",
  };
  return labels[type] ?? type;
}

function moneyValue(value: number | null | undefined) {
  return value == null ? "Not found" : `$${value.toLocaleString()}`;
}

function percentageValue(value: number | null | undefined) {
  return value == null ? "Not found" : `${(value * 100).toFixed(0)}%`;
}

/** Evaluate a list of bonuses against the show's actual numbers. */
function applyBonuses(
  bonuses: Bonus[],
  ctx: { gross: number; tickets: number; capacity?: number },
) {
  const applied: { label: string; amount: number; reason: string }[] = [];
  const notTriggered: { label: string; amount: number; reason: string }[] = [];

  for (const b of bonuses) {
    if (b.type === "gross_threshold") {
      if (ctx.gross >= b.threshold) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `Gross ${ctx.gross.toLocaleString()} >= ${b.threshold.toLocaleString()}`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason: `Gross ${ctx.gross.toLocaleString()} < ${b.threshold.toLocaleString()}`,
        });
      }
    } else if (b.type === "sellout") {
      if (ctx.capacity != null && ctx.tickets >= ctx.capacity * 0.95) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} of ${ctx.capacity} sold`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason:
            ctx.capacity != null
              ? `${ctx.tickets} of ${ctx.capacity} sold (sellout = >=95%)`
              : "Capacity unknown; cannot evaluate",
        });
      }
    } else if (b.type === "attendance_threshold") {
      if (ctx.tickets >= b.threshold) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} >= ${b.threshold}`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} < ${b.threshold}`,
        });
      }
    } else if (b.type === "tier_ratchet") {
      notTriggered.push({
        label: b.label,
        amount: 0,
        reason: "Tier ratchets need human review in this prototype.",
      });
    }
  }

  return {
    applied,
    notTriggered,
    totalApplied: applied.reduce((s, b) => s + b.amount, 0),
  };
}
