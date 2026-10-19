// IDAD 9.2 Android optimization — cache-first app shell; private teacher records stored server-side with Row Level Security.
const CACHE='idad-mobile-v10.0-assets';
const SHELL=['./','./index.html','./styles-v10.css','./app-v10.mjs','./engine-v10.mjs','./importer-v10.mjs','./cloud.mjs','./cloud-config.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('idad-mobile-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin)return;
 if(r.mode==='navigate'){
  e.respondWith(fetch(r).then(res=>{
   if(res.ok){const copy=res.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put('./index.html',copy)));}
   return res;
  }).catch(()=>caches.match('./index.html').then(c=>c||Response.error())));
  return;
 }
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(cached=>cached||fetch(r).then(res=>{
  if(res.ok){const copy=res.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)));}
  return res;
 })));
});
