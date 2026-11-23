# Interaction and understanding

Use this guide when a person cannot tell what a screen means, what to do, or
whether an action worked. The decisions below are a synthesis, not a formal
framework quoted from a single book. Page references use the supplied PDF's
one-based page index; [source-guide.md](source-guide.md) identifies each file.

## Start with use

**Source basis:** Norman, chapter 3, PDF 82–91 / printed 69–78, puts function,
understanding, usability, and physical feel within behavioral design. He argues
for observing actual activities instead of assuming that feature lists express
people's needs. PDF 94–96 / printed 81–83 explains the limits of designing for
oneself and the value of early prototypes and observed use.

**Application:** State the task before choosing a component. For example,
“The owner decides whether to approve this proposed work” identifies a different
interaction from “The operator records work already completed.” Similar-looking
buttons can represent different authority, evidence, and consequences.

Trace the smallest complete path: entry → understanding → action → response →
completion or recovery. Include what the person needs before acting and what
must survive leaving the view. Do not turn the path into several boxes of
technical fields unless the task requires them.

Separate observed behavior, owner requirements, and design assumptions. If no
user observations exist, propose a reasoned design and name what observation
would challenge it. Do not invent a persona, usability result, or conversion lift.

## Make the system understandable

**Source basis:** Norman, PDF 88–90 / printed 75–77, explains how the product's
appearance, behavior, and feedback convey its conceptual model. His seat-control
example connects control position with consequence. This discussion appears in
*Emotional Design* itself; the supplied book is not *The Design of Everyday Things*.

**Application:** Ask what a reasonable person would predict from the interface:

- What object and scope will this action affect?
- Is this a draft, an approval, an execution, or a completed result?
- Which choices depend on earlier choices? What will be retained or reset?
- What evidence explains the state, and what remains unknown?

Use the person's terms consistently across navigation, controls, results, and
history. Explain an unfamiliar state beside the decision it changes. A help
page cannot repair a misleading action label.

## Affordances and signifiers

**Source basis:** MacDonald, chapter 3, “Triggers,” PDF 138–139, discusses visible
signifiers, conventions, and labels. PDF 140 treats action effort and nearby
feedback. These are the source for this guide's digital-control advice.

**Application:** An affordance is the action the interface permits; a signifier
is the cue that helps the person discover it. A button's label and treatment
should reveal the actual action. Distinguish navigation links, commands,
selections, and status. Label an unfamiliar icon. A colored badge should not
look interactive unless it is. Make a clickable chart mark discoverable and
provide a keyboard-accessible route to the same detail.

A drag interaction needs a reason, such as spatial arrangement. For a simple
choice, a button or select may require less precision. Preserve keyboard and
single-pointer alternatives where applicable; see the standards links in
[UI patterns](ui-patterns.md#accessible-color-type-and-controls).

## Feedback and state

**Source basis:** Norman, PDF 89–90 / printed 76–77, distinguishes acknowledgement
from useful information about what is happening and what remains. MacDonald,
“Validation feedback,” PDF 61–65, and “Feedback,” PDF 140, adds precise recovery
copy, preserving input, and keeping response close in place and time to action.

**Application:** Use the states the feature can actually distinguish:

| Situation | Communicate | Keep or offer |
|---|---|---|
| First use, no records yet | What belongs here and how to begin | One relevant first action; label any sample data |
| No filtered matches | Which scope or filters produced no matches | Clear or adjust filters; retain the query |
| Loading | What is being fetched or processed | Stable context; progress only when known |
| Submission pending | Request received; result still pending | Prevent accidental duplicate work; preserve input |
| Partial or stale result | Which part is missing or old, with its time | Available evidence and a relevant retry |
| Validation failure | Specific field and correction | Existing input and focus on a useful correction |
| Operational error | What failed and whether anything changed | Safe retry or next step; preserved work |
| Success | Confirmed result and scope | Next action, return path, or real undo |
| Outcome unknown | Confirmation is unavailable | A way to check status before repeating an external action |

This table is a contemporary synthesis. It is not a claim that either book
specifies this exact state machine. Do not label receipt as completion, replace
unknown data with zero, or offer undo when only a new compensating action exists.
A disabled control needs an understandable prerequisite, not just reduced opacity.

## First impression, use, and remembered experience

**Source basis:** Norman, chapter 3, PDF 78–83 / printed 65–70 and PDF 96–101 /
printed 83–88, distinguishes visceral, behavioral, and reflective responses.
The latter includes meaning, self-image, and longer-term experience. These are
perspectives on experience, not a numerical quality score.

**Application:** Make the screen inviting and coherent without implying
capabilities or certainty it lacks. A reassuring surface cannot compensate for
lost work, unexpected action, or concealed errors. An owner should leave knowing
what they changed and what remains to do. Use respectful failure copy; do not
blame or shame the person. Honor the established brand instead of prescribing
one universal emotional style.

For a substantial change, compare two real approaches against the same task.
For example, an inline disclosure preserves comparison context; a separate page
provides room for a longer workflow. Select by the information and interaction
needed, not by which mockup appears more elaborate.
