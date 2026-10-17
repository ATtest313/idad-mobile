/* إعداد 8 — auditable grading: official-reference optional templates, no imposed annual formula. */
export const ID = () => (globalThis.crypto?.randomUUID?.() || 'i'+Date.now().toString(36)+Math.random().toString(36).slice(2));
export const DEFAULT_CONFIG = () => ({
 scale:100,pass:50,precision:'integer',missing:'incomplete',
 periods:[{id:ID(),name:'الفترة الأولى',weight:1}],
 categories:[{id:ID(),name:'الاختبارات',max:60,method:'weighted',bestN:1},{id:ID(),name:'الأنشطة والواجبات',max:40,method:'weighted',bestN:1}],
 attendance:{mode:'none',penalty:0.5,cap:10,categoryId:'',lateFactor:0.5},
 annual:[{id:'periods',name:'معدل الفترات',source:'periods',weight:1}]
});
// The uploaded academic guidance is a template, never an obligatory rule.
// Activity (20) contains the daily quizzes (4), not an additional 20-point mark.
export function gradingTemplate(kind='theory',level='unspecified'){
 const cfg=DEFAULT_CONFIG();
 const activity=['الحضور اليومي','السلوك','المشاركات الصفية','مستلزمات الدرس','الامتحانات اليومية']
   .map(name=>({id:ID(),name,max:4,method:'weighted',bestN:1,group:'activity'}));
 let monthly=[];
 if(kind==='practical-card')monthly=[
  {id:ID(),name:'التحريري الشهري',max:40,method:'weighted',bestN:1,group:'monthly'},
  {id:ID(),name:'العملي (بطاقة تمارين + امتحان)',max:40,method:'practical_pair',bestN:1,group:'monthly'}];
 else if(kind==='practical-no-card')monthly=[
  {id:ID(),name:'التحريري الشهري',max:40,method:'weighted',bestN:1,group:'monthly'},
  {id:ID(),name:'الامتحان العملي الشهري',max:40,method:'weighted',bestN:1,group:'monthly'}];
 else if(kind==='drawing')monthly=[
  {id:ID(),name:'امتحان الرسم التحريري (تحويل من 100)',max:40,method:'weighted',bestN:1,group:'monthly'},
  {id:ID(),name:'اللوحات والواجبات (تحويل من 100)',max:40,method:'weighted',bestN:1,group:'monthly'}];
 else monthly=[{id:ID(),name:'الامتحان التحريري الشهري',max:80,method:'weighted',bestN:1,group:'monthly'}];
 cfg.categories=[...activity,...monthly];cfg.template=kind;
 cfg.missing='incomplete';cfg.attendance={mode:'none',penalty:0,cap:4,categoryId:'',lateFactor:0.5};
 const components=(kind==='theory')?[{id:ID(),name:'امتحان تحريري',max:100}]:
  [{id:ID(),name:'تحريري (نظري)',max:50},{id:ID(),name:'تطبيقي (عملي)',max:50}];
 cfg.stages=(kind==='theory'||level==='first'||level==='second')?[{id:ID(),name:'امتحان نصف السنة',scale:100,components:structuredClone(components)},
             {id:ID(),name:'امتحان نهاية السنة',scale:100,components:components.map(x=>({...x,id:ID()}))}]:[];
 cfg.educationLevel=level;
 return cfg;
}
export function stageFor(c,id){return (c.config.stages||[]).find(s=>s.id===id)}
export function stageScore(db,c,sid,stageId){
 const stage=stageFor(c,stageId);if(!stage)return {value:null,status:'not-found',parts:[]};
 const entries=stage.components.map(part=>({part,score:n(db.stageMarks?.[sid]?.[stage.id]?.[part.id])}));
 if(entries.some(e=>e.score!==null&&(!Number.isFinite(e.score)||e.score<0||e.score>+e.part.max)))return {value:null,status:'invalid',parts:entries};
 if(entries.every(e=>e.score===null))return {value:null,status:'empty',parts:entries};
 if(entries.some(e=>e.score===null))return {value:null,status:'incomplete',parts:entries};
 const total=entries.reduce((sum,e)=>sum+e.score,0);
 return {value:rounded(total,c.config.precision),status:'ready',parts:entries};
}
export function putStageMark(db,c,sid,stageId,componentId,raw){
 if(!db.students.some(s=>s.id===sid&&s.classId===c.id))throw Error('الطالب غير موجود في الشعبة');
 const stage=stageFor(c,stageId),part=stage?.components.find(x=>x.id===componentId);
 if(!part)throw Error('مكوّن امتحان غير معروف');
 const v=validNumber(raw,+part.max);db.stageMarks??={};db.stageMarks[sid]??={};db.stageMarks[sid][stageId]??={};
 if(v===null)delete db.stageMarks[sid][stageId][componentId];else db.stageMarks[sid][stageId][componentId]=v;
 return v;
}
export const newSchool=()=>({version:7,profile:{teacher:'',institution:'',year:''},classes:[],students:[],assessments:[],marks:{},attendance:{},manual:{},stageMarks:{},lessons:[],settings:{activeClass:null},updated:new Date().toISOString()});
export function n(v){if(v===null||v===undefined||v==='')return null; if(typeof v==='boolean')return null; const t=String(v).trim().replace(/[٠-٩]/g,x=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[۰-۹]/g,x=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x)));if(!t)return null;const x=Number(t);return Number.isFinite(x)?x:NaN}
export function within(v,max){const x=n(v);return x===null||Number.isFinite(x)&&x>=0&&x<=max}
export function validNumber(v,max){const x=n(v);if(x===null)return null;if(!Number.isFinite(x)||x<0||x>max)throw Error(`الدرجة يجب أن تكون بين 0 و ${max}`);return x}
export function rounded(v,precision){if(v===null)return null;let digits=precision==='two'?2:precision==='one'?1:0;let m=10**digits;return Math.round((v+Number.EPSILON)*m)/m}
export function configErrors(c){const out=[]; if(!c||!Number.isFinite(+c.scale)||+c.scale<=0||+c.scale>10000)out.push('سلم التقييم يجب أن يكون موجباً ولا يتجاوز 10000');if(!Number.isFinite(+c.pass)||+c.pass<0||+c.pass>+c.scale)out.push('درجة النجاح يجب أن تقع ضمن سلم التقييم');if(!Array.isArray(c.periods)||!c.periods.length)out.push('أضف فترة تقييم واحدة على الأقل');if(!Array.isArray(c.categories)||!c.categories.length)out.push('أضف عنصر تقييم واحداً على الأقل');let ids=new Set();for(const p of c.periods||[]){if(!p.name?.trim())out.push('اسم الفترة مطلوب');if(!(Number(p.weight)>=0)||!Number.isFinite(+p.weight))out.push('وزن الفترة غير صالح');if(ids.has(p.id))out.push('معرّف فترة مكرر');ids.add(p.id)}if(!(c.periods||[]).some(p=>+p.weight>0))out.push('يجب أن يكون وزن إحدى الفترات أكبر من صفر');ids=new Set();for(const cat of c.categories||[]){if(!cat.name?.trim())out.push('اسم عنصر التقييم مطلوب');if(!Number.isFinite(+cat.max)||+cat.max<=0||+cat.max>10000)out.push('الدرجة القصوى لعنصر التقييم غير صالحة');if(!['weighted','average','sum','highest','last','best','practical_pair'].includes(cat.method))out.push('طريقة تجميع غير صالحة');if(cat.method==='best'&&(!Number.isInteger(+cat.bestN)||+cat.bestN<1))out.push('عدد الاختبارات الأفضل يجب أن يكون 1 أو أكثر');if(ids.has(cat.id))out.push('معرّف عنصر مكرر');ids.add(cat.id)}if(!['incomplete','zero','available'].includes(c.missing))out.push('سياسة الدرجات الناقصة غير صالحة');if(!['none','deduct','category'].includes(c.attendance?.mode))out.push('سياسة الغياب غير صالحة');if(+c.attendance?.penalty<0||!Number.isFinite(+c.attendance?.penalty)||+c.attendance?.cap<0||!Number.isFinite(+c.attendance?.cap))out.push('قواعد خصم الغياب غير صالحة');if(c.attendance?.mode==='category'&&!c.categories.some(x=>x.id===c.attendance.categoryId))out.push('اختر عنصر تقييم مخصصاً للمواظبة');if(c.stages!==undefined){
 if(!Array.isArray(c.stages))out.push('قائمة الامتحانات المستقلة غير صالحة');
 else {const stageIds=new Set();for(const stage of c.stages){
  if(!stage.id||stageIds.has(stage.id))out.push('معرّف امتحان مستقل مكرر أو غير صالح');stageIds.add(stage.id);
  if(!stage.name?.trim()||!Number.isFinite(+stage.scale)||+stage.scale<=0)out.push('اسم الامتحان أو سلمه غير صالح');
  if(!Array.isArray(stage.components)||!stage.components.length)out.push('الامتحان المستقل يحتاج مكوّناً');
  else {const compIds=new Set();let sum=0;for(const part of stage.components){
   if(!part.id||compIds.has(part.id)||!part.name?.trim()||!Number.isFinite(+part.max)||+part.max<=0)out.push('مكوّن امتحان غير صالح');
   compIds.add(part.id);sum+=Number(part.max);
  }if(Math.abs(sum-Number(stage.scale))>1e-7)out.push(`مجموع مكونات «${stage.name}» (${sum}) يجب أن يساوي سلم الامتحان (${stage.scale})`);}
 }}
 };
 if((c.annual||[]).some(x=>x.source==='stage'&&!(c.stages||[]).some(t=>t.id===x.stageId)))out.push('مرحلة سنوية مرتبطة بامتحان مستقل غير موجود');
 if(!Array.isArray(c.annual)||!c.annual.length||!c.annual.some(x=>+x.weight>0))out.push('أضف مرحلة سنوية واحدة بوزن موجب');if((c.annual||[]).some(x=>!x.name?.trim()||!Number.isFinite(+x.weight)||+x.weight<0))out.push('اسم المرحلة السنوية أو وزنها غير صالح');return out;}
