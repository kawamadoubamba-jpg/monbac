// Hors-ligne complet : tout est stocké sur le téléphone après la 1re visite.
const V="monbac-v2",CORE=["/","/tw.css","/manifest.webmanifest","/icon-192.png","/bricolage-grotesque-latin-600-normal.woff2","/bricolage-grotesque-latin-700-normal.woff2","/source-sans-3-latin-400-normal.woff2","/source-sans-3-latin-600-normal.woff2"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==location.origin||u.pathname.startsWith("/api/"))return;
 if(r.mode==="navigate"){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put("/",c));return res}).catch(()=>caches.match("/")));return}
 e.respondWith(caches.match(r).then(hit=>{const net=fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res}).catch(()=>hit);return hit||net}))});
