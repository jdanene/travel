# Direct source reading guide

The tracked skill contains original distilled prose. The PDFs and reproduced
page images are optional local study material; they are not included in Git and
will not exist in a fresh clone or worktree. No book files were reread or source
images inspected as part of publishing this existing skill. The page map and
study notes retain the earlier review's coverage and limits.

## Locate the optional books

The original local folder on Jidè's Mac is:

```text
/Users/jideanene/claude/Projects/Plumbing/mappack/design/references/logo-design/
```

Look under its `books/` directory for these exact filenames:

- `logo-design-love.pdf`: the user's supplied 217-page Spanish-language PDF,
  copyright 2010. English working notes are in
  [book-principles.md](book-principles.md). Text extraction sometimes repeats
  passages; inspect the original page when wording or artwork matters.
- `logo-modernism.pdf`: the user's supplied 122-page image-only selection.
  Many pages photograph two printed pages. The selection is incomplete and
  partly out of sequence. It includes English text, but not every essay or
  spread. Missing material cannot be inferred from the contents.

If that folder is unavailable, use a lawfully accessible copy supplied by the
user. These locators are not download links. Another edition or PDF may use
different pagination; verify the example and printed number before citing it.
If no original is available, use the written synthesis and state that direct
source or visual verification was not performed.

The earlier local gallery remains under `references/visual-examples/` in that
original folder. This repository retains only [its written study notes](visual-examples.md).
The books and gallery are study references, not artwork licensed for a client's
new identity. Do not commit or publish them with a website preview.

## Find the relevant argument

Use PDF page numbers, counted from one, when opening the files. Printed numbers
appear separately. Do not apply one book's page offset to the other.

| Design question | Book | PDF pages | Printed pages | What to examine |
|---|---|---|---|---|
| What must the logo accomplish? | Love | 55-62, 72-74 | 42-49, 59-61 | Brief, audience, applications, useful adjectives. |
| What makes a simple mark useful? | Love | 35-52 | 22-39 | Relevance, distinction, reduction, one dominant feature. |
| What should a redesign preserve? | Love | 75-88 | 62-75 | Existing recognition and reasons for change. |
| How do we get beyond the first idea? | Love | 103-110, 115-122 | 90-97, 102-109 | Association maps, rough sketches, alternatives. |
| How do we compare ideas fairly? | Love | 123-129 | 110-116 | Shape before color; Woodmere alternatives and applications. |
| How should feedback change the design? | Love | 131-153 | 118-140 | Rationale, decision-makers, coherent revisions. |
| What belongs in the handoff? | Love | 182-189, 193-204 | 169-176, 180-191 | Selection, vectors, type, reduction, physical uses. |
| Must a mark literally depict the service? | Modernism | 112 | 402-403 | Paul Rand profile and statement on identification. |
| How does a mark become a system? | Modernism | 6, 47 | 12-13, 102-103 | Identity programs and Daiei applications. |
| How many forms can a few shapes produce? | Modernism | 7, 36 | 14-15, 72-73 | Formal parameters and Basic Forms examples. |
| Which transformations can we explore? | Modernism | 54, 58, 65 | crop, 174-175, 224-225 | Effect introduction, duplication, rotation. |
| How can letters share a construction? | Modernism | 88, 91 | 322-323, 340-341 | Two Letters and Three Letters. Inspect reading order. |
| Can lettering carry the whole identity? | Modernism | 93 | 358-359 | Words: distinct silhouettes, rhythm, and letter construction. |
| What does geometric construction mean here? | Modernism | 122 | not visible | Cropped Geometric introduction. |

Read adjacent pages when a passage refers to a previous example. The selected
images are entry points, not substitutes for context. Do not state that a book
proves a logo increases trust, recall, or sales unless the source actually
supplies that evidence.

## Inspect with local tools

Open a PDF in any local PDF viewer and enter its PDF page number. An agent with
PDF rendering tools can render a specific page. For example, after locating the original local folder:

```sh
pdftoppm -f 47 -l 47 -scale-to 1800 -png -singlefile \
  "/Users/jideanene/claude/Projects/Plumbing/mappack/design/references/logo-design/books/logo-modernism.pdf" \
  /tmp/logo-modernism-page-47
```

Then inspect the resulting image. Poppler is an optional rendering tool, not a
bundled dependency. A native PDF viewer works without it. Modernism contains no
useful text layer; an empty text extraction is not an empty page. OCR can help
locate words but does not replace viewing the marks, captions, and page numbers.

Use [book-principles.md](book-principles.md) for the distilled rules and
[review-and-delivery.md](review-and-delivery.md) for current application checks.
Keep author statements, visual deductions, and new production procedures distinct.