// Indexed read paths keep large class rosters responsive. Indices are strictly
// in-memory and invalidated by the existing mutation functions; no score formulas change.
const assessmentIndexCache=new WeakMap(),attendanceIndexCache=new WeakMap();
const emptyAttendance=()=>({absent:0,late:0,excused:0,present:0,total:0});
function getAttendanceIndex(db){
 let state=attendanceIndexCache.get(db);
 if(state?.records===db.attendance)return state.map;
 const map=new Map();
 for(const [key,status] of Object.entries(db.attendance||{})){
  const segments=key.split('|');if(segments.length<3)continue;
  const id=segments[0]+'|'+segments[1],value=map.get(id)||emptyAttendance();
  if(Object.hasOwn(value,status)){value[status]++;value.total++;map.set(id,value)}
 }
 attendanceIndexCache.set(db,{records:db.attendance,map});return map;
}
export function invalidateAttendanceIndex(db){attendanceIndexCache.delete(db)}
export const classFor=(db,id)=>db.classes.find(c=>c.id===id);
export const studentsFor=(db,id)=>db.students.filter(s=>s.classId===id);
export function eventsFor(db,cid,pid,catid){
 let state=assessmentIndexCache.get(db);
 if(!state||state.records!==db.assessments){
  const map=new Map();
  for(const ev of db.assessments){const key=ev.classId+'|'+ev.periodId+'|'+ev.categoryId;if(!map.has(key))map.set(key,[]);map.get(key).push(ev)}
  for(const ev of map.values())ev.sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.created||'').localeCompare(b.created||'')||a.id.localeCompare(b.id));
  assessmentIndexCache.set(db,state={records:db.assessments,map});
 }
 return state.map.get(cid+'|'+pid+'|'+catid)||[];
}

