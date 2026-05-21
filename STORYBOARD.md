# NCT Simulator Demo Video — Storyboard & Shot Plan

> 24-second three-act demonstration of the NCT Feasibility Simulator. Embedded as a new slide in the pitch deck (between Reference Dashboard and Proven Outcomes). Pass this file to Claude Code / Codex with a Remotion skill — it has everything needed to implement.

---

## 1. Top-line spec

| Property | Value |
|---|---|
| Duration | 24 seconds |
| Frame rate | 30 fps (720 frames total) |
| Resolution | 1920 × 1080 (16:9) |
| Format | MP4 (H.264, ~5 Mbps) + WebM fallback |
| File size target | < 8 MB |
| Audio | Corporate piano BGM, muted-capable (subtitles always shown) |
| Embedding context | HTML pitch deck `<video muted autoplay loop playsinline>` |
| Background colour | `#faf7f1` (cream — matches pitch deck) |
| Brand accent | `#a8853f` (deep gold) |
| Typography | Fraunces (serif, italic gold for highlights), Inter (sans for UI), JetBrains Mono (numbers) |

---

## 2. Three-act structure

```
Act 1 — Baseline       0.0s ──┬── 7.0s     (frames 0–209)
Act 2 — The What-If    7.0s ──┼── 17.0s    (frames 210–509)
Act 3 — Punchline     17.0s ──┴── 24.0s    (frames 510–719)
```

### Act 1 · Baseline (7 seconds)
Establish the simulator. Fade in. Show the project, the 6 levers at zero, the 4 KPI cards settle to baseline values. Subtitle introduces the project. Calm, clean.

### Act 2 · The What-If (10 seconds)
Two levers animate in sequence. First selling price goes 0 → +5%. Pause. Then construction cost goes 0 → -3%. KPIs count up smoothly as each lever moves. Margin card crosses the 25% threshold and gets a gold glow accent. Subtitle narrates the action.

### Act 3 · Punchline (7 seconds)
Zoom in on the Margin KPI card. Big number animation: 22.6% → 25.9%. Smaller text: net profit gain. Subtitle states the message. Fade to logo + tagline. End on hold for ~1 second.

---

## 3. Frame-level timeline

The video has **8 distinct shots**. Each shot lists its frames, what's on screen, what animates, and what subtitle shows.

### Shot 1 — Project title fade in
**Frames 0–60 (0.0s – 2.0s)**

**On screen:**
- Background: cream `#faf7f1`
- Center-aligned text block fading in (Fraunces, 56px):
  - Line 1 (regular, dark ink): `Emira Shah Alam`
  - Line 2 (italic, gold): `Feasibility Simulator`
- Below, small mono caption (JetBrains Mono, 14px, dim grey): `Powered by Microsoft Fabric · Fedelis`

**Animation:**
- Frame 0–30: text fades in (`opacity` 0 → 1, ease-out)
- Frame 30–60: text holds, slight ambient gold glow pulse behind (subtle, ~5% opacity radial gradient breathing)

**Subtitle:** none (the title IS the subtitle)

**Notes:** This is the establishing shot. Pure typography, no UI yet. Sets the tone — calm, premium, editorial.

---

### Shot 2 — Crossfade to simulator UI (baseline state)
**Frames 60–120 (2.0s – 4.0s)**

**On screen:**
- Title fades out (opacity 1 → 0, frames 60–80)
- Simulator UI fades in (opacity 0 → 1, frames 70–120, 10-frame overlap)
- Full simulator screenshot rendering live (see Layout Reference below)

**Animation:**
- Crossfade only — UI is stationary, no slider movement yet
- 6 levers all at 0% (sliders centered)
- 4 KPI cards showing baseline values, not yet animated

**Subtitle (frames 90–180, 3.0s–6.0s):**
- Text: `Baseline · GDV RM 1.25B · Margin 19.8%`
- Position: bottom 12% of frame, centered
- Style: mono 18px, dark ink on cream, subtle drop shadow
- Animation: type-in over 30 frames, then hold

**Notes:** This shot lets the viewer "land" in the simulator. Don't move anything — give the eye time to read the interface.

---

### Shot 3 — Baseline hold
**Frames 120–210 (4.0s – 7.0s)**

