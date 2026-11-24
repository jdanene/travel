import { useRef, useState } from "react";
import { Sheet } from "../../../components/Sheet";
import { readLink, type ReadLink } from "../../../lib/reader";
import type { LinkItem } from "../../../types/trip";
import { linkId, parseLink, siteOf } from "../lib/links";

interface AddLinkSheetProps {
  open: boolean;
  destinations: Array<{ id: string; name: string }>;
  known: string[];
  memberId: string;
  onClose: () => void;
  /** Saves the link; resolves false when it turned out to be there already. */
  onAdd: (id: string, item: LinkItem) => Promise<boolean>;
  onShow: (id: string) => void;
}

/**
 * Add a link, in the pattern of the Add a place sheet (20/5): paste an
 * Instagram, TikTok or other https link, pick the destination, say what it
 * is if you like, and save. The reader looks for a title and a cover while
 * the friend types; when it finds none (Instagram's login wall, most other
 * sites) the link saves with the note and a site tile (case 46).
 *
 * Inputs: whether it is open, the destinations, the ids already listed,
 * this member, and what closing, adding and showing do.
 * Output: the sheet. Text that is not an https link gets "Paste a link
 * that starts with https://" and no call (case 43). A link already listed
 * closes the sheet and brings its card into view (case 45).
 * Examples (checked on the emulator): a TikTok video → saved with its caption and cover
 */
export function AddLinkSheet({ open, destinations, known, memberId, onClose, onAdd, onShow }: AddLinkSheetProps) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState(destinations[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const reading = useRef<{ href: string; result: Promise<ReadLink | null> } | null>(null);

  const url = parseLink(text);

  const close = () => {
    setText("");
    setNote("");
    setSaving(false);
    reading.current = null;
    onClose();
  };

  const paste = (value: string) => {
    setText(value);
    const link = parseLink(value);
    if (!link) return;
    const id = linkId(link.href);
    if (known.includes(id)) {
      close();
      return onShow(id);
    }
    // Only Instagram and TikTok can be read; other sites save as they are.
    if (siteOf(link) !== "other" && reading.current?.href !== link.href) reading.current = { href: link.href, result: readLink(link.href) };
  };

  const save = async () => {
    if (!url) return;
    setSaving(true);
    const found = reading.current?.href === url.href ? await reading.current.result : null;
    const id = linkId(url.href);
    const item: LinkItem = {
      url: url.href,
      site: siteOf(url),
      destination,
      addedBy: memberId,
      at: Date.now(),
      ...(note.trim() ? { note: note.trim().slice(0, 200) } : {}),
      ...(found?.title ? { title: found.title.slice(0, 300) } : {}),
      ...(found?.photoUrl ? { thumbUrl: found.photoUrl } : {}),
    };
    const added = await onAdd(id, item);
    close();
    if (!added) onShow(id);
  };

  return (
    <Sheet open={open} title="Add a link" onClose={close}>
      <p className="sub" style={{ margin: "4px 0 12px" }}>
        Paste an Instagram or TikTok link.
      </p>
      <label className="field">
        <small>Link</small>
        <input value={text} onChange={(event) => paste(event.target.value)} inputMode="url" placeholder="tiktok.com/@…" autoComplete="off" />
      </label>
      {text.trim() !== "" && !url && (
        <p className="field-error" role="alert">
          Paste a link that starts with https://
        </p>
      )}
      <div className="pills" role="group" aria-label="Destination" style={{ margin: "4px 0 14px" }}>
        {destinations.map((candidate) => (
          <button key={candidate.id} type="button" className="pill" aria-pressed={candidate.id === destination} onClick={() => setDestination(candidate.id)}>
            {candidate.name}
          </button>
        ))}
      </div>
      <label className="field">
        <small>What is it?</small>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
      </label>
      <button type="button" className="btn" style={{ marginTop: 14 }} disabled={!url || saving} aria-busy={saving} onClick={() => void save()}>
        Save
      </button>
    </Sheet>
  );
}
