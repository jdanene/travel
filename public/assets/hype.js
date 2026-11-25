// Shared media list and helpers for the hype pages.
// Every photo and clip is real: the crew's own trip media plus three licensed stock shots of Bali.
window.HYPE = (() => {
  const B = "https://travel-ca8f9-media.s3.us-east-2.amazonaws.com/public/site/";
  const P = (file, pos, label) => ({ kind: "img", src: B + file, pos: pos || "center", label });
  // "?v=2": the clips with music replaced silent files at the same names, which browsers had saved for a day.
  // pos keeps the people in frame when a tall clip is cropped into a wide panel.
  const V = (file, poster, pos, music = true) => ({ kind: "vid", src: B + file + "?v=2", poster: B + poster, pos: pos || "center 60%", music });

  // Licensed Pexels photos (free to use under the Pexels License), loaded from the Pexels CDN.
  const X = (id, pos) => ({ kind: "img", pos: pos || "center 30%",
    src: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600` });

  // The crew's own trip: photos and stills from their videos.
  const ours = [P("trip-beachclub.jpg", "center 45%"), P("trip-garden.jpg", "center 65%"), P("crew.jpg", "center 55%")];
  // The owner rejected the stock club and beach photos; only two Bali venue shots remain.
  const club = [];
  const beach = [];
  // Named places carry a label; the crew's own shots never do.
  const bali = [P("d-uluwatu-cube.jpg", "center", "Savaya"), P("munduk.jpg", "center", "Munduk"), P("kp-beach.jpg", "center", "Koh Phangan"),
    P("ubud.jpg", "center", "Ubud"), P("phra-nang-cave.jpg", "center 70%", "Phra Nang Beach"), P("bali-monkey.jpg", "center 55%", "Uluwatu"),
    P("kp-aerial.jpg", "center", "Koh Phangan"), P("phra-nang.jpg?v=2", "center 60%", "Phra Nang Beach"), P("bali-cliff.jpg", "center", "Uluwatu"),
    P("phuket-snorkel.jpg", "center 60%", "Thailand"), P("phuket-elephants.jpg", "center 55%", "Thailand"), P("phuket-market.jpg", "center 45%", "Thailand"),
    P("b-beach-club.jpg")];

  const clips = [
    V("clip-sunset.mp4", "clip-sunset-1.jpg", "center 42%"), V("clip-party.mp4", "clip-party-1.jpg", "center 60%"),
    V("clip-stage.mp4", "clip-stage-1.jpg", "center 72%"), V("clip-hands.mp4", "clip-hands-1.jpg", "center 72%"),
    V("clip-silver.mp4", "clip-silver-1.jpg", "center 42%"), V("clip-boat.mp4", "clip-boat-1.jpg", "center 92%", false),
    V("clip-silver2.mp4", "clip-silver2-1.jpg", "center 42%"), V("clip-boat2.mp4", "clip-boat2-1.jpg", "center 92%", false),
    // Added 23 Nov 2026: the bull ride, the beach party, the roller skaters, the sunset from the hut.
    V("clip-bull.mp4", "", "center 55%"), V("clip-sand.mp4", "", "center 45%"), V("clip-skate.mp4", "", "center 60%"),
    V("clip-dusk.mp4", "", "center 45%"),
  ];
  const reel = V("reel2.mp4", "", "center 68%");   // every clip, cut together
  // The friend on the drip. It shows the whole photo so the drip line and the taped arm are always in view.
  // A gag card: a grey photo with two lines of words. k, ar, cy and ty frame the part of the photo that must stay in view
  // (see .wst in hype.css): k = 100 x photo width / height of that part, ar = photo height / width,
  // cy = the part's centre down the photo in percent, ty = how far below centre the words sit, in card widths.
  const wasted = { kind: "img", src: B + "wasted.jpg", pos: "center", wasted: true,
    card: { big: "WASTED", small: "DRINK WATER THIS TIME", k: 118.2, ar: 1.225, cy: 54.5, ty: .12 } };
  const pause = { kind: "img", src: B + "pause.jpg", pos: "center",
    card: { big: "PAUSE", small: "AS A GROWN MAN SHOULD YOU...", k: 163, ar: 1.333, cy: 52, ty: .25 } };
  // The club photo the owner picked from the first set (25 Nov 2026): a normal picture, one among the rest.
  const lasers = { kind: "img", src: B + "club-lasers.jpg", pos: "center 30%" };
  // Named places lead, with the crew's photos between them, so every slideshow reaches them early.
  const named = bali.filter(b => b.label), stills = [];
  for (let k = 0; k < named.length; k++) { stills.push(named[k]); if (ours[k]) stills.push(ours[k]); }
  stills.push(...bali.filter(b => !b.label));
  const photos = [];
  for (let k = 0; k < Math.max(clips.length, stills.length); k++) { if (clips[k]) photos.push(clips[k]); if (stills[k]) photos.push(stills[k]); }
  photos.splice(Math.floor(photos.length / 2), 0, pause);
  photos.splice(Math.floor(photos.length / 4), 0, lasers);
  photos.push(wasted);   // one picture among the rest; on a wall it lands on a random panel, never the title

  // Build a filling element for a photo or a clip.
  // opts.sound: the clip whose music the button controls. opts.lazy: load only when wake() is called.
  function el(item, cls = "", opts = {}) {
    let e;
    if (item.kind === "vid") {
      e = document.createElement("video");
      e.style.objectPosition = item.pos;
      e.muted = true; e.loop = true; e.playsInline = true;
      ["muted", "loop", "playsinline"].forEach(a => e.setAttribute(a, ""));
      if (opts.lazy) { e.dataset.src = item.src; e.preload = "none"; }
      else { e.src = item.src; e.autoplay = true; e.setAttribute("autoplay", ""); e.preload = "auto"; }
      // Phones often ignore autoplay; start the clip ourselves as soon as it can play, and keep it looping.
      e.setAttribute("webkit-playsinline", ""); e.disableRemotePlayback = true; e.controls = false;
      const kick = () => { if (!e.closest(".layer:not(.on)")) e.play().catch(() => {}); };
      e.addEventListener("loadeddata", kick); e.addEventListener("canplay", kick);
      e.addEventListener("ended", () => { e.currentTime = 0; kick(); });
      if (opts.sound && item.music) e.dataset.sound = "1";
    } else if (item.card) {
      e = document.createElement("div");
      e.className = "wst";
      e.innerHTML = '<div class="fill wst-bg"></div><div class="fill wst-ph"></div>' +
        `<div class="wst-t"><div class="wasted">${item.card.big}</div><div class="water">${item.card.small}</div></div>`;
      const c = item.card;
      e.style.cssText = `--k:${c.k};--ar:${c.ar};--cy:-${c.cy}%;--ty:${c.ty}`;
      e.querySelectorAll(".fill").forEach(n => { if (opts.lazy) n.dataset.bg = item.src; else n.style.backgroundImage = `url(${item.src})`; });
      e.dataset.long = "1";
    } else {
      e = document.createElement("div");
      const src = opts.small ? item.src.replace("w=1600", "w=700") : item.src;
      if (opts.lazy) e.dataset.bg = src; else e.style.backgroundImage = `url(${src})`;
      e.style.backgroundPosition = item.pos;
      if (item.label) { const t = document.createElement("span"); t.className = "place"; t.textContent = item.label; e.append(t); }
    }
    e.className = ((e.className ? e.className + " " : "") + "fill pop " + cls).trim();
    return e;
  }

  // Start loading a lazy element (and any lazy children).
  function wake(e) {
    if (!e) return;
    [e, ...e.querySelectorAll("[data-bg],[data-src]")].forEach(n => {
      if (n.dataset.bg) { n.style.backgroundImage = `url(${n.dataset.bg})`; delete n.dataset.bg; }
      if (n.dataset.src) { n.src = n.dataset.src; delete n.dataset.src; }
    });
  }

  const clipOf = e => e.tagName === "VIDEO" ? e : e.querySelector("video");

  // Keep e on screen, then call next. A photo stays ms (the WASTED card half as long again, so the joke reads).
  // A clip plays from its start to its end once; if it stalls or the phone blocks it, it gives way after its length.
  function hold(e, ms, next) {
    const v = clipOf(e);
    if (!v) return setTimeout(next, e.dataset.long ? ms * 1.5 : ms);
    let done = false, t = setTimeout(go, 15000);
    function go() { if (done) return; done = true; clearTimeout(t); v.removeEventListener("ended", go); next(); }
    const cap = () => { if (isFinite(v.duration)) { clearTimeout(t); t = setTimeout(go, v.duration * 1000 + 1500); } };
    v.loop = false;
    try { v.currentTime = 0; } catch (err) {}
    v.play().catch(() => {});
    v.addEventListener("ended", go);
    if (v.readyState >= 1) cap(); else v.addEventListener("loadedmetadata", cap, { once: true });
  }

  // Stop a clip and free its decoder before removing it; phones run out of video players otherwise.
  function drop(x) {
    const v = clipOf(x);
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    x.remove();
  }

  // Show one element at a time; onStep(i) runs on each switch.
  // Only the shown element and the next one are loaded; clips play only while shown.
  function cycle(els, ms, onStep) {
    let i = 0;
    const show = () => {
      const k = i;
      wake(els[k]); wake(els[(k + 1) % els.length]);
      els.forEach((e, j) => {
        e.classList.toggle("on", j === k);
        const v = clipOf(e);
        if (v && j !== k) v.pause();
      });
      if (onStep) onStep(k);
      i = (k + 1) % els.length;
      hold(els[k], ms, show);
    };
    show();
  }

  // The full run of clips and photos, for slideshows.
  function mix() { return photos.slice(); }

  // Add the music button when the page has a clip marked for sound.
  function sound() {
    const vids = () => [...document.querySelectorAll("video[data-sound]")];
    if (!vids().length) return;
    const off = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    const on = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
    const b = document.createElement("button");
    b.className = "snd"; b.setAttribute("aria-label", "Turn sound on"); b.innerHTML = off;
    document.body.appendChild(b);
    let live = false;
    b.onclick = () => {
      live = !live;
      vids().forEach(v => { v.muted = !live; if (live) v.play().catch(() => {}); });
      b.classList.toggle("on", live);
      b.innerHTML = live ? on : off;
      b.setAttribute("aria-label", live ? "Turn sound off" : "Turn sound on");
    };
    // The first tap anywhere turns the music on, except a tap on the sound button itself or on the way into the trip.
    document.addEventListener("pointerdown", e => { if (!live && !e.target.closest(".snd, .enter")) b.click(); }, { once: true });
  }

  // Two cuts of the same footage count as one scene, so they never show side by side.
  function scene(it) {
    if (it.label) return it.label;   // two shots of one place count as the same picture
    const f = it.src.split("/").pop().split("?")[0];
    if (f.startsWith("clip-silver")) return "silver";
    if (f.startsWith("clip-boat")) return "boat";
    if (f === "clip-stage.mp4" || f === "clip-hands.mp4") return "stage";
    return f;
  }

  // A wall of tiles. Each tile runs on its own clock: a photo stays ms, a clip plays to its end.
  // No scene is ever on two tiles at once: a tile only takes an item whose scene no other tile is showing.
  // clips, when given, caps how many tiles play a clip at once (the app's cover keeps it to two).
  // A tile taken off the page stops swapping, so a re-laid board leaves nothing running behind it.
  function board(tiles, pool, ms, clips = Infinity) {
    const free = pool.slice(), cur = [];
    // A tile's own scene counts as busy too, or it would swap between two cuts of one clip and look frozen.
    // Order is random on every visit and every round, but every item comes up once per round before any repeats.
    // The WASTED card moves around like any picture, except onto the title panel (class "t").
    let shown = new Set();
    const take = k => {
      const busy = new Set(cur.filter(c => c).map(scene));
      const playing = cur.filter((c, j) => c && j !== k && c.kind === "vid").length;
      const ok = it => !busy.has(scene(it)) && !(it.card && tiles[k].classList.contains("t")) && !(it.kind === "vid" && playing >= clips);
      let options = free.filter(it => ok(it) && !shown.has(it));
      if (!options.length) { shown = new Set(cur.filter(c => c)); options = free.filter(ok); }   // a new round
      if (!options.length) return null;
      const it = options[Math.floor(Math.random() * options.length)];
      shown.add(it);
      return free.splice(free.indexOf(it), 1)[0];
    };
    const put = (k, item, wait) => {
      const t = tiles[k], e = el(item, "layer", { small: true });
      t.append(e);
      requestAnimationFrame(() => requestAnimationFrame(() => e.classList.add("on")));
      setTimeout(() => [...t.children].filter(x => x.classList.contains("layer")).slice(0, -1).forEach(drop), 700);
      setTimeout(() => hold(e, ms, () => swap(k)), wait || 0);
    };
    // If every free item is already on another tile, try again shortly instead of freezing.
    const swap = k => {
      if (!tiles[k].isConnected) return;
      const next = take(k);
      if (!next) return setTimeout(() => swap(k), 300);
      if (cur[k]) free.push(cur[k]);
      cur[k] = next;
      put(k, next);
    };
    // Stagger the first swaps so the tiles do not all change together.
    // The page always opens with the WASTED card on one panel, picked at random (never the title).
    const w = free.findIndex(it => it.wasted);
    const spots = tiles.map((t, k) => k).filter(k => !tiles[k].classList.contains("t"));
    if (w >= 0 && spots.length) { const k = spots[Math.floor(Math.random() * spots.length)]; cur[k] = free.splice(w, 1)[0]; shown.add(cur[k]); }
    tiles.forEach((t, k) => { if (!cur[k]) cur[k] = take(k); if (cur[k]) put(k, cur[k], Math.round(k * ms / tiles.length)); });
  }

  // A hidden copy of the reel that only supplies music for pages that show stills.
  function bed() {
    const v = el(reel, "", { sound: true });
    v.style.cssText = "position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:0;top:0";
    document.body.appendChild(v);
    return v;
  }

  // Adds the one way from the splash into the trip app. Options 1 and 13 call it; the other options never do.
  // Inputs: none. It reads the trip id from "?t=" in the address or, failing that, the id this phone remembered,
  //   and the organizer key from "?organizer=", which it takes out of the address at once and keeps in memory only.
  //   An id holds letters, digits, "-" and "_" only; a key holds the same, 16 to 64 of them, and counts only with
  //   an id from the address. Anything else is ignored.
  // Output: an "OPEN THE TRIP" link to /trip/<id> at the bottom centre, or nothing when there is no id. The id in the
  //   address wins and is remembered; blocked storage only means nothing is remembered. A tap saves a one-time pass,
  //   its time, under "travel.splash.<id>" in this tab's sessionStorage; the app spends it on load
  //   (web/src/app/lib/splash.ts). The tap opens /trip/<id>?organizer=<key> when the splash came with a key.
  // Examples (checked by hand in a 390px window):
  //   /hype/1/?t=abc → the button opens /trip/abc, and a later /hype/13/ on that phone shows it too.
  //   /?t=abc&organizer=<key> → the address shows /?t=abc; the button opens /trip/abc?organizer=<key>.
  //   /hype/1/?t=bad<id> on a phone that remembers nothing → no button.
  function enter() {
    const valid = id => (id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null);
    const q = new URLSearchParams(location.search);
    let id = valid(q.get("t"));
    const key = id && /^[A-Za-z0-9_-]{16,64}$/.test(q.get("organizer") || "") ? q.get("organizer") : null;
    if (q.has("organizer")) {
      q.delete("organizer");
      const rest = q.toString();
      history.replaceState(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    }
    try {
      if (id) localStorage.setItem("travel.trip", id);
      else id = valid(localStorage.getItem("travel.trip"));
    } catch (err) {}
    if (!id) return;
    const a = document.createElement("a"), to = "/trip/" + id;
    a.className = "enter"; a.href = to; a.textContent = "OPEN THE TRIP";
    // The key joins the link only for the tap itself, so the page never shows it, not even on hover.
    a.addEventListener("click", event => {
      try { sessionStorage.setItem("travel.splash." + id, String(Date.now())); } catch (err) {}
      const href = key ? to + "?organizer=" + key : to;
      // A plain click starts the load at once and fades the splash to the trip's charcoal while it loads;
      // where the browser has view transitions it cross-fades into the trip instead. Reduced motion: a plain cut.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
        if (key) { a.href = href; setTimeout(() => { a.href = to; }); }
        return;
      }
      event.preventDefault();
      a.classList.add("pressed");
      if (!("onpagereveal" in window)) document.body.classList.add("leaving");
      location.assign(href);
    });
    // Back from the trip may restore this page as it was left: lift the fade and the pressed button.
    addEventListener("pageshow", () => { document.body.classList.remove("leaving"); a.classList.remove("pressed"); });
    document.body.appendChild(a);
    document.body.classList.add("has-enter");
    warm(id, to);
  }

  // Readies the whole trip while the splash plays, so the tap shows the finished trip page with nothing left to load
  // (owner, 24 Nov 2026: "literally everything on the app loads at the splash screen"). At once: early connections to
  // Firebase, the fonts and the map's hosts. Once the first clips play (1.5 s, then the next idle moment), at most
  // four loads at a time, most needed first: the prewarm script (web/src/prewarm.ts) with the Firebase chunk, which
  // signs in and saves the whole trip for the app's first paint; the trip's own page; the app's entry script as a
  // modulepreload (fetched and compiled); the stylesheets; the fonts; the cover collage page and the cliff photo; the map's
  // style, sprite, tile index and label fonts; every other script (the map chunk with MapLibre); the files the app
  // fetches by address (the emoji picker's data); the collage's stills. The scripts and
  // stylesheets are named in /app/preload.json, which the build writes.
  // On Save-Data or a 2g connection it only prefetches the app's script and stylesheet, as before.
  // Inputs: id — the trip id; href — the trip's address (never with the organizer key, which stays off the page). Output: nothing; every failure is silent, and the tap
  //   then loads whatever is missing.
  // Examples (checked in Chrome on the emulator, Fast 4G): the splash with ?t=<id> → after the tap the trip page
  //   draws from the snapshot with no request but the live listener's; Save-Data → two prefetches, three preconnects.
  function warm(id, href) {
    const link = (rel, url, extra) => new Promise(done => {
      const l = document.createElement("link");
      l.rel = rel; l.href = url;
      Object.assign(l, extra || {});
      l.onload = l.onerror = () => done();
      document.head.appendChild(l);
    });
    ["https://travel-ca8f9-default-rtdb.firebaseio.com", "https://identitytoolkit.googleapis.com", "https://www.googleapis.com",
      "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://tiles.openfreemap.org"]
      .forEach(host => link("preconnect", host, { crossOrigin: "anonymous" }));
    const net = navigator.connection || {};
    if (net.saveData || /2g/.test(net.effectiveType || "")) return lean(link);
    // At most four loads at a time, so the splash's own clips keep most of the line. A load found by another
    // (a font file, the map's sprite) goes to the front.
    const queue = [];
    let running = 0;
    const add = (task, soon) => { if (soon) queue.unshift(task); else queue.push(task); pump(); };
    const pump = () => {
      while (running < 4 && queue.length) {
        running++;
        Promise.resolve().then(queue.shift()).catch(() => {}).then(() => { running--; pump(); });
      }
    };
    const json = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(r.status)));
    const image = url => new Promise(done => { const i = new Image(); i.onload = i.onerror = done; i.src = url; });
    const start = () => json("/app/preload.json").then(list => {
      // First the data: the prewarm script and the Firebase chunk it shares with the app, side by side.
      (list.shared || []).forEach(s => add(() => link("modulepreload", s)));
      add(() => { window.travelPrewarmTrip = id; return import(list.prewarm); });
      // The trip's own page: a speculative prefetch, which the tap's navigation uses without asking the server again.
      add(() => {
        if (!(HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return link("prefetch", href, { as: "document" });
        const rules = document.createElement("script");
        rules.type = "speculationrules";
        rules.textContent = JSON.stringify({ prefetch: [{ source: "list", urls: [href] }] });
        document.head.appendChild(rules);
      });
      add(() => link("modulepreload", list.entry));
      list.styles.forEach(s => add(() => link("prefetch", s, { as: "style" })));
      // The fonts' stylesheet: read once for the Latin files it names (the app's words are all Latin), then fetched
      // as a stylesheet, not applied here. That order matters: Google's answer varies with the kind of request and
      // the browser keeps one copy, the last one, which must be the stylesheet the app asks for.
      list.fonts.forEach(css => add(() => fetch(css).then(r => r.text()).then(text => {
        (text.match(/\/\* latin \*\/[^}]*}/g) || []).forEach(face => {
          const url = (face.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
          if (url) add(() => link("prefetch", url, { as: "font", crossOrigin: "anonymous" }), true);
        });
      }).finally(() => add(() => link("preload", css, { as: "style" }), true))));
      // The cover: the collage page in the trip's head and the cliff photo under it.
      add(() => link("prefetch", "/hype/cover/", { as: "document" }));
      add(() => image(B + "bali-cliff.jpg"));
      // The map's style, its sprite, its tile index and its label fonts; the app builds the hidden map from them right after its first paint.
      add(() => json("https://tiles.openfreemap.org/styles/positron").then(style => {
        const sprite = typeof style.sprite === "string" ? style.sprite : null;
        const scale = devicePixelRatio > 1 ? "@2x" : "";
        if (sprite) [".json", ".png"].forEach(end => add(() => fetch(sprite + scale + end), true));
        Object.values(style.sources || {}).forEach(source => { if (source.url) add(() => fetch(source.url), true); });
        // The first range of each label font (Latin), as the map asks for it.
        const fonts = new Set((style.layers || []).map(l => l.layout && l.layout["text-font"]).filter(Array.isArray).map(f => f.join(",")));
        if (style.glyphs) fonts.forEach(f => add(() => fetch(style.glyphs.replace("{fontstack}", encodeURIComponent(f)).replace("{range}", "0-255")), true));
      }));
      // The rest of the app's scripts: the map chunk with MapLibre, and any other chunk the build made.
      list.scripts.filter(s => s !== list.entry && s !== list.prewarm).forEach(s => add(() => link("modulepreload", s)));
      // Files the app fetches by address, such as the emoji picker's data in Activity.
      (list.data || []).forEach(url => add(() => fetch(url)));
      // Last, every still the collage draws from; the splash has shown most of them already.
      photos.filter(p => p.kind === "img").map(p => p.src).filter((url, k, all) => all.indexOf(url) === k).forEach(url => add(() => image(url)));
    }).catch(() => lean(link));
    // Wait until the splash's first clips play, then for a quiet moment.
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 1000 }) : start()), 1500);
  }

  // Today's lighter warm-up, for Save-Data, 2g, or a missing /app/preload.json: the app's script and stylesheet
  // (their built names read from /app/index.html) as prefetches, which the browser keeps for the next page.
  function lean(link) {
    fetch("/app/index.html").then(r => (r.ok ? r.text() : "")).then(html => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("script[type=module][src]").forEach(s => link("prefetch", s.getAttribute("src"), { as: "script", crossOrigin: "anonymous" }));
      doc.querySelectorAll("link[rel=stylesheet][href^='/app/']").forEach(c => link("prefetch", c.getAttribute("href"), { as: "style", crossOrigin: "anonymous" }));
    }).catch(() => {});
  }

  // Small link back to the list of options.
  function back(n) {
    const d = document.createElement("div");
    d.className = "opt"; d.innerHTML = `${n} · <a href="/hype/">all options</a>`;
    document.body.appendChild(d);
  }

  // If the phone still blocked a clip (Low Power Mode does this), the first touch starts every visible one.
  const kickAll = () => document.querySelectorAll("video").forEach(v => { if (v.paused && !v.closest(".layer:not(.on)")) v.play().catch(() => {}); });
  ["touchstart", "pointerdown", "scroll"].forEach(ev => document.addEventListener(ev, kickAll, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kickAll(); });

  return { B, ours, club, beach, bali, photos, clips, reel, wasted, el, wake, cycle, mix, board, bed, sound, enter, back };
})();
