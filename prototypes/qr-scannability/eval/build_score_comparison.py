"""Build a self-contained HTML comparing, per rated image: Christoph's 1-5
assessment, the OLD (v1) stored score, and the NEW (v2) recomputed score —
sorted by the biggest |old - v2| gap. A validation view before re-backfilling
production scores with v2.

Run: cd prototypes/qr-scannability && ./venv/bin/python eval/build_score_comparison.py
Uses the cached eval images (eval/_imgcache/) and eval/rated_with_payload.json
(which carries the old score as `algo_score`). Writes eval/score_comparison.html.
"""
import json, os, sys, io, urllib.request, time
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import structural_score as ss

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "_imgcache")
OUT = os.path.join(HERE, "score_comparison.html")


def load_img(row):
    p = os.path.join(CACHE, row["image_id"] + ".png")
    if os.path.exists(p) and os.path.getsize(p) > 100:
        try:
            return Image.open(p).convert("RGB")
        except Exception:
            pass
    for attempt in range(4):
        try:
            req = urllib.request.Request(row["image_url"], headers={"User-Agent": "M"})
            b = urllib.request.urlopen(req, timeout=60).read()
            img = Image.open(io.BytesIO(b)); img.load(); img = img.convert("RGB")
            img.save(p)
            return img
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None


def main():
    rated = json.load(open(os.path.join(HERE, "rated_with_payload.json")))
    # decoder ground truth (Apple Vision / WeChat / zxing battery), for spotting
    # where v2 disagrees with what a real decoder actually reads.
    decodes = {x["image_id"]: bool(x.get("decodable"))
               for x in json.load(open(os.path.join(HERE, "decode_results.json")))}
    rows = []
    for i, r in enumerate(rated):
        img = load_img(r)
        if img is None:
            continue
        try:
            v2 = ss.structural_score(img, r["content"]).score
        except Exception:
            continue
        old = r.get("algo_score")
        rows.append({
            "image_id": r["image_id"],
            "image_url": r["image_url"],
            "my_rating": r["my_rating"],
            "old": round(old, 1) if old is not None else None,
            "v2": round(v2, 1),
            "diff": round(v2 - (old if old is not None else 0), 1),
            "decodes": decodes.get(r["image_id"]),
            "prompt": (r.get("prompt") or "").strip(),
        })
        if (i + 1) % 25 == 0:
            print(f"  {i+1}/{len(rated)} scored", flush=True)

    rows.sort(key=lambda x: -abs(x["diff"]))
    mean_abs = round(sum(abs(x["diff"]) for x in rows) / len(rows), 1) if rows else 0
    up = sum(1 for x in rows if x["diff"] > 0)
    down = sum(1 for x in rows if x["diff"] < 0)
    # v2 "false zeros": scores very low yet a real decoder reads it (known limit
    # on heavily-stylized codes — see memory qr-scannability-decoder-rebuild).
    mismatch = sum(1 for x in rows if x["v2"] < 10 and x["decodes"])

    html = TEMPLATE.format(
        total=len(rows), mean_abs=mean_abs, up=up, down=down, mismatch=mismatch,
        data_json=json.dumps(rows),
    )
    open(OUT, "w", encoding="utf-8").write(html)
    print(f"\nWrote {len(rows)} rows to {OUT}  (mean |Δ|={mean_abs}, v2 higher: {up}, v2 lower: {down})")


