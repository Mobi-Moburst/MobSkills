---
name: verify-plan
description: Use after producing any implementation plan and before writing code, to rigorously self-review it — ground every assumption against the real code, argue against the plan adversarially, and score confidence by weakest dimension. Triggers on "verify the plan", "check this plan", "how confident are you".
targets: [claude, codex]
version: 1.0.0
visibility: internal
tags: [planning, review, quality]
owner: bi-data@moburst.com
---

# Plan Verification & Confidence Check

You have just produced a plan. Before proceeding with implementation, perform a
rigorous self-review by following every step below. Do NOT skip any step.

The core principle: **ground first, score last.** A confidence number means
nothing if it sits on top of unverified assumptions. Read the code before you
rate the plan — not only when the rating comes out low.

## Step 1: Restate the Original Request

Restate the original ask in your own words in one concise paragraph, so you
haven't drifted from the actual problem.

## Step 2: Ground Every Load-Bearing Assumption (BEFORE scoring)

List every assumption the plan depends on — about the codebase, environment, data
shapes, APIs, existing behavior, or libraries. For each one:

- If you have **verified** it, cite the evidence: a `file:line` you read, a
  command you ran, or the doc you checked.
- If you have **not** verified it, mark it `UNVERIFIED` and treat it as a risk in
  Step 4 — not as a fact.

Rule: **an assumption with no citation is a risk, not a fact.** Either go read the
file now, or carry it forward as an explicit unknown.

## Step 3: Verify Plan–Problem Alignment

For each step: does it directly address the request? Are there aspects of the
request that no step covers (gaps)? Does the plan add scope or complexity beyond
what was asked?

## Step 4: Argue Against Your Own Plan (adversarial)

Switch sides — make the plan look *wrong*, not right.

- State the **3 most likely ways this plan fails** (wrong assumption, missed edge
  case, broken existing behavior, simpler approach overlooked, misread request).
- For each: how would you know if it's real? If you can check it now, check it.
- Could this break existing functionality? Who calls the code you're changing?
- **Falsification check:** what single piece of evidence would prove the plan
  wrong — and have you looked for it?

## Step 5: Confidence Score

Rate each dimension 0–100%: **Correctness**, **Completeness**, **Robustness**,
**Best Practices**.

**Overall confidence = the LOWEST of the four (weakest-link), NOT the average.**
Each unverified assumption (Step 2) and unresolved risk (Step 4) must pull a
dimension down.

```
CONFIDENCE: XX%
```

## Step 6: Decision Gate

The gate is "**is every load-bearing claim verified, and have I named what I
couldn't verify?**" — not "is the number big enough?"

- **>= 90% AND zero UNVERIFIED items remain:** present the plan with the evidence
  citations and confidence breakdown, then proceed when the user confirms.
- **Otherwise — STOP.** Name the dimension that pulled confidence down, list the
  specific unknowns/risks/`UNVERIFIED` assumptions, then investigate immediately
  (read the code), re-ground (Step 2), re-argue (Step 4), and re-score. Repeat
  until verified — or, if something genuinely needs the user (product decision,
  missing access, ambiguous requirement), say so and ask. Do not inflate the
  number to escape the loop.

## Bottom Line

> Read the code before you rate the plan. Every assumption needs a `file:line`
> citation or it's a risk. Overall confidence = your weakest dimension, not the
> average. The gate is "is everything verified?" — not "is the number ≥ 90%?"
