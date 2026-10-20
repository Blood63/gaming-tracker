// Service worker : réseau d'abord (toujours la dernière version), copie de secours pour l'usage hors ligne.
// Seuls les fichiers du site (même origine) et Chart.js sont mis en cache ; les API (GitHub…) et l'OCR passent toujours par le réseau.
const C='gt-cache-v2';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  const own=u.origin===self.location.origin,chartjs=u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('/chart.js');
  if(!own&&!chartjs)return;
  // données JSON chargées avec ?v=<horodatage> : une seule entrée de cache par fichier (sinon le cache grossit sans fin)
  const key=own&&/^\?v=\d{12,}$/.test(u.search)?u.origin+u.pathname:r;
  e.respondWith((async()=>{
    try{const res=await fetch(r);if(res&&((res.ok&&(res.type==='basic'||res.type==='cors'))||(chartjs&&res.type==='opaque'))){const c=await caches.open(C);c.put(key,res.clone()).catch(()=>{})}return res}
    catch(err){const c=await caches.open(C);const hit=await c.match(key)||(r.mode==='navigate'?await c.match(new URL('./',self.location).href)||await c.match(new URL('index.html',self.location).href):null);if(hit)return hit;throw err}
  })())});
