"use strict";
window.MathMovieAnimations=window.MathMovieAnimations||{scenes:{}};
(()=>{
const originalDraw=window.draw;
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
  caption(q,h,w);
};
})();