# Apply the guides to Mappack

This file connects reusable HCI guidance to repository evidence. It does not
change product behavior. Read the applicable portions of the canonical
[spec](../../../SPEC.md), [UI rationale](../../../UI_RATIONALE.md), and
[design index](../../../README.md), then inspect the actual component requested.
The index names `design/v1/prototype/` as the reference; a numerically newer folder
alone does not supersede that designation. Prototype conventions live in
[v0/prototype/CLAUDE.md](../../../v0/prototype/CLAUDE.md).

Preserve the Mappack visual system. Reuse its current component and tokens; do
not import the sibling DrPlumbing site's Organic system, colors, or type. A
source book informs a choice; it does not override the product's authority,
scope, states, measurement definitions, or established visual patterns.

## Generic screen: task detail

**Example request:** “Make the action detail easier to understand.”

Start with HCI: the owner needs to understand and decide on proposed work.
Read [interaction](interaction.md), the disclosure/form sections of
[UI patterns](ui-patterns.md), and [review](review-and-delivery.md). Read Few
only if the requested work extends to the quantitative Results or Tracking view.
A lifecycle status is not itself a quantitative dashboard.

Existing product anchors:

- Spec §12–13: one natural task description leads; details expand. Approval,
  execution, verified publication, and outcome review are distinct events.
- [growth-map-actions.js](../../../v1/prototype/growth-map-actions.js) contains
  the action view; [growth-map-workflow.js](../../../v1/prototype/growth-map-workflow.js)
  contains linked-step behavior. Inspect those files for a concrete task review.
- Spec §14 and [growth-map-company.js](../../../v1/prototype/growth-map-company.js)
  provide a separate read-only dialog precedent with source-labeled facts.

A useful review preserves the concise task, status, owner, and next decision.
It checks whether a control implies execution when it only approves work, and
whether a failed save preserves the person's understanding and input. It does
not replace the table with cards or expose all internal fields for completeness.

**Source inspection performed for this guide:** the company renderer names its
heading `companyTitle`, labels its close control, explains “Not checked,” and
separates simulated measurements in a disclosure. These support the existing
patterns of named content, explicit unknowns, and optional detail. The spec
records keyboard containment and focus return. No browser check was performed
here, so runtime focus behavior and visual readability remain unverified.

## Dashboard: visibility and comparison

**Example request:** “Make city visibility and its change easier to compare.”

Start with HCI: identify the city/service decision and the evidence needed.
Then read [quantitative displays](quantitative-displays.md); use the relevant
filter/navigation and accessibility sections of [UI patterns](ui-patterns.md).

Existing product anchors:

- Spec P3–P4, §4.2, §15–16: unknown is not zero; comparable evidence precedes
  freshness. Missing-factor bounds and evidence coverage have defined meanings.
- Spec §5 and the UI rationale's chart discussion: the Targets and Actions views
  connect current values with trends and context. Existing map/chart rendering
  lives in [growth-map-app.js](../../../v1/prototype/growth-map-app.js).
- Saved dated-scan inspection is deferred in §15. Do not make it a new available
  control while writing a review. Fixture data does not establish live collection.

A useful recommendation preserves the comparison scope, denominator, dates,
source, and unknown states. Choose a table for precise lookup and a line for
comparable change through time. Distinguish measured change from causal claims.
Do not convert the product's possible score bounds into statistical confidence
intervals or invent benchmarks to fill empty states.

**Evidence limit:** this is a documented application example, not a chart audit
or screen redesign. Read and check the actual chart for a real review. No app,
mockup, fixture, or business data changed as part of creating this skill.

## Why one entry point

Two structures were considered. Three independent book skills would be easy to
name but would make the caller reconcile overlapping rules and risk applying
Few's dashboard constraints to every screen. One large combined manual would
also load unnecessary material on each task.

The chosen structure keeps one short HCI decision order and separate guides for
interaction, UI patterns, quantitative displays, review, and source consultation.
It follows the local logo-design package's `SKILL.md`, `agents/openai.yaml`, and
`references/` convention. The books remain in their original ignored location;
only original prose and agent metadata belong to this package.
