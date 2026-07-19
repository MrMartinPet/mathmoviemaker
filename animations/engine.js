"use strict";
window.MathMovieAnimations=window.MathMovieAnimations||{scenes:{}};
(()=>{
const originalDraw=window.draw;
const fitCaption=(text,maxWidth,maxSize,minSize)=>{let size=maxSize;c.font=`900 ${size}px system-ui`;while(size>minSize&&c.measureText(text).width>maxWidth){size-=2;c.font=`900 ${size}px system-ui`}return size};
const responsiveCaption=(q,h,w)=>{if(!q?.text)return;let text=String(q.text),size=fitCaption(text,w*.88,Math.max(28,w/25),Math.max(20,w/52));c.save();c.fillStyle="rgba(2,6,23,.92)";c.fillRect(0,h*.82,w,h*.18);c.fillStyle="#fff";c.font=`900 ${size}px system-ui`;c.textAlign="center";c.textBaseline="middle";c.fillText(text,w/2,h*.91);c.restore()};
window.draw=function(t){
  let w=cv.width,h=cv.height;
  bg();
  let q=cue(t),scene=q?.scene||"none",p=q?clamp((t-q.start)/(q.end-q.start)):0;
  let match=/^m-(\d)-(\d)-(q|a)$/.exec(scene);
  let registry=window.MathMovieAnimations.scenes;
  try{
    if(match&&registry.multiplication) registry.multiplication(p,q,match);
    else if(registry[scene]) registry[scene](p,q);
    else if(registry.none) registry.none(p,q);
    else if(typeof originalDraw==="function") return originalDraw(t);
  }catch(error){
    console.error("Animationsfel",scene,error);
    if(typeof originalDraw==="function") return originalDraw(t);
  }
  responsiveCaption(q,h,w);
};
})();