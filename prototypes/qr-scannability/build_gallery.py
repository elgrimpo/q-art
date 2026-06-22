import warnings; warnings.filterwarnings("ignore")
from pathlib import Path
from html import escape
from PIL import Image
import scorer

SAMPLES = Path("samples")
THUMBS = Path("gallery_thumbs"); THUMBS.mkdir(exist_ok=True)
files = sorted(p for p in SAMPLES.iterdir()
               if p.suffix.lower() in {".png",".jpg",".jpeg",".webp"}
               and not p.name.startswith("Screenshot"))

def band_color(score):
    if score <= 0:   return "#9ca3af"   # Won't scan — gray
    if score < 40:   return "#ef4444"   # Risky — red
    if score < 60:   return "#f59e0b"   # Fragile — amber
    if score < 80:   return "#84cc16"   # Good — lime
    return "#22c55e"                     # Excellent — green

results = []
for i, p in enumerate(files, 1):
    with Image.open(p) as im:
        im.load()
        res = scorer.score_image(im, p.name)
        t = im.convert("RGB"); t.thumbnail((340, 340), Image.LANCZOS)
        tname = p.stem + ".jpg"
        t.save(THUMBS / tname, "JPEG", quality=82)
    results.append((res, tname))
    print(f"  scored {i}/{len(files)}: {p.name} -> {res.score}")

results.sort(key=lambda r: r[0].score, reverse=True)

# distribution
import collections
dist = collections.Counter()
for res, _ in results:
    dist[res.band] += 1
order = ["Excellent","Good","Fragile (scans slowly)","Risky","Won't scan"]
legend = " &nbsp;·&nbsp; ".join(f"<b>{escape(b)}</b>: {dist.get(b,0)}" for b in order)

cards = []
for rank, (res, tname) in enumerate(results, 1):
    col = band_color(res.score)
    url = escape(res.decoded_url) if res.decoded_url else "<i>could not decode</i>"
    if res.decoded_url:
        mb = res.method_b
        ma = "n/a" if res.method_a is None else f"{res.method_a}%"
        read_by = ", ".join(k for k,v in res.baseline_decoders.items() if v) or "none"
        detail = f"Method B {mb} &nbsp;·&nbsp; EC margin {ma} &nbsp;·&nbsp; read by {escape(read_by)}"
    else:
        detail = "&nbsp;"
    cards.append(f"""
    <figure>
      <div class="rank">#{rank}</div>
      <div class="score" style="color:{col}">{res.score}</div>
      <div class="band" style="background:{col}">{escape(res.band)}</div>
      <img src="gallery_thumbs/{tname}" loading="lazy">
      <figcaption><span class="url">{url}</span><br><span class="detail">{detail}</span></figcaption>
    </figure>""")

html = f"""<!doctype html><meta charset=utf-8>
<title>Q-Art scannability — ranked</title>
<style>
 body{{font-family:-apple-system,system-ui,sans-serif;margin:24px;background:#0f1115;color:#e5e7eb}}
 h1{{font-size:22px;margin:0 0 4px}} .sub{{color:#9ca3af;margin:0 0 4px;font-size:13px}}
 .legend{{color:#cbd5e1;font-size:13px;margin:10px 0 22px}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}}
 figure{{margin:0;background:#1a1d24;border:1px solid #2a2f3a;border-radius:12px;padding:12px;position:relative}}
 figure img{{width:100%;border-radius:8px;display:block;background:#000}}
 .rank{{position:absolute;top:8px;left:8px;background:#000a;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:20px}}
 .score{{font-size:30px;font-weight:800;text-align:right;line-height:1}}
 .band{{display:inline-block;color:#06240f;font-weight:700;font-size:11px;padding:2px 8px;border-radius:20px;margin:4px 0 10px;float:right;clear:both}}
 figcaption{{margin-top:10px;font-size:12px;word-break:break-all}}
 .url{{color:#93c5fd}} .detail{{color:#8b93a1;font-size:11px}}
</style>
<h1>Q-Art scannability — ranked</h1>
<p class="sub">{len(results)} codes, highest score first. Decoder battery: Apple Vision → WeChat → zxing.</p>
<p class="legend">{legend}</p>
<div class="grid">{''.join(cards)}</div>"""
Path("scores_gallery.html").write_text(html)
print(f"\nWROTE scores_gallery.html ({len(results)} cards)")
for b in order: print(f"  {b:24s} {dist.get(b,0)}")
