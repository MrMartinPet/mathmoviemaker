import os
import re
import tempfile
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from faster_whisper import WhisperModel

app = FastAPI(title="Lyrics Sync")
MODEL_SIZE = os.getenv("WHISPER_MODEL", "tiny")
_model = None


def get_model():
    global _model
    if _model is None:
        print(f"Loading Whisper model: {MODEL_SIZE}", flush=True)
        _model = WhisperModel(
            MODEL_SIZE,
            device="cpu",
            compute_type="int8",
            cpu_threads=1,
            num_workers=1,
            download_root="/tmp/whisper-models",
        )
        print("Whisper model loaded", flush=True)
    return _model


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def find_line_anchors(lines, words):
    tokens = [norm(w[0]) for w in words]
    anchors = [None] * len(lines)
    cursor = 0

    for line_index, line in enumerate(lines):
        target_words = norm(line).split()
        if not target_words or cursor >= len(words):
            continue

        expected = max(1, len(target_words))
        target = " ".join(target_words)
        best = None
        search_end = min(len(words), cursor + max(90, expected * 16))

        for start in range(cursor, search_end):
            min_len = max(1, expected - 4)
            max_len = min(len(words) - start, expected + 8)
            for length in range(min_len, max_len + 1):
                candidate = " ".join(tokens[start:start + length])
                lexical = SequenceMatcher(None, target, candidate).ratio()
                position_penalty = min(0.16, (start - cursor) * 0.0015)
                length_penalty = abs(length - expected) * 0.012
                score = lexical - position_penalty - length_penalty
                if best is None or score > best[0]:
                    best = (score, start, start + length - 1)

        if best and best[0] >= 0.40:
            _, start_idx, end_idx = best
            anchors[line_index] = {
                "start": float(words[start_idx][1]),
                "end": float(words[end_idx][2]),
                "score": round(float(best[0]), 3),
            }
            cursor = end_idx + 1

    return anchors


def distribute_block(lines, start_index, end_index, block_start, block_end):
    count = end_index - start_index
    if count <= 0:
        return []

    minimum_total = count * 0.55
    block_end = max(block_end, block_start + minimum_total)
    weights = [max(1, len(norm(lines[i]).split())) for i in range(start_index, end_index)]
    total_weight = sum(weights)
    gap = 0.08
    usable = max(count * 0.35, (block_end - block_start) - gap * max(0, count - 1))

    result = []
    cursor = block_start
    for offset, weight in enumerate(weights):
        duration = max(0.35, usable * weight / total_weight)
        cue_end = cursor + duration
        if offset == len(weights) - 1:
            cue_end = block_end
        result.append((cursor, max(cursor + 0.35, cue_end)))
        cursor = cue_end + gap
    return result


def align_lines(lines, words, audio_duration):
    if not words:
        raise ValueError("Whisper hittade inga ord i ljudfilen.")

    anchors = find_line_anchors(lines, words)
    cues = [None] * len(lines)
    matched = [i for i, anchor in enumerate(anchors) if anchor]

    if not matched:
        timings = distribute_block(lines, 0, len(lines), 0.0, max(audio_duration, 1.0))
        return [
            {"text": line, "start": round(start, 3), "end": round(end, 3), "matched": False}
            for line, (start, end) in zip(lines, timings)
        ]

    for i in matched:
        anchor = anchors[i]
        cues[i] = (anchor["start"], max(anchor["start"] + 0.35, anchor["end"]), True)

    first = matched[0]
    if first > 0:
        block_end = max(0.6, cues[first][0] - 0.12)
        for idx, timing in enumerate(distribute_block(lines, 0, first, 0.0, block_end)):
            cues[idx] = (*timing, False)

    for left, right in zip(matched, matched[1:]):
        if right - left <= 1:
            continue
        block_start = cues[left][1] + 0.10
        block_end = max(block_start + 0.35, cues[right][0] - 0.10)
        timings = distribute_block(lines, left + 1, right, block_start, block_end)
        for offset, timing in enumerate(timings, left + 1):
            cues[offset] = (*timing, False)

    last = matched[-1]
    if last < len(lines) - 1:
        block_start = cues[last][1] + 0.10
        block_end = max(block_start + 0.6, audio_duration)
        timings = distribute_block(lines, last + 1, len(lines), block_start, block_end)
        for offset, timing in enumerate(timings, last + 1):
            cues[offset] = (*timing, False)

    cleaned = []
    previous_end = 0.0
    for index, (line, cue) in enumerate(zip(lines, cues)):
        start, end, matched_flag = cue
        start = max(previous_end, start)
        end = max(start + 0.35, end)
        if index + 1 < len(cues) and cues[index + 1] is not None:
            next_start = cues[index + 1][0]
            if next_start > start:
                end = min(end, max(start + 0.35, next_start - 0.04))
        cleaned.append({
            "text": line,
            "start": round(start, 3),
            "end": round(end, 3),
            "matched": matched_flag,
        })
        previous_end = end

    return cleaned


