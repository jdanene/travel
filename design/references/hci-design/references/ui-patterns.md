# UI patterns and presentation

Use after the goal and interaction are clear. These are conditional choices,
not a new visual system. References use the supplied MacDonald PDF index.

## Choose a pattern by problem and context

**Source basis:** Chapter 1, PDF 19–25, distinguishes a pattern's purpose and
behavior from the component or visual style that implements it. The defining
parts are a named solution, a user problem, and a context for use.

**Application:** Locate the current component or closest product precedent.
Write why it fits this task, then compare a different approach when the choice
has meaningful consequences. Keep existing labels, state behavior, and tokens
unless evidence supports changing them.

| User need | Candidate | Condition that changes the choice | Source |
|---|---|---|---|
| Read optional evidence without losing the task | Inline disclosure | Essential consequence or prerequisite must stay visible | Ch. 2, PDF 83–84 |
| Complete a dependent sequence | Staged flow with back/progress | Independent fields or frequent cross-checking may need one form | Ch. 2, PDF 84–88 |
| Enter accurate information | Labels, constraints, inline validation | Preserve input; warnings and blocking errors have different effects | Ch. 2, PDF 61–65 |
| Start without an empty, unexplained surface | Explained first action or safe defaults | Consequential guesses should require a deliberate choice | Ch. 2, PDF 77–79 |
| Narrow a large collection | Filters with selected state and result feedback | A short set may need only clear navigation | Ch. 3, PDF 109–119 |
| Find, compare, or return to a record | Pagination or a bounded list | Continuous consumption may justify infinite scroll | Ch. 3, PDF 127–133 |
| Handle a short contextual decision | Dialog | Long content, nested dialogs, or sustained navigation favor a page/inline view | Ch. 5, PDF 210–214 |
| Move between content within one scope | Tabs | Show which query/context owns the tabs; avoid hidden scope surprises | Ch. 6, PDF 237–241 |

These are synthesis choices. For example, the book's discussion of bad modal
use does not make every dialog an error. Use the actual task and constraints.

## Navigation and disclosure

Show where the person is and which object or scope is selected. Give primary
destinations a discoverable place. If space requires a menu, use a meaningful
label, current-location cue, and order. Do not bury frequent actions solely to
make the screen sparse. MacDonald's “Hamburger basement,” PDF 194–199, explains
the discoverability and context costs; it is not a universal ban on menus.

Keep disclosure triggers descriptive: “Evidence” names content; “More” often
does not. Optional depth differs from a required next step. Do not hide error
recovery, approval consequences, or the information needed to choose correctly.
A tooltip is supplemental help, not the only label or route to critical content.

For filters, expose current selections and clarify combination behavior when
it is ambiguous. Immediate results fit cheap, responsive filtering; an explicit
Apply step can fit costly or interdependent choices. Preserve useful context
when navigating back. MacDonald, PDF 113–119, supports filter feedback and
recovery; restoring product-specific state is our implementation synthesis.

## First-glance hierarchy

**Source basis:** MacDonald, PDF 126–127, covers task-oriented microcopy; PDF
237–240 shows how hierarchy communicates scope. Norman's behavioral discussion
in [interaction.md](interaction.md) supplies the reason to prioritize use.

**Application:** Lead with what this screen is for. Keep the main action,
current state, and essential scope easy to find. Group related content by
alignment, space, and headings. Make secondary evidence available without
letting it compete with the decision. Use visual weight to express actual
importance, not to advertise every available feature.

Read headings, labels, and buttons without the body text. Does that sequence
still communicate the task? Then read the main action with its nearby state.
Can the person predict the consequence? These are inspection questions, not
timed comprehension results. Only observed participants can establish those.

## Accessible color, type, and controls

**Book basis:** MacDonald, PDF 128–132, addresses accessible navigation and
loaded content; PDF 176–180 connects icon names, color contrast, typography,
font stacks, and copy to the design system. The book's introduction, PDF 8,
explicitly limits its coverage of visual design. It is not a full typography
manual or a current accessibility standard.

**Application:** Reuse the product's type scale, spacing, and semantic color
roles. Differentiate headings through hierarchy rather than arbitrary font
changes. Keep labels and data readable at the intended size and after zoom.
Do not shrink essential content to force a one-screen layout. Check longer
labels, number formatting, fallback fonts, and narrow layouts where supported.

Pair status colors with words or other distinguishing cues. Check actual text,
background, focus, and control combinations in every supported theme and state.
Low contrast is not an appropriate way to subordinate necessary information.
Use semantic headings, labels, buttons, links, and tables; keep DOM order aligned
with reading order. Avoid hover-only information or pointer-only controls.

**Contemporary supplement, verified October 14, 2026:** Use
[WCAG 2.2](https://www.w3.org/TR/WCAG22/) as the explicit reference for applicable
checks, not as a claim that the books establish conformance:

- Color and contrast: 1.4.1, 1.4.3, 1.4.11.
- Resize, reflow, spacing, hover/focus content: 1.4.4, 1.4.10, 1.4.12, 1.4.13.
- Keyboard, focus, and dragging alternatives: 2.1.1, 2.4.7, 2.4.11, 2.5.7.
- Errors, control semantics, and status messages: 3.3.1, 4.1.2, 4.1.3.

Consult each criterion's definitions and exceptions before applying thresholds.
For dialogs, use the [WAI-ARIA APG dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
for naming, focus entry/containment, dismissal, and return. APG is implementation
guidance. Checking this subset or inspecting source does not establish WCAG
conformance; state the actual checks performed.
