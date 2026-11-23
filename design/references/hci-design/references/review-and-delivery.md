# Review and delivery

Use this guide to evaluate the requested artifact or hand off a design.
These are working procedures synthesized from the books, not a validated score.
Norman, chapter 3, PDF 88–96, calls for understanding and observed use;
MacDonald, chapter 4, PDF 164–168 and 176–180, connects patterns to previews,
components, and documentation; Few, §7.5, PDF 146, calls for observing people
using populated dashboards.

## Review the artifact that exists

Identify its path or URL, version, target device, relevant state, and user's task.
Read its product rules and the existing component before proposing a replacement.
Distinguish implemented behavior, mockup intent, and a proposed change. A static
mockup cannot establish keyboard behavior, persistence, loading, or execution.
Source code alone cannot prove that layout and focus work in the browser.

Follow the repository's evidence rules. In Mappack, perform one final screen check
in text, with no screenshots or render-adjust loop. A documentation-only change
needs no screen render. Other projects may permit different inspection methods.
Do not manufacture evidence when browser access or an artifact is unavailable.

## Walk the task, not a style checklist

| Review question | Evidence to inspect |
|---|---|
| Can the person identify the purpose and current scope? | Title, selected object, dates or context, main action |
| Can they predict the action? | Control label, signifier, prerequisite, consequence |
| Can they tell what happened? | Pending, success, failure, and persistent state |
| Can they recover or return? | Preserved input, retry semantics, real undo, focus and selection |
| Does navigation match the task? | Entry path, current location, disclosures, return path |
| Does hierarchy aid comprehension? | Reading order, grouping, prominence, optional detail |
| Can they perceive and operate the interface? | Labels, contrast, zoom/reflow, keyboard, focus, non-color cues |
| If quantitative: is the conclusion supported? | Display choice, units, comparison basis, missingness, uncertainty |
| Does it remain coherent with the product? | Existing component, tokens, terminology, state conventions |

Inspect relevant empty, loading, error, partial, and completed states. Mark an
inapplicable state as such. Do not add fictitious states or generic new features
to satisfy the checklist. A presentational change does not authorize rewriting
the underlying workflow.

Use **supported**, **revise**, or **not checked**, with evidence. Separate a
source-derived principle from an observed defect. For each material finding,
name the location, user consequence, evidence, smallest useful correction, and
how that correction could be checked. Prioritize blocked tasks and misleading
conclusions ahead of optional refinement.

Avoid arbitrary usability totals or claims about trust, speed, and conversion.
A first-glance inspection can reveal competing headings; it cannot establish
how quickly a real person understands the screen. Where requested, plan a user
observation with a concrete task and outcome rather than inventing its result.

## Compare a second design when it matters

Compare genuinely different interactions against the same goal, content, and
constraints. For example, a persistent side panel preserves a table comparison;
a full page supports a longer review with more space. List the main tradeoff and
choose. Two palettes over the same flow do not constitute a second interaction.

Few's §7.5 favors presenting a single considered dashboard prototype. The repo's
engineering ethos still requires comparing a second design before selecting one.
These concern different decisions: internal exploration and external presentation.
Honor a user's explicit request for alternatives.

## Handoff

Lead with the outcome and why it helps the task. Link the changed artifact and
record meaningful changes, checks, and limitations. Cite the particular guide
or source passage when attribution matters; do not append the entire reading
library to every small review. Keep project-specific findings with the project.

For code, follow the repository's header and test requirements. This prose skill
adds no test suite, deployment, approval gate, or permission to send messages.
Retain prior artifacts and book sources. Do not ship copyrighted source pages,
PDFs, extracted text, or screenshots with a public deliverable.