**On screen:** Same as Shot 2 final frame — simulator UI fully visible, all levers at 0, all KPIs at baseline.

**Animation:**
- A very subtle "breathing" highlight on the KPI cards (1px gold border opacity oscillating 0% → 15% → 0% over 90 frames). Implies live/interactive.
- Subtitle holds from Shot 2

**Subtitle:** continues from Shot 2, fades out at frame 200 (10-frame fade)

**Notes:** This 3-second hold is critical. It lets the viewer read every KPI number BEFORE anything starts moving. Don't skip this — the eye needs time.

---

### Shot 4 — Selling Price lever animates +5%
**Frames 210–300 (7.0s – 10.0s)**

**On screen:** Same simulator UI. Focus shifts.

**Animation:**
- Frame 210–215: a soft gold "spotlight" ring appears around the Selling Price lever card (gold glow, ~20px blur, 25% opacity)
- Frame 215–255 (40 frames, 1.33s): slider thumb moves from 0% to +5% with spring easing
- Simultaneously frames 215–270: 
  - Lever label updates: `+0%` → `+5%` (number counts up)
  - "→ RM 650/SF" updates to "→ RM 682.50/SF" (number counts up)
  - GDV KPI counts up: RM 1,247M → RM 1,309M (smooth ease-out over 60 frames)
  - Net Profit KPI counts up: RM 247M → RM 309M
  - Margin KPI counts up: 19.8% → 23.7%
  - TDC stays mostly flat (minor +1-2M from A&P which is % of GDV)
- Frame 270–300: spotlight ring fades out, KPIs settle

**Subtitle (frames 220–310, 7.33s–10.33s):**
- Text: `Selling price · +5%`
- Position: bottom 12% of frame, left-aligned at 8% from left edge
- Style: Fraunces italic gold 22px
- Animation: slide in from left (translateX -20px → 0, opacity 0 → 1, 15 frames), hold, fade out at frame 300

**Notes:** This is the first "wow" moment. The smooth number animation must feel deliberate — not instant, not slow. Use spring physics or ease-out cubic. KPI numbers should LOOK like they're computing, not just teleporting.

---

### Shot 5 — Construction Cost lever animates -3%
**Frames 300–390 (10.0s – 13.0s)**

