"use strict";
window.MathMovieAnimations=window.MathMovieAnimations||{scenes:{}};
(()=>{
const R=window.MathMovieAnimations.scenes;
const fitText=(text,maxWidth,maxSize,minSize=24)=>{let size=maxSize;c.font=`900 ${size}px system-ui`;while(size>minSize&&c.measureText(text).width>maxWidth){size-=2;c.font=`900 ${size}px system-ui`}return size};
const liveText=(text,y,color="#fff",pulse=1)=>{text=String(text||"");let size=fitText(text,cv.width*.84,cv.width/13,Math.max(24,cv.width/42));c.save();c.translate(cv.width/2,y);c.scale(pulse,pulse);c.translate(-cv.width/2,-y);tc(text,y,size,color);c.restore()};
R.pulse=(p,q)=>liveText(q?.text||"",cv.height*.46,"#fff",1+.07*Math.sin(p*Math.PI*4));
R.bars=p=>{for(let i=0;i<18;i++){let bh=cv.height*(.08+.22*Math.abs(Math.sin(p*10+i)));c.fillStyle=i%2?"#60a5fa":"#22c55e";c.fillRect(cv.width*.16+i*cv.width*.038,cv.height*.62-bh,cv.width*.022,bh)}};
R.question=()=>tc("?",cv.height*.46,cv.width/5,"#facc15");
R.numbers=()=>tc("6   7   8   9",cv.height*.46,cv.width/13);
R.countdown=p=>tc(String(Math.max(1,3-Math.floor(p*3))),cv.height*.46,cv.width/5,"#facc15");
R.confetti=(p,q)=>{for(let i=0;i<45;i++){let x=(i*97%100)/100*cv.width,y=((i*53%100)/100*cv.height+p*cv.height*.7)%cv.height;c.fillStyle=["#facc15","#22c55e","#60a5fa","#fb7185"][i%4];c.fillRect(x,y,8+i%4*2,16)}if(q?.text)liveText(q.text,cv.height*.46,"#fff",1+.04*Math.sin(p*Math.PI*4))};
R.steps=p=>{["1","2","3"].forEach((x,i)=>{let on=p>i/3;c.fillStyle=on?"#22c55e":"#334155";c.fillRect(cv.width*(.2+i*.22),cv.height*(.58-i*.12),cv.width*.16,cv.height*.12);tc(x,cv.height*(.64-i*.12),cv.width/24)})};
R.multiplication=(p,q,match)=>tc(match[3]==="a"?`${match[1]} × ${match[2]} = ${+match[1]*+match[2]}`:`${match[1]} × ${match[2]} = ?`,cv.height*.46,cv.width/11,match[3]==="a"?"#22c55e":"#facc15");
})();