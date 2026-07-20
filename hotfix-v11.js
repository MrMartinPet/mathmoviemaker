"use strict";

(function(){
  const removed=new Set(["bars","steps"]);
  const additions=[
    ["introTables","6–9 introduktion"],
    ["questionAnswer","Fråga först – svar sedan"],
    ["listenTry","Lyssna och prova"],
    ["countAlong","Räkna med"],
    ["thinkSay","Tänk och säg"],
    ["answerComing","Svaret kommer"],
    ["gettingStrong","6–9 blir starka"],
    ["singMultiply","Multiplicera och sjung"],
    ["factsGrow","Kunskapen växer"],
    ["rhymeFinale","Multiplikationsfinal"]
  ];

  for(let i=scenes.length-1;i>=0;i--)if(removed.has(scenes[i][0]))scenes.splice(i,1);
  additions.forEach(item=>{if(!scenes.some(s=>s[0]===item[0]))scenes.push(item)});

  function norm11(s){return String(s||"").toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9åäöéèêáíóúüñç×\s-]/g," ").replace(/\s+/g," ").trim()}
  function wordsToDigits(s){
    const map={six:"6",seven:"7",eight:"8",nine:"9"};
    let x=norm11(s);
    Object.entries(map).forEach(([w,n])=>x=x.replace(new RegExp(`\\b${w}\\b`,"g"),n));
    return x;
  }
  function pairFromText(text){
    const nums=[...wordsToDigits(text).matchAll(/\b([6-9])\b/g)].map(m=>m[1]);
    return nums.length>=2?[nums[0],nums[1]]:null;
  }
  function isAnswerOnly(text){return /^(thirty six|forty two|forty eight|forty nine|fifty four|fifty six|sixty three|sixty four|seventy two|eighty one|36|42|48|49|54|56|63|64|72|81)$/.test(norm11(text))}
  function songScene(text){
    const x=norm11(text);
    if(/lets learn the tables|tables six to nine/.test(x))return "introTables";
    if(/question first|answer time/.test(x))return "questionAnswer";
    if(/listen close|try with me/.test(x))return "listenTry";
    if(/count it out|you will see/.test(x))return "countAlong";
    if(/think it|say it|loud and clear/.test(x))return "thinkSay";
    if(/answer.*coming|have no fear/.test(x))return "answerComing";
    if(/getting strong|six to nine.*strong/.test(x))return "gettingStrong";
    if(/multiply.*sing along/.test(x))return "singMultiply";
    if(/facts.*grow|watch them grow/.test(x))return "factsGrow";
    if(/multiplication rhyme|now we know/.test(x))return "rhymeFinale";
    return null;
  }
  function sceneFor(text){
    const pair=pairFromText(text);
    if(pair)return `m-${pair[0]}-${pair[1]}-q`;
    return songScene(text)||guess(text);
  }
  function normalizeScenes(){
    let lastPair=null;
    cues.forEach(q=>{
      const pair=pairFromText(q.text);
      if(pair){lastPair=pair;q.scene=`m-${pair[0]}-${pair[1]}-q`;return}
      if(isAnswerOnly(q.text)&&lastPair){q.scene=`m-${lastPair[0]}-${lastPair[1]}-a`;return}
      const s=songScene(q.text);
      if(s)q.scene=s;
      else if(removed.has(q.scene))q.scene="pulse";
    });
  }

  const previousDraw=draw;
  function textAt(s,x,y,size,color="#fff",alpha=1){c.save();c.globalAlpha=alpha;c.fillStyle=color;c.font=`900 ${size}px system-ui`;c.textAlign="center";c.textBaseline="middle";c.fillText(s,x,y);c.restore()}
  function glowText(s,x,y,size,color,blur=28){c.save();c.shadowColor=color;c.shadowBlur=blur;c.fillStyle=color;c.font=`900 ${size}px system-ui`;c.textAlign="center";c.textBaseline="middle";c.fillText(s,x,y);c.restore()}
  function circle(x,y,r,color,alpha=1){c.save();c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore()}

  draw=function(t){
    const q=cue(t);
    if(!q||q.scene==="none"){bg();return}
    const w=cv.width,h=cv.height,p=clamp((t-q.start)/(q.end-q.start));
    const m=/^m-([6-9])-([6-9])-(q|a)$/.exec(q.scene);
    if(m){
      bg();
      const expression=`${m[1]} × ${m[2]} =`;
      const exX=w*.42, y=h*.46;
      textAt(expression,exX,y,w/12,"#fff");
      if(m[3]==="a"){
        const answer=String(Number(m[1])*Number(m[2]));
        const appear=ease(clamp((p-.08)/.55));
        const scale=.72+.28*appear;
        c.save();c.translate(w*.70,y);c.scale(scale,scale);c.translate(-w*.70,-y);
        glowText(answer,w*.70,y,w/7,"#22c55e",32*appear);
        c.restore();
      }else{
        const pulse=.82+.18*Math.sin(p*Math.PI*2);
        c.save();c.globalAlpha=.25+.25*pulse;c.strokeStyle="#facc15";c.lineWidth=Math.max(4,w/260);c.beginPath();c.roundRect(w*.62,h*.34,w*.17,h*.24,w*.025);c.stroke();c.restore();
      }
      caption(q,h,w);return;
    }
    if(q.scene==="introTables"){
      bg();["6","7","8","9"].forEach((n,i)=>{const a=ease(clamp((p-i*.12)/.45));const x=w*(.2+i*.2),y=h*(.48-(1-a)*.25);glowText(n,x,y,w/8,["#60a5fa","#22c55e","#facc15","#fb7185"][i],20*a)});caption(q,h,w);return;
    }
    if(q.scene==="questionAnswer"){
      bg();textAt("6 × 9 =",w*.40,h*.45,w/13,"#fff");const a=ease(clamp((p-.55)/.35));glowText("54",w*.69,h*.45,w/8,"#22c55e",28*a);c.globalAlpha=a;caption(q,h,w);c.globalAlpha=1;return;
    }
    if(q.scene==="listenTry"){
      bg();circle(w*.34,h*.44,w*.07,"#60a5fa",.35);textAt("♪",w*.34,h*.44,w/11,"#fff");for(let i=0;i<3;i++){c.save();c.strokeStyle="#22c55e";c.lineWidth=w/180;c.globalAlpha=.35+.45*Math.sin(p*Math.PI*4+i);c.beginPath();c.arc(w*.47,h*.44,w*(.035+i*.035),-.7,.7);c.stroke();c.restore()}caption(q,h,w);return;
    }
    if(q.scene==="countAlong"){
      bg();for(let i=0;i<4;i++){const on=p*4>=i;circle(w*(.29+i*.14),h*.44,w*.045,on?["#60a5fa","#22c55e","#facc15","#fb7185"][i]:"#334155",on?1:.6);textAt(String(i+1),w*(.29+i*.14),h*.44,w/28,"#fff")}caption(q,h,w);return;
    }
    if(q.scene==="thinkSay"){
      bg();circle(w*.35,h*.42,w*.09,"#60a5fa",.32);circle(w*.29,h*.54,w*.018,"#60a5fa",.45);textAt("…",w*.35,h*.40,w/12,"#fff");const a=ease(clamp((p-.4)/.45));c.save();c.globalAlpha=a;c.fillStyle="#22c55e";c.beginPath();c.roundRect(w*.53,h*.33,w*.25,h*.18,w*.035);c.fill();c.beginPath();c.moveTo(w*.58,h*.51);c.lineTo(w*.55,h*.58);c.lineTo(w*.65,h*.51);c.fill();c.restore();textAt("!",w*.655,h*.42,w/11,"#fff",a);caption(q,h,w);return;
    }
    if(q.scene==="answerComing"){
      bg();const n=Math.max(1,3-Math.floor(p*3));textAt(String(n),w*.42,h*.44,w/6,"#facc15");c.save();c.strokeStyle="#22c55e";c.lineWidth=w/170;c.globalAlpha=.5+.5*Math.sin(p*Math.PI*6);c.strokeRect(w*.57,h*.33,w*.18,h*.22);c.restore();caption(q,h,w);return;
    }
    if(q.scene==="gettingStrong"){
      bg();[6,7,8,9].forEach((n,i)=>{const a=.8+.25*ease(clamp((p-i*.1)/.6));c.save();c.translate(w*(.2+i*.2),h*.45);c.scale(a,a);textAt(String(n),0,0,w/9,["#60a5fa","#22c55e","#facc15","#fb7185"][i]);c.restore()});caption(q,h,w);return;
    }
    if(q.scene==="singMultiply"){
      bg();for(let i=0;i<7;i++){const x=w*(.14+i*.12),y=h*(.38+.08*Math.sin(p*Math.PI*4+i));textAt(i%2?"×":"♪",x,y,w/18,i%2?"#22c55e":"#60a5fa")};caption(q,h,w);return;
    }
    if(q.scene==="factsGrow"){
      bg();[6,7,8,9].forEach((n,i)=>{const a=ease(clamp((p-i*.1)/.65)),x=w*(.22+i*.19),base=h*.63,top=base-h*.28*a;c.fillStyle=["#60a5fa","#22c55e","#facc15","#fb7185"][i];c.fillRect(x-w*.035,top,w*.07,base-top);textAt(String(n),x,top-h*.045,w/22,"#fff",a)});caption(q,h,w);return;
    }
    if(q.scene==="rhymeFinale"){
      bg();[6,7,8,9].forEach((n,i)=>{const ang=p*Math.PI*2+i*Math.PI/2,x=w*.5+Math.cos(ang)*w*.2,y=h*.43+Math.sin(ang)*h*.16;textAt(String(n),x,y,w/10,["#60a5fa","#22c55e","#facc15","#fb7185"][i])});if(p>.55){drawConfetti((p-.55)/.45);glowText("×",w*.5,h*.43,w/7,"#fff",24)}caption(q,h,w);return;
    }
    previousDraw(t);
  };

  const previousApply=apply;
  apply=function(p){previousApply(p);normalizeScenes();rows();timeline();draw(audio.currentTime);save()};

  $("makeRows").onclick=()=>{
    const a=$("lyrics").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!a.length)return alert("Lägg in text.");
    cues=a.map(text=>({text,start:null,end:null,scene:sceneFor(text)}));
    normalizeScenes();sel=0;syncing=false;syncIndex=-1;rows();syncView();timeline();draw(0);save();
  };

  normalizeScenes();rows();timeline();draw(audio.currentTime);save();
})();