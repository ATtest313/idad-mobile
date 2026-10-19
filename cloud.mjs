import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './cloud-config.js';

export class CloudError extends Error {
 constructor(message,status=0,kind='request'){super(message);this.name='CloudError';this.status=status;this.kind=kind;}
}
const SS='idad-v10-session';
const json = x => JSON.stringify(x);

export class TeacherCloud {
 constructor(){
  this.base=String(SUPABASE_URL||'').trim().replace(/\/+$/,'');
  this.key=String(SUPABASE_PUBLISHABLE_KEY||'').trim();
  this.session=null;this.user=null;this.remember=false;this.refreshPromise=null;
 }
 get configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(this.base) && this.key.length>20 && !this.key.includes('PASTE_')}
 clearLocal(){sessionStorage.removeItem(SS);localStorage.removeItem(SS);this.session=null;this.user=null;}
 saveSession(session,remember=this.remember){
  this.session=session;this.remember=!!remember;
  sessionStorage.removeItem(SS);localStorage.removeItem(SS);
  if(session){(this.remember?localStorage:sessionStorage).setItem(SS,json({session,remember:this.remember}));}
 }
 async call(path,{method='GET',data,auth=false,headers={},retry=true}={}){
  if(auth)await this.ensureToken();
  const h={'apikey':this.key,'Accept':'application/json',...headers};
  if(data!==undefined)h['Content-Type']='application/json';
  if(auth)h['Authorization']='Bearer '+this.session.access_token;
  const request=()=>fetch(this.base+path,{method,headers:h,body:data===undefined?undefined:json(data),cache:'no-store',credentials:'omit'});
  let response;
  try{response=await request();}catch(e){throw new CloudError('تعذر الاتصال بالخادم. تحقق من الشبكة وأعد المحاولة.',0,'network')}
  if(response.status===401&&auth&&retry){await this.refresh();h.Authorization='Bearer '+this.session.access_token;return this.call(path,{method,data,auth,headers,retry:false});}
  const raw=await response.text();let payload=null;try{payload=raw?JSON.parse(raw):null}catch{payload=raw;}
  if(!response.ok){const msg=payload?.msg||payload?.message||payload?.error_description||payload?.error||'تعذر تنفيذ الطلب';throw new CloudError(String(msg),response.status,response.status===409?'conflict':'request');}
  return payload;
 }
 async ensureToken(){
  if(!this.session?.access_token)throw new CloudError('الرجاء تسجيل الدخول مجدداً',401,'auth');
  const expiry=Number(this.session.expires_at||0);
  if(expiry && Date.now()/1000>expiry-60)await this.refresh();
 }
 async refresh(){
  if(this.refreshPromise)return this.refreshPromise;
  this.refreshPromise=(async()=>{
   if(!this.session?.refresh_token)throw new CloudError('انتهت الجلسة، سجل الدخول مجدداً',401,'auth');
   const old=this.session;
   const result=await this.call('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:old.refresh_token}});
   this.saveSession({...old,...result,expires_at:Math.floor(Date.now()/1000)+Number(result.expires_in||3600)},this.remember);
   return this.session;
  })();
  try{return await this.refreshPromise}finally{this.refreshPromise=null}
 }
 async restore(){
  let message='';
  const fragment=location.hash.startsWith('#')?new URLSearchParams(location.hash.slice(1)):new URLSearchParams();
  if(fragment.get('error_description'))message=fragment.get('error_description');
  if(fragment.get('access_token') && fragment.get('refresh_token')){
   const result={access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token'),token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+Number(fragment.get('expires_in')||3600)};
   this.saveSession(result,false);
   history.replaceState(null,'',location.pathname+location.search);
  }else if(fragment.has('error_code')){
   history.replaceState(null,'',location.pathname+location.search);
  }else{
   let item=null;
   try{item=JSON.parse(sessionStorage.getItem(SS)||localStorage.getItem(SS)||'null')}catch{}
   if(item?.session){this.session=item.session;this.remember=!!item.remember;}
  }
  if(!this.session)return {authenticated:false,message};
  try{
   const user=await this.call('/auth/v1/user',{auth:true});
   if(!user?.id)throw Error('Invalid user');
   this.user=user;return {authenticated:true,message};
  }catch(e){this.clearLocal();return {authenticated:false,message:e.message||message};}
 }
 async login(email,password,remember){
  const r=await this.call('/auth/v1/token?grant_type=password',{method:'POST',data:{email,password}});
  if(!r?.access_token||!r?.user?.id)throw new CloudError('تعذر إنشاء جلسة مصادقة',401,'auth');
  this.saveSession({...r,expires_at:Math.floor(Date.now()/1000)+Number(r.expires_in||3600)},remember);
  this.user=r.user;return r;
 }
 async signup(email,password,remember){
  const url=encodeURIComponent(location.origin+location.pathname);
  const r=await this.call('/auth/v1/signup?redirect_to='+url,{method:'POST',data:{email,password}});
  if(r?.access_token && r?.user?.id){this.saveSession({...r,expires_at:Math.floor(Date.now()/1000)+Number(r.expires_in||3600)},remember);this.user=r.user;}
  return r;
 }
 async logout(){
  try{if(this.session?.access_token)await this.call('/auth/v1/logout',{method:'POST',auth:true})}catch{}finally{this.clearLocal()}
 }
 async getWorkspace(defaultValue){
  const uid=this.user?.id;
  if(!uid)throw new CloudError('تسجيل الدخول مطلوب',401,'auth');
  const route='/rest/v1/teacher_workspaces?select=owner_id,payload,revision&owner_id=eq.'+encodeURIComponent(uid)+'&limit=1';
  const rows=await this.call(route,{auth:true});
  if(Array.isArray(rows)&&rows.length)return rows[0];
  try{
   const inserted=await this.call('/rest/v1/teacher_workspaces',{method:'POST',auth:true,headers:{Prefer:'return=representation'},data:{owner_id:uid,payload:defaultValue,revision:1}});
   if(Array.isArray(inserted)&&inserted.length)return inserted[0];
   throw new CloudError('تعذر إنشاء مساحة المدرس',0);
  }catch(e){
   if(e.status!==409)return Promise.reject(e);
   const retry=await this.call(route,{auth:true});
   if(retry.length)return retry[0];
   throw e;
  }
 }
 async saveWorkspace(payload,revision){
  const uid=this.user?.id;
  if(!uid)throw new CloudError('تسجيل الدخول مطلوب',401,'auth');
  const route='/rest/v1/teacher_workspaces?owner_id=eq.'+encodeURIComponent(uid)+'&revision=eq.'+Number(revision)+'&select=revision';
  const result=await this.call(route,{method:'PATCH',auth:true,headers:{Prefer:'return=representation'},data:{payload,revision:Number(revision)+1}});
  if(!Array.isArray(result)||result.length!==1)throw new CloudError('تم تعديل البيانات من جهاز آخر. لن نكتب فوق التعديلات الجديدة.',409,'conflict');
  return Number(result[0].revision);
 }
}
