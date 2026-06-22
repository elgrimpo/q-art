import warnings; warnings.filterwarnings("ignore")
from pathlib import Path
from html import escape
from PIL import Image
import decoders, structural_score as ss

SAMPLES = Path("samples")
THUMBS = Path("gallery_thumbs"); THUMBS.mkdir(exist_ok=True)
files = sorted(p for p in SAMPLES.iterdir()
               if p.suffix.lower() in {".png",".jpg",".jpeg",".webp"}
               and not p.name.startswith("Screenshot"))

def band_color(s):
    if s <= 0:  return "#9ca3af"
    if s < 40:  return "#ef4444"
    if s < 60:  return "#f59e0b"
    if s < 70:  return "#eab308"
    if s < 80:  return "#84cc16"
    return "#22c55e"

scored, undecodable = [], []
for i, p in enumerate(files, 1):
    with Image.open(p) as im:
        im.load()
        url = decoders.decode_text(im)
        tname = p.stem + ".jpg"
        if not (THUMBS / tname).exists():
            t = im.convert("RGB"); t.thumbnail((340,340), Image.LANCZOS)
            t.save(THUMBS / tname, "JPEG", quality=82)
        if not url:
            undecodable.append((p.name, tname)); continue
        r = ss.structural_score(im, url)
    scored.append((r, url, p.name, tname))
    print(f"  {i}/{len(files)} {p.name} -> {r.score}")

scored.sort(key=lambda x: x[0].score, reverse=True)

def card(rank, r, url, name, tname):
    col = band_color(r.score)
    return f"""
    <figure>
      <div class="rank">#{rank}</div>
      <div class="score" style="color:{col}">{r.score}</div>
      <img src="gallery_thumbs/{tname}" loading="lazy">
      <figcaption>
        <span class="url">{escape(url)}</span>
        <div class="bars">
          <div class="bar"><span>finder</span><b style="width:{r.finder*100:.0f}%"></b><i>{r.finder:.2f}</i></div>
          <div class="bar"><span>contrast</span><b style="width:{r.contrast*100:.0f}%"></b><i>{r.contrast:.2f}</i></div>
          <div class="bar"><span>margin</span><b style="width:{r.margin*100:.0f}%"></b><i>{r.margin:.2f}</i></div>
        </div>
        <span class="detail">min size {r.min_modules} px/module &nbsp;·&nbsp; grid {r.n}×{r.n}</span>
      </figcaption>
    </figure>"""

cards = "".join(card(i, *row) for i, row in enumerate(scored, 1))
undec = "".join(f'<figure class="dead"><img src="gallery_thumbs/{t}" loading="lazy"><figcaption>{escape(n)}</figcaption></figure>' for n,t in undecodable)

html = f"""<!doctype html><meta charset=utf-8>
<title>Q-Art structural scannability — ranked</title>
<style>
 body{{font-family:-apple-system,system-ui,sans-serif;margin:24px;background:#0f1115;color:#e5e7eb}}
 h1{{font-size:22px;margin:0 0 4px}} h2{{font-size:15px;color:#9ca3af;margin:28px 0 10px;font-weight:600}}
 .sub{{color:#9ca3af;margin:0;font-size:13px;max-width:780px;line-height:1.5}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px;margin-top:18px}}
 figure{{margin:0;background:#1a1d24;border:1px solid #2a2f3a;border-radius:12px;padding:12px;position:relative}}
 figure img{{width:100%;border-radius:8px;display:block;background:#000}}
 .rank{{position:absolute;top:8px;left:8px;background:#000a;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:20px}}
 .score{{font-size:30px;font-weight:800;text-align:right;line-height:1;margin-bottom:8px}}
 figcaption{{margin-top:8px;font-size:12px;word-break:break-all}}
 .url{{color:#93c5fd}}
 .bars{{margin:8px 0 6px}}
 .bar{{display:flex;align-items:center;gap:6px;font-size:10px;color:#8b93a1;margin:2px 0}}
 .bar span{{width:50px;flex:none}} .bar i{{width:28px;flex:none;text-align:right;font-style:normal}}
 .bar b{{height:6px;background:#3b82f6;border-radius:3px;display:inline-block;min-width:1px}}
 .bar:nth-child(1) b{{background:#22c55e}} .bar:nth-child(2) b{{background:#eab308}} .bar:nth-child(3) b{{background:#f97316}}
 .detail{{color:#6b7280;font-size:10px}}
 .dead{{opacity:.6}} .dead figcaption{{color:#6b7280;font-size:11px}}
</style>
<h1>Q-Art structural scannability — ranked</h1>
<p class="sub">{len(scored)} codes scored by the decoder-independent structural metric (finder integrity ·45 + contrast ·25 + ECC margin ·30), highest first. Bars show each sub-metric 0–1. Scroll down: do the low-scored codes actually look harder to scan?</p>
<div class="grid">{cards}</div>
<h2>Couldn't recover payload offline ({len(undecodable)}) — in production these are scored from the known URL</h2>
<div class="grid">{undec}</div>"""
Path("scores_structural_gallery.html").write_text(html)
print(f"\nWROTE scores_structural_gallery.html — {len(scored)} scored, {len(undecodable)} undecodable")
