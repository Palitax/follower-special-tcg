# Whatnot 9:16 Mobile Live Stream UI Layout Reference

Learned from live Whatnot iPhone portrait screenshot (470 × 1024, ~19.5:9 viewport over 1080 × 1920 9:16 OBS stream).
Use these normalized screen coordinates (`0–100%`) as default anchor positions and safe-zone guides for Whatnot overlays:

## Native Whatnot UI Zones (rendered by Whatnot app ON TOP of OBS video)
1. **Top Status Bar & Header (`y: 0% – 12.5%`)**
   - **Host Avatar / Logo (circular):** Center `x ≈ 7.8%`, `y ≈ 9.3%`, diameter `≈ 8.0%` of width (`~86px` on `1080w`). Highlight halos sit directly behind it at `~122px` diameter.
   - **Host Handle & Rating (`manacards_de · 5.0 · <1d`):** `x: 13% – 41%`, `y: 7.2% – 11.5%`.
   - **Viewer Count & Collapse Chevron:** `x: 74% – 96%`, `y: 7.5% – 11.2%`.

2. **Upper Promo / Ticker Band (`y: 12.5% – 18.5%`)**
   - Clean open horizontal strip across the full width — ideal for the Horizontal Ticker or Social Rotator.

3. **Giveaway & Buyer Quest Row (`y: 19% – 28%`)**
   - **Left Quest / KGA Zone:** `x: 3% – 28%`, `y: 19.5% – 26%` (`Etwas kaufen`) and `y: 27% – 41%` (KGA ETB Showcase).
   - **Right Giveaway Card (rounded left-pill attached to right edge):** `x: 72.8% – 100%`, `y: 19.3% – 27.8%` (center `x ≈ 86.4%`, `y ≈ 23.5%`, width `≈ 27.2%`, height `≈ 8.5%`).

4. **Main Playmat / Pack-Opening Safe Zone (`y: 28% – 62%`)**
   - Center camera stage with minimal native UI obstruction.

5. **Right Action Rail (`x: 85% – 99%`, `y: 52% – 92%`)**
   - Vertical stack of circular/icon buttons: `Mehr` (`~54%`), `Clip` (`~60%`), `Watchlist` (`~67%`), `Teilen` (`~74%`), `Wallet` (`~80%`).
   - **Shop Button (circular with `Shop` label below):** Center `x ≈ 92.2%`, `y ≈ 87.5%`, circle diameter `≈ 10.8%` of width (`~116px` on `1080w`).

6. **Bottom Chat & Bid Input Zone (`y: 64% – 93%`)**
   - **Live Chat Stream:** `x: 3% – 62%`, `y: 64% – 85%`.
   - **Chat Input (`Schreibe etwas ...`) & Bid/Wave Icon:** `x: 3% – 78%`, `y: 86.5% – 91.5%`.
   - Keep Shop callout text badges slightly above-left of the Shop circle (`offsetX ≈ -260px`, `offsetY ≈ -85px` on 1080×1920) or configurable via free X/Y sliders so they never overlap chat messages.

## Calibration Rule
Because iOS and Android devices have slightly different aspect ratios (19.5:9 vs 16:9) and crop horizontal edges differently, EVERY Whatnot HUD highlight MUST expose free X (%), Y (%), Size/Width/Height sliders and optional single-element OBS URLs (`?only=shop`, `?only=giveaway`, `?only=avatar`).
