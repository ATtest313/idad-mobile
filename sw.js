// IDAD 9.1 Android optimization — cache-first app shell; user data stays on device.
const CACHE='idad-mobile-v9.1-assets';
const SHELL=['./','./index.html','./styles.css','./app.mjs','./engine.mjs','./importer.mjs','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('idad-mobile-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin)return;
 if(r.mode==='navigate'){
  e.respondWith(caches.match('./index.html').then(cached=>cached||fetch(r).then(res=>res.ok?res:Promise.reject()).catch(()=>Response.error())));
  return;
 }
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(cached=>cached||fetch(r).then(res=>{
  if(res.ok){const copy=res.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)));}
  return res;
 })));
});
