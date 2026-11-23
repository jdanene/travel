# Quantitative displays

Read only for data, tables, charts, metrics, or dashboards. Start with the user's
question from the HCI entry point. A table of settings labels alone does not
make a screen a dashboard. Source references below use Few's supplied PDF index.

## Define the decision and its evidence

**Source basis:** Few, §1.3.1, PDF 26–27, defines a dashboard as a compact
monitoring view of information needed for objectives. §2.1.1, PDF 31–32,
distinguishes strategic, analytical, and operational uses. §3.2–3.4, PDF 43–46,
connects meaningful measures to context and appropriate precision.

**Application:** Determine whether the person needs to notice an exception,
compare alternatives, inspect a particular value, or understand change. Identify
the measure, unit, entity, population, time period, source, and comparison that
answer that question. Keep essential context beside the value. Put longer
methodology in accessible detail.

A number without a comparator may be enough for lookup. A performance judgment
usually needs a target, prior period, peer, or other defensible reference. State
why that reference fits. Do not invent thresholds or portray a default as a
measured norm. Round for the decision without erasing meaningful differences;
provide exact values when the task needs them.

## Choose the display by the question

**Source basis:** §6.1, PDF 102–106, contrasts precise lookup with seeing the
shape of data. §6.2.1 supplies the chart-specific discussion below.

| Question | Starting choice | Inspect | Source |
|---|---|---|---|
| What is this exact value or record? | Text or aligned table | Clear headers, units, precision, sort, missing values | PDF 102–106 |
| Which categories are larger? | Bars; a dot display when position suffices | Common scale; meaningful order; legible category labels | PDF 110–115 |
| How does a measure compare with a target? | Value + comparator; bullet graph if visual comparison helps | Defined target, labeled scale and range meaning | PDF 107–111 |
| How has the measure changed through time? | Line | Time spacing, gaps, axes, comparable observations | PDF 114–115, 120 |
| What is the recent shape beside a current value? | Sparkline + value and period | Trend context remains legible; exact lookup has another route | PDF 120–121 |
| How do several wholes and their parts differ? | Stacked bars when totals dominate | Floating segments are hard to compare; use separate aligned views if parts matter | PDF 116–118 |
| How are values distributed? | Range/median or box plot suited to the audience | Define marks; a median alone can conceal spread | PDF 121–126 |
| Do two quantitative variables vary together? | Scatter plot | Paired observations, units, outliers; association is not causation | PDF 126–127 |

The table is a synthesis of starting choices, not a mandate to replace existing
charts. A dot display follows Few's symbol-marker example; it is not attributed
as a complete dot-plot taxonomy. A map earns its place when spatial location is
the question. A ranked list can better answer a non-spatial comparison; the
geographic choice is our application, not an extracted Few chapter.

Use a zero baseline when bar length represents magnitude. For a restricted
range, consider position markers instead of truncated bars (PDF 110–111).
A line need not start at zero, but disclose its scale and avoid changes that
exaggerate a small movement (PDF 120; the latter is our review guidance).
Do not connect unrelated categories merely to create a line.

Few favors bars over pie charts for comparison (PDF 115–116). Apply the reason:
people must compare the values accurately. Do not add variety, decorative 3-D,
or gauges merely to make a view look like a dashboard. An isolated number may
need only text.

## Make comparisons honest

**Source basis:** §7.1.4–7.2, PDF 141–143, covers adjacent related measures,
meaningful comparison, and consistent encodings. §4.2, PDF 67–74, distinguishes
visual attributes used for quantity, grouping, and emphasis.

**Application:** Put related values together and align scales where comparison
is intended. Keep units, periods, denominators, filters, and aggregation visible
or readily inspectable. Use consistent encodings for the same meaning. Do not
reuse a status color for an unrelated category in a way that implies equivalence.

When a comparison is invalid, explain the changed scope instead of presenting
a confident delta. Show both values separately if each remains meaningful.
Distinguish percent change from percentage-point change. Avoid visually aligning
unrelated measures as if their heights or positions were comparable.

Few demonstrates dual-axis charts (PDF 118–119, 141). This guide's default is
separate aligned views or an explicit common basis when two units could invite
false comparison. That is a cautious application choice, not Few's prohibition.

## Missing data and uncertainty

**Application synthesis:** The following expands the books' context and feedback
principles. It is not a statistical method prescribed by Few.

- Separate measured zero, no records, not collected, failed collection, partial
  coverage, and not applicable. A blank cell or zero must not collapse them.
- Label observed, estimated, projected, and simulated values. State the basis
  for an estimate or range. An evidence-coverage percentage is not automatically
  a confidence level or probability of truth.
- Explain interval meaning: observed spread, possible bounds, forecast, or
  statistical uncertainty. Do not draw a confidence band without a model.
- Show stale or partial coverage with collection time and the part affected.
  Preserve useful results while explaining which comparisons remain valid.
- Preserve meaningful time gaps. Do not silently interpolate failed measurements
  or draw future outcomes beyond observed data.
- Mark interventions as dated events without claiming that later movement proves
  their effect. Outcomes require the product's measurement rules.

For tables, keep text labels for unknown states; preserve numeric sorting of
measured values without treating unknowns as zero. For charts, use gaps,
annotations, or separately distinguished estimates, with an accessible text
explanation. The exact rendering depends on the existing component and task.

## First glance and detail

**Source basis:** Few, §7.1, PDF 139–143, organizes by use, co-locates related data,
and reduces distracting separators. §7.3–7.5, PDF 143–146, addresses legibility,
detail access, and observing users. §5.2.2, PDF 94–95, warns that excessive
exception-only summaries can conceal the basic picture.

**Application:** Make the important comparison or exception visible first.
Maintain enough context to understand normal conditions too. Group by the user's
question, then provide detail with a clear return path. Keep column headings and
row identity useful during scanning; align numeric values consistently. Retain
labels, units, boundaries, and controls needed for comprehension or accessibility.

Few's single-screen requirement applies to his dashboard definition. For modern
responsive interfaces, retain a coherent overview at the intended size without
shrinking text or hiding essential evidence. Details can scroll or open elsewhere.
This adaptation is synthesis. His hover/drill-down examples also require keyboard
and touch equivalents today. Follow [accessible presentation](ui-patterns.md#accessible-color-type-and-controls).
