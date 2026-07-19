const CACHE="transcriber-v2";
const ASSETS=["./manifest.webmanifest"];
self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.mode==="navigate"){
    event.respondWith(fetch(req).catch(()=>caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});