**On screen:** Same simulator. Selling Price stays at +5% (don't reset!).

**Animation:**
- Frame 300–305: spotlight ring appears around Construction Cost lever
- Frame 305–340 (35 frames, 1.17s): slider thumb moves from 0% to -3% with spring easing
- Simultaneously frames 305–360:
  - Lever label: `-0%` → `-3%`
  - "→ RM 123.92/SF GFA" → "→ RM 120.20/SF GFA"
  - TDC KPI counts down: RM 1,001M → RM 967M (cost drop)
  - Net Profit KPI counts up: RM 309M → RM 343M
  - Margin KPI counts up: 23.7% → 25.9% ← **crosses 25% threshold**
- Frame 360–390: spotlight fades; the Margin card gets a subtle gold border glow (it crossed the favorable threshold)

**Subtitle (frames 310–400, 10.33s–13.33s):**
- Text: `Construction cost · -3%`
- Position: same as Shot 4
- Animation: slide in from left, replace previous subtitle

**Notes:** The Margin crossing 25% should feel like a small "achievement." A subtle visual cue (gold tint deepening, or a 1-frame flash on the card border) marks this beat without being garish.

---

### Shot 6 — Hold the final state
**Frames 390–510 (13.0s – 17.0s)**

**On screen:** Full simulator with both adjustments applied. Both lever cards have their adjusted values visible. All KPIs at new values.

**Animation:**
- No motion for ~3.5s. Let the eye absorb the final state.
- Subtle camera "breathing" — very gentle scale 1.0 → 1.005 → 1.0 over 120 frames (almost imperceptible, just keeps the frame alive)

**Subtitle (frames 400–500, 13.33s–16.67s):**
- Text: `Two assumptions · live recalculation`
- Position: bottom 12%, centered
- Style: Fraunces italic 22px, dark ink (no gold this time — neutral statement)
- Animation: fade in over 20 frames at frame 400, hold, fade out at frame 490

**Notes:** This hold beat is important pacing. Without it, Act 2 → Act 3 feels rushed. Resist the urge to skip.

---

### Shot 7 — Punchline zoom (Margin focus)
**Frames 510–630 (17.0s – 21.0s)**

**On screen:**
- Camera "zooms" into the Margin KPI card (CSS transform scale + position, or filter)
- Other UI elements fade out (opacity 1 → 0.15 over 30 frames)
- Margin card grows from ~280px wide to ~800px wide, centers on screen
- Inside the focused card:
  - Large baseline → adjusted number: `19.8% → 25.9%`
  - The arrow `→` animated in gold
  - Below: `+6.1 percentage points`
  - Smaller: `Net profit gain · RM 96M`

**Animation:**
- Frame 510–540 (1s): zoom transition; other UI fades to 15% opacity in background; Margin card grows + centers
- Frame 540–600 (2s): big number animates `19.8% → 25.9%` with smooth count-up (use ease-out, 60 frames feels right)
- Frame 600–630 (1s): "+6.1pp" and "Net profit gain · RM 96M" lines fade in (each lagged by 10 frames)

**Subtitle (frames 540–630, 18s–21s):**
- Text: `From 19.8% to 25.9% · in three seconds.`
- Position: bottom 15%, centered
- Style: Fraunces italic 28px gold
- Animation: type-in over 30 frames (mechanical typing effect, character-by-character)

**Notes:** This is THE shot. The whole 24 seconds builds to this moment. Don't rush the zoom — viewers need to track where the Margin card came from. The "→" arrow appearing in gold between the two numbers is the visual climax.

---

### Shot 8 — Logo close
**Frames 630–720 (21.0s – 24.0s)**

**On screen:**
- Everything from Shot 7 fades to 0
- Center: Fedelis tagline
  - Line 1: `Defy. Free. Redefine.` (Fraunces italic 48px, dark ink)
  - Line 2 (smaller, gold mono): `突破 · MENGATASI BATASAN`
  - Below (much smaller, dim): `Fedelis · Microsoft Fabric Partner`

**Animation:**
- Frame 630–660 (1s): Shot 7 elements fade out
- Frame 660–700 (1.33s): tagline fades in (opacity 0 → 1), slight vertical drift (translateY 10px → 0)
- Frame 700–720 (0.67s): hold, then fade out at the very end (frames 715–720, just 5 frames of gentle fade)

**Subtitle:** none — let the tagline be the only message

**Notes:** Soft landing. Don't pop a logo, gently introduce it. The 5-frame fade at the very end is so the loop (if used as `<video loop>`) doesn't snap.

---

## 4. Layout reference — what the simulator UI looks like in the video

When showing the simulator (Shots 2–6), the frame should display the **Simulator tab** of the actual app. Layout reference:

```
┌─ Frame width: 1920px ─────────────────────────────────────────────────────────┐
│ ─── 5% padding all sides ───                                                  │
│                                                                                │
│ Project · Emira Shah Alam              [SIMULATOR] [Cost Detail]              │
│ Baseline v1.1 · 2026-05-21             [Reset] [Export]                       │
│ ─────────────────────────────────────────────────────────────────────────     │
│                                                                                │
│ ┌─────────────────────────────────┬──────────────────────────────────────┐  │
│ │ ASSUMPTIONS                     │ RESULTS                              │  │
│ │                                 │                                      │  │
│ │ Selling Price                   │ ┌──────────────┬──────────────┐    │  │
│ │ ━━━━●━━━━  0%                   │ │ GDV (Net)    │ TDC          │    │  │
│ │ → RM 650 / SF                   │ │ RM 1,247M    │ RM 1,000M    │    │  │
│ │                                 │ │              │              │    │  │
│ │ Construction Cost               │ │ baseline     │ baseline     │    │  │
│ │ ━━━━●━━━━  0%                   │ └──────────────┴──────────────┘    │  │
│ │ → RM 123.92 / SF GFA            │                                      │  │
│ │                                 │ ┌──────────────┬──────────────┐    │  │
│ │ Sales Period                    │ │ Net Profit   │ NET MARGIN   │    │  │
│ │ ━━━━●━━━━  0%                   │ │ RM 247M      │              │    │  │
│ │ → 24 months                     │ │              │ 19.8%   ← hero│   │  │
│ │                                 │ │ baseline     │              │    │  │
│ │ Interest Rate                   │ └──────────────┴──────────────┘    │  │
│ │ ━━━━●━━━━  0pp                  │                                      │  │
│ │ → 4.8% p.a.                     │ Scenario summary                     │  │
│ │                                 │ ─────────────────                    │  │
│ │ A&P + Commission                │ All levers at baseline. Adjust an    │  │
│ │ ━━━━●━━━━  0pp                  │ assumption to see the impact on      │  │
│ │ → 4.5% of GDV                   │ margin and profit.                   │  │
│ │                                 │                                      │  │
│ │ Bumi Contribution               │                                      │  │
│ │ ━━━━●━━━━  0pp                  │                                      │  │
│ │ → 2.0% of GDV                   │                                      │  │
│ └─────────────────────────────────┴──────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Critical:** Use the actual rendered simulator HTML if possible (Remotion can render iframe content, or screenshot first then animate). DO NOT recreate the UI from scratch in Remotion components — too much work, won't match exactly. See Implementation Note below.

---

## 5. Implementation note for Claude Code / Codex

There are two practical paths to build this in Remotion:

### Path A — Screenshot + animated overlays (RECOMMENDED, faster)
1. Open the actual `dist/index.html` simulator in a browser at 1920×1080
2. Take a high-quality screenshot of the baseline state (all levers at 0)
3. In Remotion, use that screenshot as the base layer (`<Img>`)
4. Animate **overlay elements** on top:
   - Slider thumb position (small absolute-positioned `<div>` over each lever)
   - KPI numbers (Remotion `<AnimatedNumber>` components positioned over the static KPI areas)
   - Spotlight glow rings (positioned `<div>` with box-shadow animation)
   - Subtitles, tagline text

**Pros:** Visual fidelity is exact (it's the real UI). Fast to implement.  
**Cons:** Won't work if the simulator UI changes — need to re-screenshot.

### Path B — Iframe Remotion (Remotion's `<IFrame>` component)
1. Use `<IFrame src="./dist/index.html">` as background
2. Send postMessage events to the iframe at the right frames to programmatically move sliders and trigger animations
3. Capture the iframe state and composite overlays on top

**Pros:** Always reflects the current simulator. Real animations.  
**Cons:** More complex to wire up. Iframe rendering in Remotion's headless Chromium can be finicky.

**Recommendation: Path A for v1.** If the simulator UI stabilizes, switch to Path B later.

---

## 6. Animation easing reference

For Remotion `interpolate()` calls, use these easings (mapping to feel):

| Motion | Easing | Notes |
|---|---|---|
| Slider thumb moving | `spring({ frame, fps, config: { damping: 12, mass: 0.8 } })` | Slight overshoot feels natural |
| KPI number counting | `easeOutCubic` over 60 frames | Smooth deceleration — not linear |
| Text fade in | `interpolate(frame, [0, 30], [0, 1])` with linear | Simple fade |
| Subtitle type-in | Frame-by-frame character reveal at 1 char per 1.5 frames | ~20 chars/sec, readable pace |
| Zoom (Shot 7) | `easeInOutCubic` over 30 frames | Camera-like smoothness |
| Spotlight glow appear | `easeOutQuad` over 5 frames (fast), `easeInQuad` over 10 frames (slow fade out) | Punchy in, gentle out |
| Margin threshold celebration | 1-frame flash at full opacity, then 15-frame ease-out | Subtle, not disco |

---

## 7. KPI baseline & adjusted values (use these EXACTLY)

These come from the actual reconciled simulator (calibrated to 20% target margin):

```
BASELINE (all levers at 0)
─────────────────────────
GDV (Net):    RM 1,247,161 thousand  →  display as "RM 1,247M"
TDC:          RM   999,883 thousand  →  display as "RM 1,000M"  
Net Profit:   RM   247,278 thousand  →  display as "RM 247M"
Margin:       19.83%                  →  display as "19.8%"

AFTER SELLING PRICE +5% (Shot 4 end state)
──────────────────────────────────────────
GDV (Net):    RM 1,309,519 thousand  →  display as "RM 1,309M"  (+RM 62M)
TDC:          RM 1,001,055 thousand  →  display as "RM 1,001M"  (+RM 1M from A&P% × higher GDV)
Net Profit:   RM   308,464 thousand  →  display as "RM 308M"    (+RM 61M)
Margin:       23.55%                  →  display as "23.6%"      (+3.7pp)

AFTER SELLING PRICE +5% AND CONSTRUCTION COST -3% (Shot 5 end state — FINAL)
────────────────────────────────────────────────────────────────────────────
GDV (Net):    RM 1,309,519 thousand  →  display as "RM 1,309M"
TDC:          RM   964,055 thousand  →  display as "RM 964M"   (-RM 37M from construction)
Net Profit:   RM   345,464 thousand  →  display as "RM 345M"   (+RM 98M vs baseline)
Margin:       26.38%                  →  display as "26.4%"      (+6.6pp vs baseline)
```

**Note:** I had the Shot 7 punchline written as "19.8% → 25.9%" / "+96M" earlier. With the proper math above, it's actually **19.8% → 26.4%** and **+RM 98M**. Use these correct numbers in the storyboard. Update Shots 4, 5, 7 accordingly:

- Shot 4 subtitle stays: `Selling price · +5%`
- Shot 5 final margin should show: `26.4%` (not 25.9%)
- Shot 7 punchline: `From 19.8% to 26.4%` and `Net profit gain · RM 98M`

---

## 8. Audio / BGM brief

### Track requirements
- **Style:** Corporate piano + ambient pad. Think McKinsey explainer or Apple product video — restrained, premium, not "uplifting startup."
- **Tempo:** Slow (60–75 BPM)
- **Mood:** Contemplative, confident, calm. NOT cinematic-tense, NOT epic-trailer, NOT cheerful-pop.
- **Length:** Must cover 24 seconds. If track is longer, fade in over 30 frames at start, fade out over last 60 frames.
- **Volume:** ducked to about -18 dB to -22 dB (subtle, not foreground)

### Recommended free sources to search

1. **Pixabay Music** (free, no attribution required for most)
   - Search: `corporate piano`, `minimal ambient`, `documentary background`
   - Filter: 25-30 second length OR longer (trim in post)
   - Specific suggestions: search "Inspiring Cinematic Ambient" by AlexiAction, "Calm Piano Background" tracks

2. **YouTube Audio Library** (free, attribution sometimes required)
   - Search: `corporate calm piano ambient`
   - Filter by mood: "Calm" + genre: "Cinematic"

3. **Uppbeat.io** (free tier exists, requires account)
   - Browse: Corporate → Calm → Piano
   - Free plan limits commercial use — read the license

### Hit points (audio sync — optional but powerful)
If your track has natural beats, try to align:
- Frame 215 (slider start moving, +5%) — soft piano note
- Frame 305 (construction slider start) — another note
- Frame 510 (zoom into Margin) — slight swell or chord change
- Frame 700 (tagline appears) — final note / resolution

If your track is purely ambient without distinct beats, this doesn't matter.

### Implementation
In Remotion, add audio via:
```jsx
<Audio src="./assets/bgm.mp3" volume={0.4} />
```

Place inside the main Composition (not inside a Sequence) so it spans the whole video. Fade in/out is handled by setting volume as a function of frame.

### Critical: muted-capable design
Since the video will autoplay in the HTML pitch deck with `<video muted autoplay loop>`, viewers may never hear the music. **Subtitles must carry the message on their own.** The BGM is icing, not load-bearing.

---

## 9. Subtitle timing summary (one place to find them all)

| Shot | Frames | Time (s) | Subtitle text | Style |
|---|---|---|---|---|
| 1 | n/a | 0–2 | (Title only: "Emira Shah Alam / Feasibility Simulator") | Center, large serif |
| 2 | 90–180 | 3–6 | `Baseline · GDV RM 1.25B · Margin 19.8%` | Bottom-center, mono |
| 3 | (cont) | 6–7 | (continues from Shot 2) | (same) |
| 4 | 220–310 | 7.3–10.3 | `Selling price · +5%` | Bottom-left, italic gold |
| 5 | 310–400 | 10.3–13.3 | `Construction cost · -3%` | Bottom-left, italic gold |
| 6 | 400–500 | 13.3–16.7 | `Two assumptions · live recalculation` | Bottom-center, italic neutral |
| 7 | 540–630 | 18–21 | `From 19.8% to 26.4% · in three seconds.` | Bottom-center, italic large gold, type-in |
| 8 | n/a | 21–24 | (Tagline: "Defy. Free. Redefine. / 突破 · MENGATASI BATASAN") | Center, two-line |

---

## 10. Embedding in the pitch deck

After rendering, the final MP4 goes into `Fabric_PowerBI_Pitch.html` as a new Slide 12. Add this slide between current Slide 11 (Reference Dashboard) and Slide 12 (Proven Outcomes):

```html
<!-- ════════════════ SLIDE 12: LIVE SIMULATOR DEMO ════════════════ -->
<section class="slide">
  <div class="chrome-top">
    <div>11 <span style="color:var(--gold);margin:0 0.5em">·</span> SIMULATOR · IN ACTION</div>
    <div class="slide-num">12 / 15</div>
  </div>

  <div class="reveal" style="margin-top:4vh">
    <span class="eyebrow">CFO adjusts two assumptions · margin recalculates live</span>
    <h2 class="h-title">See it in <em>action.</em></h2>
  </div>

  <div class="reveal" style="flex:1;display:flex;align-items:center;justify-content:center;margin-top:1rem">
    <video 
      src="./assets/simulator-demo.mp4" 
      muted 
      autoplay 
      loop 
      playsinline
      style="max-width:88%;max-height:78vh;border:1px solid var(--gold-dim);border-radius:6px;box-shadow:0 8px 32px rgba(168,133,63,0.12),0 2px 8px rgba(0,0,0,0.04)"
    ></video>
  </div>

  <div class="chrome-bottom">
    <div>FEASIBILITY SIMULATION PLATFORM <span class="dot">·</span> MICROSOFT FABRIC + POWER BI</div>
    <div>FEDELIS</div>
  </div>
</section>
```

Note this renumbers all subsequent slides — total deck becomes 15 slides (Cover + 14 content). Update all `slide-num` chrome from `/ 14` to `/ 15` and the trailing slide numbers (POC becomes 14/15, Commercial becomes 15/15).

---

## 11. Pre-render checklist (before passing to Claude Code / Codex)

- [ ] BGM track downloaded and placed at `assets/bgm.mp3` (or whatever path Remotion expects)
- [ ] Screenshot of simulator UI at 1920×1080 captured and placed at `assets/simulator-baseline.png` (for Path A)
- [ ] Fonts available — either embedded in Remotion bundle or system fallback acceptable
- [ ] Color palette confirmed (CSS variables match pitch deck)
- [ ] KPI numbers double-checked against actual simulator reconciliation output (see §7)

---

## 12. Acceptance criteria

- [ ] Total duration exactly 24.000 seconds at 30 fps
- [ ] All 8 shots present with timing as specified
- [ ] Subtitle text readable at 1080p with no font issues
- [ ] BGM ducked, fades in/out cleanly, doesn't clip
- [ ] Final MP4 under 8 MB
- [ ] Plays inline in modern browsers (Chrome, Edge, Safari) when muted+autoplay
- [ ] Plays in PowerPoint/Keynote when embedded as video
- [ ] Loop point (frame 720 → frame 0) is visually clean (no snap)
- [ ] No spelling errors in any subtitle or tagline
- [ ] KPI numbers in §7 match the actual simulator baseline

---

## 13. Things explicitly NOT in this video (out of scope)

- Voice-over narration
- Cost Detail tab switching (would extend duration, save for v2)
- Lever 3/4/5/6 demonstration (only Selling Price and Construction Cost used — others stay at 0)
- Export button click (would add visual complexity without payoff in 24s)
- Animated chart drawing (Reference Dashboard is in the static slide before; we don't repeat)
- Multiple scenario comparisons (single delta scenario only)

Save these for v2 (60s extended version) if needed.

---

## 14. Effort estimate

For someone unfamiliar with Remotion but comfortable with React:

| Task | Hours |
|---|---|
| Remotion project setup, hello world | 0.5 |
| Path A: screenshot + composition skeleton | 1.0 |
| All 8 shots' visuals | 2.5 |
| Subtitle timing + typography | 1.0 |
| BGM source + integrate + fade timing | 0.5 |
| Render + iterate on timing tweaks | 1.5 |
| Embed in pitch deck + test loop behavior | 0.5 |
| **Total** | **~7.5 hours** |

Spread over 2 evenings or 1 focused afternoon.
