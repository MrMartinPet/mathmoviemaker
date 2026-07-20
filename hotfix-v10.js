"use strict";

(function(){
  const supported = new Set([
    "none","triangle","sides","corners","angles","parts","sum180","angleEquation","perimeterTrace","sideLabels","perimeter","areaFill","base","height","baseHeight","doubleTriangle","divideTwo","area","summary","pulse","bars","question","numbers","countdown","confetti","steps"
  ]);

  function norm(s){return String(s||"").toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9åäöéèêáíóúüñç×\s-]/g," ").replace(/\s+/g," ").trim()}
  function wordNumbers(s){
    const map={six:"6",seven:"7",eight:"8",nine:"9"};
    let x=norm(s);
    Object.entries(map).forEach(([w,n])=>x=x.replace(new RegExp(`\\b${w}\\b`,`g`),n));
    return x;
  }
  function multiplicationScene(text){
    const x=wordNumbers(text), nums=[...x.matchAll(/\b([6-9])\b/g)].map(m=>m[1]);
    if(nums.length<2)return null;
    const answer=/thirty|forty|fifty|sixty|seventy|eighty|\b36\b|\b42\b|\b48\b|\b49\b|\b54\b|\b56\b|\b63\b|\b64\b|\b72\b|\b81\b/.test(x);
    return `m-${nums[0]}-${nums[1]}-${answer?"a":"q"}`;
  }
  function safeGuess(text){
    const x=norm(text), mul=multiplicationScene(text);
    if(mul)return mul;
    if(/lets learn the tables|tables six to nine/.test(x))return "numbers";
    if(/question first|answer time/.test(x))return "countdown";
    if(/listen close|count it out/.test(x))return "bars";
    if(/think it|say it|loud and clear/.test(x))return "steps";
    if(/answer.*coming|have no fear/.test(x))return "countdown";
    if(/getting strong|six to nine.*strong/.test(x))return "numbers";
    if(/multiply.*sing along/.test(x))return "bars";
    if(/facts.*grow|watch them grow/.test(x))return "steps";
    if(/multiplication rhyme|now you know/.test(x))return "confetti";
    return guess(text);
  }

  const originalDraw=draw;
  draw=function(t){
    const q=cue(t);
    if(!q || q.scene==="none") { bg(); return; }
    const m=/^m-(\d)-(\d)-q$/.exec(q.scene);
    if(m){
      bg();
      tc(`${m[1]} × ${m[2]} =`,cv.height*.46,cv.width/11,"#facc15");
      caption(q,cv.height,cv.width);
      return;
    }
    originalDraw(t);
  };

  const originalApply=apply;
  apply=function(p){
    if(p&&Array.isArray(p.cues))p.cues=p.cues.map(q=>({...q,scene:(q.scene&&(/^m-[6-9]-[6-9]-(q|a)$/.test(q.scene)||supported.has(q.scene)))?q.scene:safeGuess(q.text)}));
    originalApply(p);
  };

  guess=safeGuess;

  function setTypedTime(i,edge,raw){
    const q=cues[i],v=Number(String(raw).replace(",","."));
    if(!Number.isFinite(v)||v<0){rows(false);return}
    if(edge==="start"){
      const min=i>0&&Number.isFinite(cues[i-1].end)?cues[i-1].end:0;
      q.start=Math.max(min,Math.min(v,Number.isFinite(q.end)?q.end-.05:v));
    }else{
      const max=i<cues.length-1&&Number.isFinite(cues[i+1].start)?cues[i+1].start:Infinity;
      q.end=Math.min(max,Math.max(v,Number.isFinite(q.start)?q.start+.05:v));
    }
    sel=i; rows(); syncView(); timeline(); draw(audio.currentTime); save();
  }

  rows=function(redraw=true){
    const b=$("timingList"); b.innerHTML="";
    cues.forEach((q,i)=>{
      const r=document.createElement("div"),dur=Number.isFinite(q.start)&&Number.isFinite(q.end)?q.end-q.start:null;
      r.className="timing-row"+(i===sel?" selected":"");
      r.innerHTML=`<div class="row-title"><div class="row-number">${i+1}</div><input class="text-input" value="${esc(q.text)}"></div><div class="time-grid"><div><label>Start</label><input class="start-time" inputmode="decimal" type="number" min="0" step="0.01" value="${Number.isFinite(q.start)?q.start.toFixed(2):""}" placeholder="–"></div><div><label>Slut</label><input class="end-time" inputmode="decimal" type="number" min="0" step="0.01" value="${Number.isFinite(q.end)?q.end.toFixed(2):""}" placeholder="–"></div><div><label>Längd</label><input value="${dur!=null?dur.toFixed(2):"–"}" readonly></div></div><div class="scene-wrap"><label>Animation</label><select>${scenes.map(s=>`<option value="${s[0]}" ${s[0]===q.scene?"selected":""}>${s[1]}</option>`).join("")}</select></div><div class="fine"><button data-a="s-">Start −0,1</button><button data-a="s+">Start +0,1</button><button data-a="e-">Slut −0,1</button><button data-a="e+">Slut +0,1</button></div>`;
      r.onclick=e=>{if(!e.target.closest("input,select,button"))select(i)};
      r.querySelector(".text-input").onchange=e=>{q.text=e.target.value;q.scene=safeGuess(q.text);save();rows();timeline();draw(audio.currentTime)};
      r.querySelector(".start-time").onchange=e=>setTypedTime(i,"start",e.target.value);
      r.querySelector(".end-time").onchange=e=>setTypedTime(i,"end",e.target.value);
      r.querySelector("select").onchange=e=>{q.scene=e.target.value;sel=i;save();draw(audio.currentTime)};
      r.querySelectorAll("[data-a]").forEach(x=>x.onclick=()=>{const a=x.dataset.a;adjust(i,a[0],a[1]==="+"?.1:-.1)});
      b.appendChild(r);
    });
    if(redraw)timeline();
  };

  cues.forEach(q=>{if(!q.scene||(!/^m-[6-9]-[6-9]-(q|a)$/.test(q.scene)&&!supported.has(q.scene)))q.scene=safeGuess(q.text)});
  rows(); timeline(); draw(audio.currentTime); save();
})();