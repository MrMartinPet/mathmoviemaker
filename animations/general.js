"use strict";
window.MathMovieAnimations=window.MathMovieAnimations||{scenes:{}};
(()=>{
const R=window.MathMovieAnimations.scenes;
R.pulse=(p,q)=>{let k=1+.07*Math.sin(p*Math.PI*4);c.save();c.translate(cv.width/2,cv.height*.46);c.scale(k,k);c.translate(-cv.width/2,-cv.height*.46);tc(q?.text||"",cv.height*.46,cv.width/13,"#fff");c.restore()};
R.bars=p=>{for(let i=0;i<18;i++){let bh=cv.height*(.08+.22*Math.abs(Math.sin(p*10+i)));c.fillStyle=i%2?"#60a5fa":"#22c55e";c.fillRect(cv.width*.16+i*cv.width*.038,cv.height*.62-bh,cv.width*.022,bh)}};
R.question=()=>tc("?",cv.height*.46,cv.width/5,"#facc15");
R.numbers=()=>tc("6   7   8   9",cv.height*.46,cv.width/13);
R.countdown=p=>tc(String(Math.max(1,3-Math.floor(p*3))),cv.height*.46,cv.width/5,"#facc15");
R.confetti=p=>{for(let i=0;i<45;i++){let x=(i*97%100)/100*cv.width,y=((i*53%100)/100*cv.height+p*cv.height*.7)%cv.height;c.fillStyle=["#facc15","#22c55e","#60a5fa","#fb7185"][i%4];c.fillRect(x,y,8+i%4*2,16)}tc("BRA!",cv.height*.46,cv.width/8,"#fff")};
R.steps=p=>{["1","2","3"].forEach((x,i)=>{let on=p>i/3;c.fillStyle=on?"#22c55e":"#334155";c.fillRect(cv.width*(.2+i*.22),cv.height*(.58-i*.12),cv.width*.16,cv.height*.12);tc(x,cv.height*(.64-i*.12),cv.width/24)})};
R.multiplication=(p,q,match)=>tc(match[3]==="a"?`${match[1]} × ${match[2]} = ${+match[1]*+match[2]}`:`${match[1]} × ${match[2]} = ?`,cv.height*.46,cv.width/11,match[3]==="a"?"#22c55e":"#facc15");
})();