export function attendanceStats(db,studentId,periodId){const v=getAttendanceIndex(db).get(studentId+'|'+periodId);return v?{...v}:emptyAttendance()}
export function categoryScore(db,c,studentId,periodId,cat){const {attendance,missing}=c.config;
 if(attendance.mode==='category'&&attendance.categoryId===cat.id){const a=attendanceStats(db,studentId,periodId);if(!a.total)return {value:null,status:'no-events',earned:0,total:0,count:0};const deduction=Math.min(+attendance.cap,+attendance.penalty*(a.absent+a.late*(+attendance.lateFactor||0)));return {value:Math.max(0,+cat.max-deduction),status:'ready',count:a.total,earned:null,total:+cat.max};}
 const ev=eventsFor(db,c.id,periodId,cat.id);
 if(cat.method==='practical_pair'){
  // Practices are averaged as a group; the practical monthly exam is the second half.
  // If a course has NO practice card, a practical-only assessment supplies the full 40.
  if(!ev.length)return {value:missing==='zero'?0:null,status:'no-events',count:0,earned:0,total:0};
  const group=(role)=>ev.filter(e=>e.role===role);
  const practices=group('practice'),exams=group('practical_exam');
  const compute=(events)=>{if(!events.length)return null;let earned=0,total=0,missingCount=0;
   for(const event of events){let val=n(db.marks?.[event.id]?.[studentId]);if(val!==null&&(!Number.isFinite(val)||val<0||val>+event.max))return {error:true};
    if(val===null){missingCount++;if(missing==='available')continue;val=0;}
    earned+=val;total+=+event.max;
   }
   if(missing==='incomplete'&&missingCount)return {incomplete:true};
   if(!total)return {incomplete:true};
   return {ratio:earned/total,missingCount,earned,total};
  };
  if(!exams.length)return {value:null,status:'incomplete',count:ev.length,reason:'الامتحان العملي الشهري مطلوب'};
  if(ev.some(e=>!['practice','practical_exam'].includes(e.role)))return {value:null,status:'invalid',count:ev.length,reason:'صنّف سجلات العملي إلى تمارين أو امتحان عملي'};
  const practical=compute(exams),practice=compute(practices);
  if(practical?.error||practice?.error)return {value:null,status:'invalid',count:ev.length};
  if(practical?.incomplete||practice?.incomplete)return {value:null,status:'incomplete',count:ev.length};
  const ratio=practices.length?(practice.ratio+practical.ratio)/2:practical.ratio;
  return {value:ratio*+cat.max,status:practical.missingCount||practice?.missingCount?'partial':'ready',
   count:ev.length,earned:(practical.earned||0)+(practice?.earned||0),total:(practical.total||0)+(practice?.total||0),
   breakdown:{practice:practice?.ratio??null,exam:practical.ratio,formula:practices.length?'average-both':'exam-only'}};
 }
 if(!ev.length)return {value:missing==='zero'?0:null,status:'no-events',count:0,earned:0,total:0};
 let entries=[];for(const a of ev){const stored=db.marks?.[a.id]?.[studentId],v=n(stored);if(v!==null&&(!Number.isFinite(v)||v<0||v>+a.max))return {value:null,status:'invalid',count:ev.length};entries.push({value:v,max:+a.max,date:a.date,id:a.id});}
 const missingCount=entries.filter(x=>x.value===null).length;if(missing==='incomplete'&&missingCount)return {value:null,status:'incomplete',count:ev.length,missing:missingCount};
 if(missing==='available')entries=entries.filter(x=>x.value!==null);
 else entries=entries.map(x=>({...x,value:x.value??0}));
 if(!entries.length)return {value:null,status:'incomplete',count:ev.length,missing:missingCount};
 let ratio;const method=cat.method;if(method==='sum'){ratio=entries.reduce((s,x)=>s+x.value,0)/+cat.max;}else if(method==='weighted'){ratio=entries.reduce((s,x)=>s+x.value,0)/entries.reduce((s,x)=>s+x.max,0);}else if(method==='last'){const last=entries[entries.length-1];ratio=last.value/last.max;}else if(method==='highest'){ratio=Math.max(...entries.map(x=>x.value/x.max));}else if(method==='best'){const best=entries.map(x=>x.value/x.max).sort((a,b)=>b-a).slice(0,Math.max(1,Math.floor(+cat.bestN)));ratio=best.reduce((s,x)=>s+x,0)/best.length;}else{ratio=entries.reduce((s,x)=>s+x.value/x.max,0)/entries.length;}
 return {value:Math.max(0,Math.min(+cat.max,ratio*+cat.max)),status:missingCount?'partial':'ready',count:ev.length,missing:missingCount,earned:entries.reduce((s,x)=>s+x.value,0),total:entries.reduce((s,x)=>s+x.max,0)};
}
export function groupScore(db,c,sid,pid,group){
 const cats=c.config.categories.filter(x=>(x.group||'general')===group);
 if(!cats.length)return {value:null,max:0,status:'none'};
 const items=cats.map(cat=>categoryScore(db,c,sid,pid,cat));
 if(items.every(x=>x.status==='no-events'))return {value:null,max:cats.reduce((s,x)=>s+(+x.max),0),status:'empty'};
 if(items.some(x=>x.value===null))return {value:null,max:cats.reduce((s,x)=>s+(+x.max),0),status:'incomplete'};
 return {value:rounded(items.reduce((s,x)=>s+x.value,0),c.config.precision),max:cats.reduce((s,x)=>s+(+x.max),0),status:'ready'};
}
export function periodScore(db,c,sid,pid){const cfg=c.config,parts=cfg.categories.map(cat=>({...categoryScore(db,c,sid,pid,cat),cat}));const max=cfg.categories.reduce((s,x)=>s+(+x.max),0);if(!max)return {value:null,status:'invalid',parts};const ready=parts.filter(x=>x.value!==null);
 if(parts.every(x=>x.status==='no-events'))return {value:null,status:'empty',parts};
 if(!ready.length)return {value:null,status:'empty',parts};if(cfg.missing==='incomplete'&&ready.length!==parts.length)return {value:null,status:'incomplete',parts};
 const numerator=ready.reduce((s,x)=>s+x.value,0),denominator=cfg.missing==='available'?ready.reduce((s,x)=>s+(+x.cat.max),0):max;
 let v=denominator?numerator/denominator*+cfg.scale:null;const a=attendanceStats(db,sid,pid);let penalty=0;
 if(v!==null&&cfg.attendance.mode==='deduct'){penalty=Math.min(+cfg.attendance.cap,+cfg.attendance.penalty*(a.absent+a.late*(+cfg.attendance.lateFactor||0)));v=Math.max(0,v-penalty);}
 return {value:rounded(v,cfg.precision),status:parts.some(x=>x.status==='partial'||x.value===null)?'partial':'ready',parts,attendance:a,penalty};}