TEMPLATE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scannability: old vs v2 vs your rating</title>
<style>
  :root {{ color-scheme: light dark; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#f4f4f5; color:#18181b; }}
  header {{ position:sticky; top:0; z-index:10; background:#fff; border-bottom:1px solid #e4e4e7; padding:12px 20px; box-shadow:0 1px 3px rgba(0,0,0,.06); }}
  header h1 {{ font-size:16px; margin:0 0 6px; font-weight:600; }}
  .stats {{ font-size:13px; color:#52525b; display:flex; gap:18px; flex-wrap:wrap; align-items:center; }}
  .stats b {{ color:#18181b; font-variant-numeric:tabular-nums; }}
  .sorts {{ margin-left:auto; display:flex; gap:6px; }}
  button {{ font:inherit; cursor:pointer; border:1px solid #d4d4d8; background:#fff; border-radius:8px; padding:5px 10px; font-size:13px; }}
  button.active {{ background:#18181b; color:#fff; border-color:#18181b; }}
  main {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:18px; padding:20px; max-width:1500px; margin:0 auto; }}
  .card {{ background:#fff; border:1px solid #e4e4e7; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; }}
  .img-wrap {{ position:relative; aspect-ratio:1/1; background:#fafafa; }}
  .img-wrap img {{ width:100%; height:100%; object-fit:contain; display:block; }}
  .img-wrap .missing {{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#a1a1aa; font-size:13px; }}
  .delta {{ position:absolute; top:8px; right:8px; padding:4px 10px; border-radius:999px; font-size:13px; font-weight:600; font-variant-numeric:tabular-nums; color:#fff; }}
  .body {{ padding:10px 12px 12px; display:flex; flex-direction:column; gap:8px; }}
  .scores {{ display:grid; grid-template-columns:repeat(3,1fr); gap:6px; text-align:center; }}
  .scores .cell {{ background:#f4f4f5; border-radius:8px; padding:6px 4px; }}
  .scores .lbl {{ font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:#a1a1aa; }}
  .scores .val {{ font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; }}
  .you .val {{ color:#2563eb; }}
  .prompt {{ font-size:11px; color:#71717a; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }}
  .card.disagree {{ border:2px solid #f59e0b; }}
  .meta {{ display:flex; gap:8px; align-items:center; min-height:18px; }}
  .scans {{ font-size:11px; padding:2px 8px; border-radius:999px; font-weight:600; }}
  .scans.yes {{ background:#dcfce7; color:#166534; }}
  .scans.no {{ background:#f1f5f9; color:#64748b; }}
  .flag {{ font-size:10px; color:#b45309; font-weight:600; text-transform:uppercase; letter-spacing:.03em; }}
</style></head><body>
<header>
  <h1>Scannability — your rating vs old (v1) vs new (v2)</h1>
  <div class="stats">
    <span><b>{total}</b> rated images</span>
    <span>mean |Δ old→v2|: <b>{mean_abs}</b></span>
    <span>v2 higher: <b>{up}</b></span>
    <span>v2 lower: <b>{down}</b></span>
    <span title="v2 scores under 10 but a real decoder reads it — the known stylized-code limit">v2&lt;10 yet scans: <b>{mismatch}</b></span>
    <span class="sorts">
      <button data-sort="absdiff" class="active">|Δ| biggest</button>
      <button data-sort="mismatch">v2 misses (scans but v2&lt;10)</button>
      <button data-sort="rating">your rating</button>
      <button data-sort="old">old score</button>
      <button data-sort="v2">v2 score</button>
    </span>
  </div>
</header>
<main id="grid"></main>
<script>
  const DATA = {data_json};
  const grid = document.getElementById("grid");
  const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
  function deltaColor(d) {{
    if (d > 0) return "#16a34a";        // v2 higher → green
    if (d < 0) return "#dc2626";        // v2 lower → red
    return "#71717a";
  }}
  function render(rows) {{
    grid.innerHTML = "";
    for (const r of rows) {{
      const card = document.createElement("div");
      const disagree = r.v2 < 10 && r.decodes === true;   // v2 says "no" but it scans
      card.className = "card" + (disagree ? " disagree" : "");
      const sign = r.diff > 0 ? "+" : "";
      const scans = r.decodes === true
        ? '<span class="scans yes">scans \\u2713</span>'
        : (r.decodes === false ? '<span class="scans no">no scan</span>' : '');
      card.innerHTML =
        '<div class="img-wrap">' +
          '<img loading="lazy" src="' + r.image_url + '" alt="" ' +
            'onerror="this.parentNode.innerHTML=\\'<div class=&quot;missing&quot;>image unavailable</div>\\'">' +
          '<span class="delta" style="background:' + deltaColor(r.diff) + '">Δ ' + sign + r.diff + '</span>' +
        '</div>' +
        '<div class="body">' +
          '<div class="scores">' +
            '<div class="cell you"><div class="lbl">you</div><div class="val">' + stars(r.my_rating) + '</div></div>' +
            '<div class="cell"><div class="lbl">old</div><div class="val">' + (r.old==null?"—":r.old) + '</div></div>' +
            '<div class="cell"><div class="lbl">v2</div><div class="val">' + r.v2 + '</div></div>' +
          '</div>' +
          '<div class="meta">' + scans +
            (disagree ? '<span class="flag">v2 misses this</span>' : '') +
          '</div>' +
          '<div class="prompt">' + (r.prompt ? r.prompt.replace(/</g,"&lt;") : "(no prompt)") + '</div>' +
        '</div>';
      grid.appendChild(card);
    }}
  }}
  const missScore = r => (r.v2 < 10 && r.decodes === true) ? 1 : 0;
  const sorters = {{
    absdiff:  (a,b) => Math.abs(b.diff)-Math.abs(a.diff),
    mismatch: (a,b) => missScore(b)-missScore(a) || a.v2-b.v2,
    rating:   (a,b) => a.my_rating-b.my_rating || Math.abs(b.diff)-Math.abs(a.diff),
    old:      (a,b) => (a.old??0)-(b.old??0),
    v2:       (a,b) => a.v2-b.v2,
  }};
  document.querySelectorAll("[data-sort]").forEach(btn => btn.addEventListener("click", () => {{
    document.querySelectorAll("[data-sort]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render([...DATA].sort(sorters[btn.dataset.sort]));
  }}));
  render([...DATA].sort(sorters.absdiff));
</script>
</body></html>
"""


if __name__ == "__main__":
    main()