HTML = r'''<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Lyrics Sync</title><style>
:root{color-scheme:dark;--bg:#09111f;--card:#131e31;--line:#334155;--text:#f8fafc;--muted:#a7b4c7;--accent:#22c55e;--blue:#2563eb}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#07101e,#111827);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);min-height:100vh}
main{max-width:760px;margin:auto;padding:16px}h1{font-size:27px;margin:10px 0 4px}.sub{color:var(--muted);margin:0 0 16px}.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:15px;margin-bottom:14px}
label{display:block;color:var(--muted);font-size:13px;margin:10px 0 6px}input,textarea,button,select{width:100%;font:inherit;color:var(--text);background:#1c2940;border:1px solid var(--line);border-radius:12px;padding:12px}textarea{min-height:240px;line-height:1.45;resize:vertical}button{background:var(--accent);color:#052e16;border:0;font-weight:800}button:disabled{opacity:.55}.status{white-space:pre-wrap;color:#d5deea;background:#0d1728;padding:12px;border-radius:12px;margin-top:12px;min-height:46px}.small{font-size:12px;color:var(--muted);line-height:1.45}.progress{height:8px;background:#111827;border-radius:99px;overflow:hidden;margin-top:10px;display:none}.progress div{height:100%;width:0;background:var(--accent);transition:width .2s}
.preview{display:none}.player{width:100%;margin-bottom:12px}.caption{min-height:92px;display:flex;align-items:center;justify-content:center;text-align:center;background:#050a13;border-radius:14px;padding:18px;font-size:24px;font-weight:800}.toolbar{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.toolbar button{background:var(--blue);color:white}.cue{border-top:1px solid var(--line);padding:12px 0}.cue:first-child{border-top:0}.cue.active{background:#1b2942;margin:0 -8px;padding:12px 8px;border-radius:12px}.cueText{font-weight:700;margin-bottom:8px}.times{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.times input{padding:9px;text-align:center}.adjust{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.adjust button{background:#263653;color:white;padding:9px 4px;font-size:13px}.match{font-size:11px;color:var(--muted);margin-top:6px}.download{display:none;text-decoration:none;text-align:center;background:var(--blue);color:white;padding:13px;border-radius:12px;font-weight:700;margin-top:10px}
</style></head><body><main><h1>Lyrics Sync</h1><p class="sub">MP3/WAV + färdig text → synkroniserad SRT</p>
<div class="card"><form id="form"><label>Ljudfil</label><input id="audioFile" name="audio" type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" required>
<label>Språk</label><select name="language"><option value="sv">Svenska</option><option value="en">Engelska</option><option value="de">Tyska</option><option value="fr">Franska</option><option value="es">Spanska</option></select>
<label>Sångtext – en textrad per undertextrad</label><textarea name="lyrics" placeholder="Triangel.&#10;Triangel.&#10;En triangel har tre sidor." required></textarea>
<button id="run" type="submit">Synkronisera texten</button></form><div class="progress" id="progress"><div id="bar"></div></div><div id="status" class="status">Klar att starta.</div></div>
<div id="preview" class="card preview"><audio id="player" class="player" controls></audio><div id="caption" class="caption">Tryck på play för att kontrollera texten.</div><div class="toolbar"><button id="shiftBack" type="button">Alla −0,5 s</button><button id="shiftForward" type="button">Alla +0,5 s</button></div><div id="cueList"></div><a id="download" class="download">Ladda ner justerad SRT</a></div>
<div class="card small">Spela låten direkt här. Justera varje rads start och slut med ±0,5 sekunder. Du kan också flytta alla rader samtidigt.</div>
<script>
(function(){
var form=document.getElementById('form'),status=document.getElementById('status'),btn=document.getElementById('run'),fileInput=document.getElementById('audioFile'),progress=document.getElementById('progress'),bar=document.getElementById('bar'),preview=document.getElementById('preview'),player=document.getElementById('player'),caption=document.getElementById('caption'),cueList=document.getElementById('cueList'),download=document.getElementById('download');
var cues=[],audioUrl=null,activeIndex=-1;
function fmt(sec){sec=Math.max(0,Number(sec)||0);var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.floor(sec%60),ms=Math.round((sec-Math.floor(sec))*1000);if(ms===1000){s++;ms=0;}return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+','+String(ms).padStart(3,'0');}
function createSrt(){return cues.map(function(c,i){return (i+1)+'\n'+fmt(c.start)+' --> '+fmt(c.end)+'\n'+c.text+'\n';}).join('\n');}
function updateDownload(){var blob=new Blob([createSrt()],{type:'application/x-subrip;charset=utf-8'});download.href=URL.createObjectURL(blob);var name=(fileInput.files[0]&&fileInput.files[0].name)||'lyrics';download.download=name.replace(/\.[^.]+$/,'')+'.srt';download.style.display='block';}
function changeCue(i,field,delta){var c=cues[i];c[field]=Math.max(0,Math.round((c[field]+delta)*100)/100);if(c.end<c.start+0.2){if(field==='start')c.end=c.start+0.2;else c.start=Math.max(0,c.end-0.2);}renderCues();updateDownload();}
function renderCues(){cueList.innerHTML='';cues.forEach(function(c,i){var row=document.createElement('div');row.className='cue'+(i===activeIndex?' active':'');row.dataset.index=i;var text=document.createElement('div');text.className='cueText';text.textContent=(i+1)+'. '+c.text;row.appendChild(text);var times=document.createElement('div');times.className='times';['start','end'].forEach(function(field){var input=document.createElement('input');input.type='number';input.step='0.1';input.min='0';input.value=c[field].toFixed(2);input.setAttribute('aria-label',field==='start'?'Starttid':'Sluttid');input.addEventListener('change',function(){c[field]=Math.max(0,Number(input.value)||0);if(c.end<c.start+0.2)c.end=c.start+0.2;renderCues();updateDownload();});times.appendChild(input);});row.appendChild(times);var adj=document.createElement('div');adj.className='adjust';[['Start −','start',-0.5],['Start +','start',0.5],['Slut −','end',-0.5],['Slut +','end',0.5]].forEach(function(a){var b=document.createElement('button');b.type='button';b.textContent=a[0];b.addEventListener('click',function(){changeCue(i,a[1],a[2]);});adj.appendChild(b);});row.appendChild(adj);var match=document.createElement('div');match.className='match';match.textContent=c.matched?'Matchad mot Whisper':'Beräknad mellan säkra träffar';row.appendChild(match);row.addEventListener('click',function(e){if(e.target.tagName!=='BUTTON'&&e.target.tagName!=='INPUT'){player.currentTime=c.start;player.play();}});cueList.appendChild(row);});}
function shiftAll(delta){cues.forEach(function(c){c.start=Math.max(0,c.start+delta);c.end=Math.max(c.start+0.2,c.end+delta);});renderCues();updateDownload();}
document.getElementById('shiftBack').addEventListener('click',function(){shiftAll(-0.5);});document.getElementById('shiftForward').addEventListener('click',function(){shiftAll(0.5);});
player.addEventListener('timeupdate',function(){var t=player.currentTime,found=-1;for(var i=0;i<cues.length;i++){if(t>=cues[i].start&&t<cues[i].end){found=i;break;}}if(found!==activeIndex){activeIndex=found;caption.textContent=found>=0?cues[found].text:' ';renderCues();if(found>=0){var el=cueList.querySelector('[data-index="'+found+'"]');if(el)el.scrollIntoView({block:'nearest',behavior:'smooth'});}}});
form.addEventListener('submit',function(e){e.preventDefault();preview.style.display='none';progress.style.display='block';bar.style.width='3%';if(!fileInput.files.length){status.textContent='Fel: Välj en ljudfil.';return;}var file=fileInput.files[0];if(file.size>45*1024*1024){status.textContent='Fel: Filen är för stor. Prova en fil under 45 MB.';return;}btn.disabled=true;status.textContent='Laddar upp ljudfilen…';var xhr=new XMLHttpRequest();xhr.open('POST','/sync',true);xhr.timeout=15*60*1000;xhr.upload.onprogress=function(ev){if(ev.lengthComputable){bar.style.width=Math.max(3,Math.min(45,Math.round(ev.loaded/ev.total*45)))+'%';status.textContent='Laddar upp ljudfilen… '+Math.round(ev.loaded/ev.total*100)+'%';}};xhr.upload.onload=function(){bar.style.width='55%';status.textContent='Whisper analyserar låten…';};xhr.onload=function(){btn.disabled=false;if(xhr.status>=200&&xhr.status<300){try{var data=JSON.parse(xhr.responseText);cues=data.cues;bar.style.width='100%';status.textContent='Klart! Kontrollera och justera tiderna nedan.';if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(file);player.src=audioUrl;activeIndex=-1;caption.textContent='Tryck på play för att kontrollera texten.';preview.style.display='block';renderCues();updateDownload();}catch(err){status.textContent='Fel: Serverns svar kunde inte läsas: '+err.message;}}else{bar.style.width='0%';status.textContent='Fel '+xhr.status+': '+(xhr.responseText||xhr.statusText||'Okänt serverfel');}};xhr.onerror=function(){btn.disabled=false;bar.style.width='0%';status.textContent='Nätverksfel: anslutningen till servern bröts.';};xhr.ontimeout=function(){btn.disabled=false;bar.style.width='0%';status.textContent='Analysen tog längre än 15 minuter.';};xhr.send(new FormData(form));});
})();
</script></main></body></html>'''


