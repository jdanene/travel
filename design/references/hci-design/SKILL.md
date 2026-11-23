---
name: hci-design
description: Design or review a screen or interaction from the user's goal, then choose UI patterns and visual hierarchy. Use for interface flows, navigation, feedback, forms, and usability reviews. Add quantitative display guidance only for data, tables, charts, or metrics; exclude logo-only and backend-only work.
---

# HCI design

Help a person understand the screen, take the intended action, and recognize
its result. Start with human–computer interaction (HCI): the goal, context,
controls, and feedback. Choose presentation after the interaction makes sense.

## Description

This is an original working synthesis of Norman's *Emotional Design*,
MacDonald's *Practical UI Patterns for Design Systems*, and, conditionally,
Few's *Information Dashboard Design*. It supports design and review; it does
not change product scope or authorize implementation or publication.

## Inputs

Use the request, current artifact or component, relevant product rules, and
known audience. Establish the person's goal, starting state, and observable
completion in a short sentence. Reuse known context. Mark unverified needs as
assumptions; ask only when a missing fact changes the decision.

## Output

Deliver the requested design or review with the chosen interaction, its reason,
and evidence from the artifact. State unresolved behavior or checks. A written
proposal is not a tested interface; a source review is not a usability study.

## Examples

- **Generic screen:** review a settings form → clarify what Save commits and
  how failure preserves input; consult interaction and UI patterns. No dashboard
  reading is needed just because the form belongs to an analytics app.
- **Dashboard:** review city visibility → establish the comparison decision,
  then consult quantitative displays for scope, denominator, dates, chart choice,
  and missing observations. Apply the same interaction guidance to filters.
- **No artifact:** propose a task detail view → give a provisional interaction
  and unresolved states. Do not claim a screen inspection or measured usability.

These are routing examples for a prose skill, not executable code examples.

## Always use this decision order

1. **Goal and context.** Identify what the person needs to understand or do,
   what they already know, and what the system can actually do.
2. **Interaction.** Make the current state, available action, consequence, and
   resulting feedback clear. Preserve a way to recover or return.
3. **First glance.** Put the task or decision first, relevant state and scope
   beside it, and supporting detail after it. Keep essential consequences visible.
4. **Presentation.** Reuse the product's patterns, labels, type, color, and
   spacing. Change a convention only to solve an observed problem. Compare a
   second interaction when the design decision is substantial.
5. **Evidence.** Follow the actual path, including failure, with the tools and
   checks allowed by the repository. Report what was checked and what was not.

## Read deeper only for the decision at hand

| Need | Read |
|---|---|
| Unclear task, controls, feedback, recovery, or emotional tone | [Interaction and understanding](references/interaction.md) |
| Choose navigation, disclosure, form, dialog, layout, color, or typography | [UI patterns and presentation](references/ui-patterns.md) |
| Design data, table, chart, metric, or dashboard content | [Quantitative displays](references/quantitative-displays.md) |
| Review a current mockup or component; prepare a handoff | [Review and delivery](references/review-and-delivery.md) |
| Verify attribution, examine original context, or identify the supplied edition | [Source guide](references/source-guide.md) |

The guides are specific subskills within one entry point. Load the relevant
sections, not all books. Few's dashboard-specific density and single-screen
advice does not govern ordinary screens. Even on a dashboard, preserve readable
text, accessible operation, and essential context before compactness.

For Mappack work, use the [local application guide](references/mappack.md).
Keep these reusable principles separate from the product's rules and artifacts.
