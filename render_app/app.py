import os
import re
import tempfile
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, PlainTextResponse
from faster_whisper import WhisperModel

app = FastAPI(title="Lyrics Sync")
MODEL_SIZE = os.getenv("WHISPER_MODEL", "tiny")
_model = None


def get_model():
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    return _model


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9åäö]+", " ", text).strip()


def srt_time(seconds: float) -> str:
    ms = max(0, round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def align_lines(lines, words):
    if not words:
        raise ValueError("Whisper hittade inga ord i ljudfilen.")

    tokens = [norm(w[0]) for w in words]
    result = []
    cursor = 0

    for i, line in enumerate(lines):
        target = norm(line).split()
        if not target:
            continue

        expected = max(1, len(target))
        best = None
        search_end = min(len(words), cursor + max(45, expected * 8))

        for start in range(cursor, search_end):
            for length in range(max(1, expected - 3), min(expected + 6, len(words) - start) + 1):
                candidate = " ".join(tokens[start:start + length])
                score = SequenceMatcher(None, " ".join(target), candidate).ratio()
                distance_penalty = (start - cursor) * 0.002
                score -= distance_penalty
                if best is None or score > best[0]:
                    best = (score, start, start + length - 1)

        if best is None:
            start_idx = min(cursor, len(words) - 1)
            end_idx = min(len(words) - 1, start_idx + expected - 1)
        else:
            _, start_idx, end_idx = best

        start = words[start_idx][1]
        end = words[end_idx][2]
        if end <= start:
            end = start + 0.8

        result.append((line, start, end))
        cursor = min(len(words), end_idx + 1)

    # Avoid overlaps and give the final line a little breathing room.
    cleaned = []
    for i, (line, start, end) in enumerate(result):
        if cleaned:
            prev_line, prev_start, prev_end = cleaned[-1]
            if start < prev_end:
                boundary = max(prev_start + 0.25, (start + prev_end) / 2)
                cleaned[-1] = (prev_line, prev_start, boundary)
                start = boundary
        if i + 1 < len(result):
            end = min(end, result[i + 1][1])
        cleaned.append((line, start, max(start + 0.35, end)))
    return cleaned


HTML = r'''<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Lyrics Sync</title><style>
:root{color-scheme:dark;--bg:#09111f;--card:#131e31;--line:#334155;--text:#f8fafc;--muted:#a7b4c7;--accent:#22c55e}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#07101e,#111827);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);min-height:100vh}
main{max-width:720px;margin:auto;padding:18px}h1{font-size:28px;margin:12px 0 4px}.sub{color:var(--muted);margin:0 0 18px}.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;margin-bottom:14px}
label{display:block;color:var(--muted);font-size:13px;margin:10px 0 6px}input,textarea,button,select{width:100%;font:inherit;color:var(--text);background:#1c2940;border:1px solid var(--line);border-radius:12px;padding:13px}textarea{min-height:250px;line-height:1.45;resize:vertical}button{background:var(--accent);color:#052e16;border:0;font-weight:800;margin-top:14px}button:disabled{opacity:.55}.status{white-space:pre-wrap;color:#d5deea;background:#0d1728;padding:12px;border-radius:12px;margin-top:12px;min-height:46px}.small{font-size:12px;color:var(--muted);line-height:1.45}.download{display:none;text-decoration:none;text-align:center;background:#2563eb;color:white;padding:13px;border-radius:12px;font-weight:700;margin-top:10px}
</style></head><body><main><h1>Lyrics Sync</h1><p class="sub">MP3/WAV + färdig text → synkroniserad SRT</p>
<div class="card"><form id="form"><label>Ljudfil</label><input id="audio" name="audio" type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" required>
<label>Språk</label><select id="language" name="language"><option value="sv">Svenska</option><option value="en">Engelska</option><option value="de">Tyska</option><option value="fr">Franska</option><option value="es">Spanska</option></select>
<label>Sångtext – en textrad per undertextrad</label><textarea id="lyrics" name="lyrics" placeholder="Triangel.&#10;Triangel.&#10;En triangel har tre sidor." required></textarea>
<button id="run" type="submit">Synkronisera texten</button></form><div id="status" class="status">Klar att starta.</div><a id="download" class="download">Ladda ner SRT</a></div>
<div class="card small">Första körningen kan ta några minuter eftersom servern hämtar Whisper-modellen. Telefonen kör inte AI-modellen och ska därför inte krascha.</div>
<script>
const form=document.getElementById('form'), status=document.getElementById('status'), btn=document.getElementById('run'), link=document.getElementById('download');
form.addEventListener('submit',async e=>{e.preventDefault();link.style.display='none';btn.disabled=true;status.textContent='Laddar upp och analyserar ljudet…\nFörsta körningen kan ta längre tid.';
try{const fd=new FormData(form);const r=await fetch('/sync',{method:'POST',body:fd});const text=await r.text();if(!r.ok)throw new Error(text);const blob=new Blob([text],{type:'application/x-subrip'});link.href=URL.createObjectURL(blob);link.download=(document.getElementById('audio').files[0]?.name||'lyrics').replace(/\.[^.]+$/,'')+'.srt';link.style.display='block';status.textContent='Klart! SRT-filen är skapad.';}catch(err){status.textContent='Fel: '+err.message;}finally{btn.disabled=false;}});
</script></main></body></html>'''


@app.get("/", response_class=HTMLResponse)
def home():
    return HTML


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/sync", response_class=PlainTextResponse)
async def sync(audio: UploadFile = File(...), lyrics: str = Form(...), language: str = Form("sv")):
    lines = [line.strip() for line in lyrics.splitlines() if line.strip()]
    if not lines:
        return PlainTextResponse("Ingen sångtext angavs.", status_code=400)

    suffix = Path(audio.filename or "audio.mp3").suffix.lower()
    if suffix not in {".mp3", ".wav", ".m4a", ".mp4", ".aac"}:
        return PlainTextResponse("Filtypen stöds inte. Använd MP3 eller WAV.", status_code=400)

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            while chunk := await audio.read(1024 * 1024):
                tmp.write(chunk)

        segments, _ = get_model().transcribe(
            tmp_path,
            language=language,
            beam_size=3,
            word_timestamps=True,
            vad_filter=True,
            initial_prompt=" ".join(lines)[:1200],
        )

        words = []
        for segment in segments:
            for word in segment.words or []:
                token = word.word.strip()
                if token:
                    words.append((token, float(word.start), float(word.end)))

        aligned = align_lines(lines, words)
        blocks = []
        for idx, (line, start, end) in enumerate(aligned, 1):
            blocks.append(f"{idx}\n{srt_time(start)} --> {srt_time(end)}\n{line}\n")
        return "\n".join(blocks)
    except Exception as exc:
        return PlainTextResponse(f"Analysen misslyckades: {exc}", status_code=500)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
