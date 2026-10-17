// IDAD 9.0: offline assets only; student records remain in browser storage.
const CACHE='idad-mobile-v9-assets';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./engine.mjs','./importer.mjs','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('idad-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(response=>response.ok?response:Promise.reject()).catch(()=>caches.match('./index.html')));
  return;
 }
 event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req).then(response=>{
  if(response.ok&&['script','style','image','manifest'].includes(req.destination)){
   const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)));
  }
  return response;
 })));
});
