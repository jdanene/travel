# Sources, reading coverage, and original consultation

This package contains original synthesis and agent metadata. It contains no
books, copied figures, page images, or extracted book text. The supplied books
remain local and ignored by Git. Ordinary use needs only the short skill and
relevant guide. Consult the original when an attribution, illustration, subtle
tradeoff, or disputed recommendation needs its surrounding argument.

## Identify the supplied books

The source location used for this work was the primary checkout's
`design/references/` directory. In the October 2026 workspace its absolute path
is `/Users/jideanene/claude/Projects/Plumbing/mappack/design/references/`.
An isolated worktree or fresh clone does not carry these ignored files. The
location is a local locator, not a portable download or a publishing dependency.
If a source is absent, retain the guide's stated limits and ask for an authorized
copy only if original consultation is needed for the task.

| Short name | Bibliographic identity verified inside the file | Local filename | PDF pages |
|---|---|---|---|
| Norman | Donald A. Norman, *Emotional Design: Why We Love (or Hate) Everyday Things*. Basic Books; copyright 2004, paperback edition 2005. ISBN 0-465-05136-7. | `Norman, Donald A - Emotional design why we love (or hate) everyday things (2005, Basic Books) - libgen.li.pdf` | 271 |
| Few | Stephen Few, *Information Dashboard Design: The Effective Visual Communication of Data*. O'Reilly; January 2006, first edition. ISBN 0-596-10016-7. | ` Stephen Few - Information Dashboard Design_ The Effective Visual Communication of Data (2006, O'Reilly Media) - libgen.li.pdf` (leading space) | 166 |
| MacDonald | Diana MacDonald, *Practical UI Patterns for Design Systems: Fast-Track Interaction Design for a Seamless User Experience*. Apress, 2019. e-ISBN 978-1-4842-4938-3; DOI 10.1007/978-1-4842-4938-3. | `Practical UI Patterns for Design Systems.pdf` | 281 |

The “Norman” source is **Emotional Design**, not *The Design of Everyday Things*.
Chapter 3 explicitly revisits conceptual models and feedback, which this guide
cites directly. No complete account of the latter book was read or inferred.
The local UI/UX source is MacDonald's pattern book, not an unidentified generic
UI manual. An EPUB of it exists in the sibling DrPlumbing references folder;
this package's page references refer to the Mappack PDF, not that EPUB.

## Page conventions and file identity

**PDF page** always means the one-based page index in the supplied file,
including cover and front matter. Use the viewer's page-index navigation,
not a printed-page search.

- Norman's cited chapter 3 pages show their original printed numbers. In that
  chapter PDF 88 = printed 75; the cited pages have a +13 offset.
- Few's file is repaginated, includes an added “Sommario,” and runs to 166 PDF
  pages. Its contents refer to this pagination. Do not substitute original
  print-edition page numbers or assume an offset.
- MacDonald's file is a converted layout with sequential page numbers and no
  verified original print pagination. Cite PDF page plus chapter/section. Do not
  label its displayed page number as the original printed edition's page.

SHA-256 fingerprints identify the exact supplied files if editions differ:

```text
Norman     f70b91b40bec7d9a1f862505a8869055ed3d2ba3aa1468f8e08fef48fe0dbd7d
Few        18604403df8087c5cb5dcafe3d10bfeaaf2120f373d0f1840b3e125fc2da9cc6
MacDonald  c19a7f6e43eaf22ae490913d1c989365f4427d9986d7bf9cac9b4bbd95e55f86
```

## Find the relevant argument

| Question | Book and section | PDF pages | Printed pages |
|---|---|---|---|
| What matters in first impression, use, and remembered experience? | Norman ch. 3, Visceral / Behavioral / Reflective Design | 78–83, 96–101 | 65–70, 83–88 |
| What need and activity does the interface support? | Norman ch. 3, Behavioral Design | 82–88, 94–96 | 69–75, 81–83 |
| How does the product explain its operation and response? | Norman ch. 3, conceptual model, system image, feedback; figs. 3.4–3.5 | 88–91 | 75–78 |
| What makes a pattern different from a styled component? | MacDonald ch. 1, What's a UI pattern? / Elements of a UI pattern | 19–25 | Not verified |
| How should validation help recovery? | MacDonald ch. 2, Validation feedback | 61–65 | Not verified |
| When are defaults helpful or dangerous? | MacDonald ch. 2, Good defaults | 77–79 | Not verified |
| Is this optional depth or a required sequence? | MacDonald ch. 2, Progressive / Staged disclosure / Progressive reduction | 83–90 | Not verified |
| How do filters communicate scope and recover from no matches? | MacDonald ch. 3, Search filters through Error prevention and recovery | 109–119 | Not verified |
| How should collections support lookup, return, and browsing? | MacDonald ch. 3, Pagination / Infinite scroll / Inclusive design | 127–133 | Not verified |
| What makes an action discoverable and its response clear? | MacDonald ch. 3, Triggers / Action / Feedback | 138–140 | Not verified |
| How do previews, tokens, and components belong together? | MacDonald ch. 4, Pattern previews / Converting design elements to code / Documenting patterns or components | 164–168, 176–180 | Not verified |
| What can hidden navigation or dialogs cost? | MacDonald ch. 5, Hamburger basement / Pop-up anti-pattern / Overall pattern | 194–199, 210–214 | Not verified |
| How does hierarchy express search and category scope? | MacDonald ch. 6, Categories in tabbed navigation | 237–241 | Not verified |
| Is a dashboard the right kind of view? | Few §1.3.1 and §2.1.1 | 26–27, 31–32 | Not verified |
| What context and precision does a measure need? | Few §3.2–3.4 | 43–46 | Not verified |
| Which visual attributes show quantity or emphasis? | Few §4.2 | 67–74 | Not verified |
| Is text, a table, or a graph appropriate? | Few §6.1 | 102–106 | Not verified |
| Which chart answers the question? | Few §6.2.1.1–6.2.1.8, bullet, bar, stacked, line, sparkline, box, scatter | 107–127 | Not verified |
| How do comparison and consistency work together? | Few §7.1–7.2 | 139–143 | Not verified |
| How should the view support legibility, detail, and observation? | Few §7.3–7.5 | 143–146 | Not verified |

Read adjacent pages when an example continues. In particular, a caption or
contents entry is not sufficient evidence for an unseen figure. Use a local
PDF viewer when the figure itself matters, within the active repository's
inspection rules. Do not upload the source to an external service to inspect it.

## What was read and what remains outside this synthesis

Creation used focused text reading of the arguments and sections indexed above,
with additional context from Norman's chapter 3 examples, MacDonald's introduction
and design-system discussion, and Few's summaries/exception discussion (§5.2.2,
PDF 94–95). Source metadata and contents were checked. Text was extracted from
all three PDFs to locate passages; extraction is not a full reading.

The books were not read cover to cover. This work does not synthesize Norman's
full emotion theory, later chapters on social experience and robots, or his
complete cited research. It does not cover MacDonald's entire onboarding,
commerce, social-pattern, or design-system governance catalog. It does not audit
Few's complete dashboard gallery, treemaps, or every chart variation. All figures
remain visually unreviewed for this task. The guidance is grounded in the prose,
not claimed deductions from rendered screenshots or diagrams.

The PDFs contain extraction artifacts: Norman has split words and font-encoding
warnings; Few has conversion spacing and repagination; MacDonald separates some
images and captions. No precise quotation or visual assertion depends on those
artifacts. Verify the original page for a disputed phrase or visual argument.

## What the package adds

The HCI-first routing, state table, review procedure, responsive adaptation,
missing-data/uncertainty checks, and Mappack applications are original synthesis.
They are labeled beside their use. The books supply principles and examples;
they do not prove these screens are usable, accessible, trustworthy, or effective.

The accessibility section links to W3C WCAG 2.2 and the WAI-ARIA dialog pattern,
checked on October 14, 2026. These are a contemporary supplement, distinct from
the books. Recheck the applicable standard for a formal accessibility review.
Book examples of specific websites and technologies describe their publication
era; they are not claims about those products today.

Unlike the local logo-design package, this tracked package does not bundle the
original PDFs or a reproduced gallery. It can operate from its original prose
alone. Keep copyrighted sources and temporary extracts out of commits, admin
publishing, app bundles, and public deliverables.
