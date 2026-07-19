"use strict";
window.MathMovieAnimations=window.MathMovieAnimations||{scenes:{}};
(()=>{
const R=window.MathMovieAnimations.scenes;
const cols=["#22c55e","#60a5fa","#fb7185"];
const tri=()=>[[cv.width*.5,cv.height*.17],[cv.width*.21,cv.height*.68],[cv.width*.79,cv.height*.68]];
const ln=(a,b,color="#fff",width=Math.max(6,cv.width/100),p=1,alpha=1)=>{p=clamp(p);c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.beginPath();c.moveTo(...a);c.lineTo(a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p);c.stroke();c.restore()};
const triangle=(p=1,color="#fff",width=Math.max(6,cv.width/100))=>{let[A,B,D]=tri(),u=clamp(p)*3;if(u>0)ln(A,B,color,width,Math.min(1,u));if(u>1)ln(B,D,color,width,Math.min(1,u-1));if(u>2)ln(D,A,color,width,Math.min(1,u-2));return[A,B,D]};
const label=(x,y,text,color="#fff",size=cv.width/28,alpha=1)=>{c.save();c.globalAlpha=alpha;c.fillStyle=color;c.font=`900 ${size}px system-ui`;c.textAlign="center";c.textBaseline="middle";c.fillText(text,x,y);c.restore()};
const sideLabel=(a,b,text,color="#fff")=>label((a[0]+b[0])/2,(a[1]+b[1])/2-12,text,color);
const dot=(v,labelText,color="#facc15",pulse=1)=>{c.save();c.fillStyle=color;c.beginPath();c.arc(v[0],v[1],cv.width*.022*pulse,0,Math.PI*2);c.fill();c.restore();if(labelText)label(v[0],v[1]-cv.height*.055,labelText,color,cv.width/34)};
const angle=(v,p1,p2,color="#facc15",r=cv.width*.055,p=1,width=Math.max(5,cv.width/180))=>{let a1=Math.atan2(p1[1]-v[1],p1[0]-v[0]),a2=Math.atan2(p2[1]-v[1],p2[0]-v[0]);let delta=a2-a1;while(delta<=-Math.PI)delta+=Math.PI*2;while(delta>Math.PI)delta-=Math.PI*2;c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.beginPath();c.arc(v[0],v[1],r,a1,a1+delta*clamp(p),delta<0);c.stroke();c.restore()};
const fillTriangle=(A,B,D,color,alpha=1)=>{c.save();c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();c.moveTo(...A);c.lineTo(...B);c.lineTo(...D);c.closePath();c.fill();c.restore()};
const pulseFor=(p,index,count=3)=>{let local=((p*count)-index);if(local<0||local>1)return 1;return 1+.22*Math.sin(local*Math.PI)};

R.triangle=p=>triangle(ease(p));

R.sides=p=>{let[A,B,D]=triangle(1,"#475569",cv.width/110);let sides=[[A,B],[B,D],[D,A]];sides.forEach((s,i)=>{let k=pulseFor(p,i),w=cv.width/75*k;ln(s[0],s[1],cols[i],w,1,.9)});};

R.corners=p=>{let pts=triangle(1,"#94a3b8",cv.width/105);pts.forEach((v,i)=>{let local=clamp(p*3-i);if(local>0)dot(v,String(i+1),cols[i],.75+.25*ease(local))})};

R.angles=p=>{let[A,B,D]=triangle(1,"#e2e8f0",cv.width/105);let local=[clamp(p*3),clamp(p*3-1),clamp(p*3-2)];angle(A,B,D,cols[0],cv.width*.058,ease(local[0]));angle(B,D,A,cols[1],cv.width*.058,ease(local[1]));angle(D,A,B,cols[2],cv.width*.058,ease(local[2]));};

R.parts=()=>{let[A,B,D]=triangle(1,"#64748b",cv.width/110);[[A,B],[B,D],[D,A]].forEach((s,i)=>ln(s[0],s[1],cols[i],cv.width/85));[A,B,D].forEach((v,i)=>dot(v,String(i+1),cols[i]));angle(A,B,D,cols[0]);angle(B,D,A,cols[1]);angle(D,A,B,cols[2])};

/* Large language-neutral 180-degree scene. */
R.sum180=p=>{triangle(1,"#e2e8f0",cv.width/100);let k=1+.06*Math.sin(p*Math.PI*4);c.save();c.translate(cv.width/2,cv.height*.45);c.scale(k,k);c.translate(-cv.width/2,-cv.height*.45);label(cv.width/2,cv.height*.45,"180°","#facc15",cv.width/7);c.restore()};

/* Complete triangle with numbered angles and equation inside it. */
R.angleEquation=p=>{let[A,B,D]=triangle(1,"#e2e8f0",cv.width/105);angle(A,B,D,cols[0],cv.width*.052);angle(B,D,A,cols[1],cv.width*.052);angle(D,A,B,cols[2],cv.width*.052);label(A[0],A[1]+cv.height*.095,"1",cols[0],cv.width/31);label(B[0]+cv.width*.07,B[1]-cv.height*.055,"2",cols[1],cv.width/31);label(D[0]-cv.width*.07,D[1]-cv.height*.055,"3",cols[2],cv.width/31);let k=1+.035*Math.sin(p*Math.PI*4);c.save();c.translate(cv.width/2,cv.height*.48);c.scale(k,k);c.translate(-cv.width/2,-cv.height*.48);label(cv.width/2,cv.height*.48,"1 + 2 + 3 = 180°","#fff",cv.width/24);c.restore()};

R.perimeterTrace=p=>{let[A,B,D]=triangle(1,"#475569",cv.width/115),u=ease(p)*3;if(u<=1)ln(A,B,cols[0],cv.width/68,u);else if(u<=2){ln(A,B,cols[0],cv.width/68);ln(B,D,cols[1],cv.width/68,u-1)}else{ln(A,B,cols[0],cv.width/68);ln(B,D,cols[1],cv.width/68);ln(D,A,cols[2],cv.width/68,u-2)}};

R.sideLabels=()=>{let[A,B,D]=triangle(1,"#e2e8f0",cv.width/105);sideLabel(A,B,"a",cols[0]);sideLabel(B,D,"b",cols[1]);sideLabel(D,A,"c",cols[2])};

R.perimeter=p=>{let[A,B,D]=triangle(1,"#64748b",cv.width/110);[[A,B],[B,D],[D,A]].forEach((s,i)=>ln(s[0],s[1],cols[i],cv.width/85));sideLabel(A,B,"a",cols[0]);sideLabel(B,D,"b",cols[1]);sideLabel(D,A,"c",cols[2]);let alpha=ease(clamp((p-.25)/.5));label(cv.width/2,cv.height*.78,"a + b + c","#fff",cv.width/15,alpha)};

/* Triangle exists from frame one; its interior fills from the base upward. */
R.areaFill=p=>{let[A,B,D]=tri(),fill=ease(p);c.save();c.beginPath();c.moveTo(...A);c.lineTo(...B);c.lineTo(...D);c.closePath();c.clip();let top=B[1]-(B[1]-A[1])*fill;c.fillStyle="#22c55e";c.globalAlpha=.38+.18*Math.sin(Math.max(0,p-.75)*Math.PI*4);c.fillRect(B[0]-10,top,D[0]-B[0]+20,B[1]-top+10);c.restore();triangle(1,"#e2e8f0",cv.width/95)};

R.base=p=>{let[,B,D]=triangle(1,"#64748b",cv.width/110);ln(B,D,cols[0],cv.width/58,ease(p))};

R.height=p=>{let[A,B]=triangle(1,"#64748b",cv.width/110),F=[A[0],B[1]];ln(A,F,cols[1],cv.width/80,ease(p));if(p>.7){let s=cv.width*.035;c.save();c.strokeStyle="#fff";c.lineWidth=cv.width/180;c.strokeRect(F[0],F[1]-s,s,s);c.restore();label(A[0]+cv.width*.035,(A[1]+F[1])/2,"h",cols[1],cv.width/25,ease((p-.7)/.3))}};

/* Base is drawn first, then height, in that order. */
R.baseHeight=p=>{let[A,B,D]=triangle(1,"#64748b",cv.width/110),F=[A[0],B[1]];let bp=ease(clamp(p/.48)),hp=ease(clamp((p-.48)/.42));ln(B,D,cols[0],cv.width/60,bp);if(p>.48)ln(F,A,cols[1],cv.width/76,hp);if(p>.82){let s=cv.width*.032;c.save();c.strokeStyle="#fff";c.lineWidth=cv.width/180;c.strokeRect(F[0],F[1]-s,s,s);c.restore()}if(p>.88){sideLabel(B,D,"b",cols[0]);label(A[0]+cv.width*.035,(A[1]+F[1])/2,"h",cols[1],cv.width/25)}};

R.doubleTriangle=p=>{let shift=cv.width*.22*ease(p);c.save();c.translate(-shift/2,0);triangle(1,cols[0]);c.restore();c.save();c.translate(shift/2,0);c.scale(-1,1);c.translate(-cv.width,0);triangle(1,cols[1]);c.restore();if(p>.55)label(cv.width/2,cv.height*.77,"b × h","#fff",cv.width/14,ease((p-.55)/.45))};

R.divideTwo=p=>{let[A,B,D]=tri();fillTriangle(A,B,D,cols[0],.35);triangle(1,"#e2e8f0",cv.width/100);label(cv.width/2,cv.height*.46,"÷ 2","#facc15",cv.width/7,.65+.35*Math.sin(p*Math.PI))};

R.area=p=>{triangle(1,"#475569",cv.width/110);let a=["A","=","b × h","÷","2"],xs=[.25,.36,.53,.7,.79],n=Math.ceil(p*a.length);a.forEach((x,i)=>{if(i<n)label(cv.width*xs[i],cv.height*.48,x,i===0?cols[0]:i===4?"#facc15":"#fff",cv.width/16)})};

R.summary=p=>{let phase=Math.min(2,Math.floor(p*3));if(phase===0){let[A,B,D]=triangle(1,"#64748b",cv.width/110);[[A,B],[B,D],[D,A]].forEach((s,i)=>ln(s[0],s[1],cols[i],cv.width/88));angle(A,B,D,cols[0]);angle(B,D,A,cols[1]);angle(D,A,B,cols[2])}else if(phase===1){triangle(1,"#64748b",cv.width/110);label(cv.width/2,cv.height*.46,"1 + 2 + 3 = 180°","#facc15",cv.width/22)}else{label(cv.width/2,cv.height*.39,"a + b + c","#fff",cv.width/18);label(cv.width/2,cv.height*.56,"A = (b × h) ÷ 2",cols[0],cv.width/20)}};

R.none=()=>triangle(1);
})();