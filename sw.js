// Service worker : réseau d'abord (toujours la dernière version), copie de secours pour l'usage hors ligne.
// Seuls les fichiers du site (même origine) et Chart.js sont mis en cache ; les API (GitHub…) et l'OCR passent toujours par le réseau.
// fichiers sans ?v= (index.html, build.json…) : revalidés auprès du serveur (cache:'no-cache') pour ne jamais rester sur une ancienne version.
const C='gt-cache-v2';
// install : la page d'accueil est mise en cache tout de suite (hors ligne possible dès la 1re visite) ; un échec n'empêche jamais l'installation.
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.add(new Request('./',{cache:'no-cache'}))).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  const own=u.origin===self.location.origin,chartjs=u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('/chart.js');
  if(!own&&!chartjs)return;
  // fichiers chargés avec ?v=<empreinte build.json> (ou ancien horodatage) : une seule entrée de cache par fichier,
  // remplacée à chaque nouvelle version (réseau d'abord : une nouvelle empreinte = nouvelle requête, donc données fraîches).
  const key=own&&/^\?v=[\w.-]{1,40}$/.test(u.search)?u.origin+u.pathname:r;
  e.respondWith((async()=>{
    try{const res=await (own&&key===r?fetch(r.mode==='navigate'?r.url:r,{cache:'no-cache'}):fetch(r));if(res&&((res.ok&&(res.type==='basic'||res.type==='cors'))||(chartjs&&res.type==='opaque'))){const c=await caches.open(C);c.put(key,res.clone()).catch(()=>{})}return res}
    catch(err){const c=await caches.open(C);const hit=await c.match(key)||(r.mode==='navigate'?await c.match(new URL('./',self.location).href)||await c.match(new URL('index.html',self.location).href):null);if(hit)return hit;throw err}
  })())});
// Notifications (affichées par l'appli quand elle détecte des nouveautés) : un toucher ouvre/rafraîchit l'appli sur la bonne page.
self.addEventListener('notificationclick',e=>{e.notification.close();const link=(e.notification.data&&e.notification.data.link)||'#/',url=new URL('./'+(/^#\/[\w\/.-]*$/.test(link)?link:'#/'),self.location).href;
  e.waitUntil((async()=>{const L=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of L){if(c.url.startsWith(new URL('./',self.location).href)){try{await c.focus();if('navigate' in c)await c.navigate(url)}catch(x){}return}}if(self.clients.openWindow)await self.clients.openWindow(url)})())});