@app.get("/", response_class=HTMLResponse)
def home():
    return HTML


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/sync")
async def sync(audio: UploadFile = File(...), lyrics: str = Form(...), language: str = Form("sv")):
    print(f"POST /sync started: {audio.filename}, language={language}", flush=True)
    lines = [line.strip() for line in lyrics.splitlines() if line.strip()]
    if not lines:
        return JSONResponse({"error": "Ingen sångtext angavs."}, status_code=400)

    suffix = Path(audio.filename or "audio.mp3").suffix.lower()
    if suffix not in {".mp3", ".wav", ".m4a", ".mp4", ".aac"}:
        return JSONResponse({"error": "Filtypen stöds inte. Använd MP3 eller WAV."}, status_code=400)

    tmp_path = None
    try:
        total_bytes = 0
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            while chunk := await audio.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > 50 * 1024 * 1024:
                    return JSONResponse({"error": "Ljudfilen är för stor. Max 50 MB."}, status_code=413)
                tmp.write(chunk)

        segments, info = get_model().transcribe(
            tmp_path,
            language=language,
            beam_size=1,
            best_of=1,
            word_timestamps=True,
            vad_filter=False,
            condition_on_previous_text=False,
            initial_prompt=" ".join(lines)[:1200],
        )

        words = []
        for segment in segments:
            for word in segment.words or []:
                token = word.word.strip()
                if token:
                    words.append((token, float(word.start), float(word.end)))

        duration = float(getattr(info, "duration", 0.0) or 0.0)
        if words:
            duration = max(duration, words[-1][2])
        print(f"Transcription complete: {len(words)} words, duration={duration:.2f}", flush=True)

        cues = align_lines(lines, words, duration)
        matched_count = sum(1 for cue in cues if cue["matched"])
        print(f"Alignment complete: {len(cues)} cues, {matched_count} matched", flush=True)
        return JSONResponse({"cues": cues, "duration": round(duration, 3), "matched": matched_count})
    except Exception as exc:
        print(f"SYNC ERROR: {type(exc).__name__}: {exc}", flush=True)
        return JSONResponse({"error": f"Analysen misslyckades: {type(exc).__name__}: {exc}"}, status_code=500)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