export function weightedCalc(xs,missing,precision){const eligible=xs.filter(x=>+x.weight>0);if(!eligible.length)return null;if(missing==='incomplete'&&eligible.some(x=>x.value===null))return null;const ready=eligible.filter(x=>x.value!==null);if(!ready.length)return null;const weight=missing==='available'?ready.reduce((s,x)=>s+(+x.weight),0):eligible.reduce((s,x)=>s+(+x.weight),0);const sum=ready.reduce((s,x)=>s+x.value*(+x.weight),0);return rounded(sum/weight,precision)}
export function termScore(db,c,sid){return weightedCalc(c.config.periods.map(p=>({value:periodScore(db,c,sid,p.id).value,weight:p.weight})),c.config.missing,c.config.precision)}
export function annualScore(db,c,sid){const xs=c.config.annual.map(x=>({weight:x.weight,value:x.source==='periods'?termScore(db,c,sid):x.source==='stage'?(()=>{const st=stageFor(c,x.stageId),v=stageScore(db,c,sid,x.stageId).value;return v===null?null:v/(+st.scale)*(+c.config.scale)})():n(db.manual?.[sid]?.[x.id])}));return weightedCalc(xs,c.config.missing,c.config.precision)}
export function putMark(db,c,eventId,studentId,raw){const ev=db.assessments.find(e=>e.id===eventId&&e.classId===c.id);if(!ev||!db.students.some(s=>s.id===studentId&&s.classId===c.id))throw Error('الطالب أو التقييم غير موجود في هذه الشعبة');const v=validNumber(raw,+ev.max);db.marks[ev.id]??={};if(v===null)delete db.marks[ev.id][studentId];else db.marks[ev.id][studentId]=v;return v;}
export function putManual(db,c,sid,partId,raw){if(!db.students.some(s=>s.id===sid&&s.classId===c.id))throw Error('طالب غير معروف');const part=c.config.annual.find(x=>x.id===partId&&x.source==='manual');if(!part)throw Error('مرحلة سنوية غير موجودة');const v=validNumber(raw,+c.config.scale);db.manual[sid]??={};if(v===null)delete db.manual[sid][partId];else db.manual[sid][partId]=v;return v;}
export function putAttendance(db,c,sid,pid,date,status){
 if(!c.config.periods.some(p=>p.id===pid)||!db.students.some(s=>s.id===sid&&s.classId===c.id)||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('سجل غياب غير صالح');
 if(!['present','absent','excused','late',''].includes(status))throw Error('حالة غياب غير صالحة');
 const key=`${sid}|${pid}|${date}`,before=db.attendance[key];
 if(status)db.attendance[key]=status;else delete db.attendance[key];
 const cache=attendanceIndexCache.get(db);
 if(cache?.records===db.attendance && before!==status){
  const sk=sid+'|'+pid,stat=cache.map.get(sk)||emptyAttendance();
  if(before && Object.hasOwn(stat,before)){stat[before]--;stat.total--}
  if(status){stat[status]++;stat.total++}
  if(stat.total)cache.map.set(sk,stat);else cache.map.delete(sk);
 }
}

export function createAssessment(db,c,{periodId,categoryId,title,max,date,role}){if(!c.config.periods.some(x=>x.id===periodId)||!c.config.categories.some(x=>x.id===categoryId)||!title?.trim())throw Error('اختر فترة وعنصر تقييم وعنواناً');const value=+max;if(!Number.isFinite(value)||value<=0||value>10000)throw Error('الدرجة القصوى للاختبار يجب أن تكون أكبر من صفر');const cat=c.config.categories.find(x=>x.id===categoryId);if(cat.method==='practical_pair'&&!['practice','practical_exam'].includes(role))throw Error('حدد: تمارين عملية أم امتحان عملي شهري');const a={id:ID(),classId:c.id,periodId,categoryId,title:title.trim(),max:value,role:cat.method==='practical_pair'?role:'regular',date:date||'',created:new Date().toISOString()};db.assessments.push(a);assessmentIndexCache.delete(db);return a;}
export function deleteAssessment(db,id){db.assessments=db.assessments.filter(x=>x.id!==id);assessmentIndexCache.delete(db);delete db.marks[id];}
export function changeMax(db,id,newMax,policy='reject'){const a=db.assessments.find(x=>x.id===id);if(!a)throw Error('تقييم غير موجود');const max=+newMax;if(!Number.isFinite(max)||max<=0||max>10000)throw Error('حد أقصى غير صالح');const invalid=Object.entries(db.marks[id]||{}).filter(([,score])=>score>max);if(invalid.length&&policy==='reject')throw Error(`هناك ${invalid.length} درجات تتجاوز الحد الجديد. عدّلها أولاً أو استعمل خيار ضبطها بعد التأكيد.`);if(invalid.length&&policy==='clamp')invalid.forEach(([sid])=>db.marks[id][sid]=max);a.max=max;return invalid.length;}
export function audit(db){const errors=[];for(const c of db.classes){for(const e of configErrors(c.config))errors.push(`${c.name}: ${e}`)}for(const c of db.classes){for(const st of studentsFor(db,c.id))for(const stage of c.config.stages||[])for(const comp of stage.components){const v=db.stageMarks?.[st.id]?.[stage.id]?.[comp.id];if(v!==undefined&&!within(v,+comp.max))errors.push(`درجة امتحان مستقل خارج الحدود: ${stage.name} / ${st.name}`)}}for(const e of db.assessments){const c=classFor(db,e.classId);if(!c||!c.config.periods.some(p=>p.id===e.periodId)||!c.config.categories.some(a=>a.id===e.categoryId))errors.push(`تقييم غير مرتبط: ${e.title}`);for(const [sid,v] of Object.entries(db.marks[e.id]||{}))if(!db.students.some(s=>s.id===sid&&s.classId===e.classId)||!within(v,+e.max))errors.push(`درجة خارج المدى في ${e.title}`);}return errors;}
export function normalizeImportedDb(raw){if(!raw||raw.version!==7||!Array.isArray(raw.classes)||!Array.isArray(raw.students)||!Array.isArray(raw.assessments)||!raw.marks||!raw.attendance||!raw.manual)throw Error('صيغة النسخة الاحتياطية غير متوافقة');if(raw.classes.length>1000||raw.students.length>50000||raw.assessments.length>50000)throw Error('حجم السجل يتجاوز الحدود');raw.stageMarks??={};const errors=audit(raw);if(errors.length)throw Error('توجد أخطاء في الملف: '+errors.slice(0,3).join('، '));return raw;}
