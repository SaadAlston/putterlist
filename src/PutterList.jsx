import { supabase } from "./supabaseClient.js";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Plus, X, GripVertical, Calendar, Search, CheckCircle2, Clock, AlertCircle,
  ArrowRight, Trash2, Edit3, MoreHorizontal, TrendingUp,
  Moon, Sun, Users, LayoutDashboard, Menu,
  UserPlus, Check, Columns3, ShieldAlert
} from "lucide-react";

/* ── constants ── */
const COLUMNS = [
  { id: "todo", label: "To Do", short: "To Do", color: "#6366f1", bgLight: "#eef2ff", bgDark: "#1e1b4b" },
  { id: "progress", label: "In Progress", short: "Active", color: "#0d9488", bgLight: "#f0fdfa", bgDark: "#042f2e" },
  { id: "review", label: "Review", short: "Review", color: "#d97706", bgLight: "#fffbeb", bgDark: "#451a03" },
  { id: "blocked", label: "Blocked", short: "Blocked", color: "#ef4444", bgLight: "#fef2f2", bgDark: "#450a0a" },
  { id: "done", label: "Done", short: "Done", color: "#16a34a", bgLight: "#f0fdf4", bgDark: "#052e16" },
];
const PRIORITIES = [
  { id: "urgent", label: "Urgent", color: "#dc2626" },
  { id: "high", label: "High", color: "#ea580c" },
  { id: "medium", label: "Medium", color: "#d97706" },
  { id: "low", label: "Low", color: "#6b7280" },
];
const TAGS = ["Design", "Dev", "Strategy", "Content", "Meeting", "Follow-up", "Bug", "Feature"];
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/* ── hooks ── */
function useMediaQuery(q) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => { const mql = window.matchMedia(q); const h = e => setM(e.matches); mql.addEventListener("change", h); return () => mql.removeEventListener("change", h); }, [q]);
  return m;
}

/* ── logo ── */
function Logo({ size = 36 }) {
  const id = useMemo(() => `lg-${Math.random().toString(36).slice(2,6)}`, []);
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" role="img" aria-label="PutterList logo">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0d9488" /><stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill={`url(#${id})`} />
      <rect x="15" y="6" width="15" height="21" rx="3" fill="#fff" opacity="0.3" />
      <rect x="6" y="9" width="15" height="21" rx="3" fill="#fff" />
      <path d="M9.5 19.5 L12.5 22.5 L18 17" stroke="#0d9488" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── small components ── */
function ConfettiCanvas({ active }) {
  const ref = useRef(null), anim = useRef(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = window.innerWidth; c.height = window.innerHeight;
    const cols = ["#0d9488","#ea580c","#6366f1","#16a34a","#d97706","#ec4899"];
    const ps = Array.from({length:60},()=>({x:Math.random()*c.width,y:-20-Math.random()*80,w:5+Math.random()*5,h:3+Math.random()*3,color:cols[Math.floor(Math.random()*cols.length)],vx:(Math.random()-0.5)*3,vy:2+Math.random()*3,rot:Math.random()*360,rs:(Math.random()-0.5)*8,op:1}));
    const go = () => { ctx.clearRect(0,0,c.width,c.height); let alive=false; ps.forEach(p=>{if(p.op<=0)return;alive=true;p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.rot+=p.rs;p.op-=0.01;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.globalAlpha=Math.max(0,p.op);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();}); if(alive) anim.current=requestAnimationFrame(go); };
    anim.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(anim.current);
  }, [active]);
  if (!active) return null;
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999}} />;
}

function ProgressRing({ percent, size=36, stroke=3, color="#0d9488" }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, off=circ-(percent/100)*circ;
  return (<svg width={size} height={size} style={{transform:"rotate(-90deg)"}} role="img" aria-label={`${percent}% complete`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} opacity={0.12}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)"}}/></svg>);
}

function Avatar({ name, size=32 }) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const bg = `hsl(${name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360},50%,45%)`;
  return (<div role="img" aria-label={name} style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:size*0.36,fontWeight:600,flexShrink:0,letterSpacing:"-0.02em"}}>{initials}</div>);
}

function Toast({ message, onDone }) {
  useEffect(()=>{const t=setTimeout(onDone,2400);return()=>clearTimeout(t);},[onDone]);
  return (<div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:9000,background:"#0f172a",color:"#f1f5f9",padding:"12px 24px",borderRadius:12,fontSize:14,fontWeight:500,boxShadow:"0 8px 30px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",gap:8,animation:"toastIn 200ms ease-out",whiteSpace:"nowrap"}}><Check size={16} style={{color:"#34d399"}}/>{message}</div>);
}

/* ── task card ── */
function TaskCard({ task, dark, onEdit, onDelete, onMove, columns, people, isMobile, onTouchDragStart }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pri = PRIORITIES.find(p=>p.id===task.priority);
  const person = people.find(p=>p.id===task.personId);
  const overdue = task.dueDate && new Date(task.dueDate)<new Date() && task.column!=="done";
  const longPressRef = useRef(null);
  const startPosRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    const t = e.touches[0];
    startPosRef.current = { x: t.clientX, y: t.clientY };
    longPressRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30);
      onTouchDragStart(task, t.clientX, t.clientY, e.currentTarget);
    }, 280);
  };
  const handleTouchMove = (e) => {
    if (!startPosRef.current || !longPressRef.current) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - startPosRef.current.x);
    const dy = Math.abs(t.clientY - startPosRef.current.y);
    if (dx > 8 || dy > 8) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  };
  const handleTouchEnd = () => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } };

  return (
    <div
      draggable={!isMobile}
      onDragStart={e=>{e.dataTransfer.setData("taskId",task.id);e.currentTarget.style.opacity="0.4";}}
      onDragEnd={e=>{e.currentTarget.style.opacity="1";}}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      role="article" aria-label={`Task: ${task.title}`}
      style={{background:dark?"#1e293b":"#ffffff",borderRadius:12,padding:"14px 16px",cursor:isMobile?"default":"grab",border:`1px solid ${dark?"#334155":"#e2e8f0"}`,transition:"all 200ms cubic-bezier(0.4,0,0.2,1)",position:"relative",marginBottom:10,touchAction:"pan-y",WebkitUserSelect:"none",userSelect:"none"}}
      onMouseEnter={!isMobile?e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=dark?"0 4px 14px rgba(0,0,0,0.3)":"0 4px 14px rgba(0,0,0,0.07)";}:undefined}
      onMouseLeave={!isMobile?e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}:undefined}
    >
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
          {!isMobile && <GripVertical size={14} style={{color:dark?"#475569":"#cbd5e1",flexShrink:0}} />}
          <span style={{fontSize:14,fontWeight:500,color:dark?"#e2e8f0":"#1e293b",lineHeight:1.4}}>{task.title}</span>
        </div>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}} aria-label="Task actions"
          style={{background:"none",border:"none",cursor:"pointer",padding:8,color:dark?"#64748b":"#94a3b8",borderRadius:6,minWidth:32,minHeight:32,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <MoreHorizontal size={18}/>
        </button>
      </div>
      {task.description && <p style={{fontSize:12.5,color:dark?"#94a3b8":"#64748b",margin:`6px 0 0 ${isMobile?0:20}px`,lineHeight:1.4}}>{task.description.length>80?task.description.slice(0,80)+"...":task.description}</p>}
      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,flexWrap:"wrap"}}>
        {pri && <span style={{fontSize:11,fontWeight:600,color:pri.color,background:`${pri.color}15`,padding:"3px 10px",borderRadius:6}}>{pri.label}</span>}
        {task.column==="blocked" && <span style={{fontSize:11,fontWeight:600,color:"#ef4444",background:"#ef444415",padding:"3px 10px",borderRadius:6,display:"flex",alignItems:"center",gap:3}}><ShieldAlert size={11}/>Blocked</span>}
        {task.tags?.map(tag=><span key={tag} style={{fontSize:11,color:dark?"#94a3b8":"#64748b",background:dark?"#334155":"#f1f5f9",padding:"3px 10px",borderRadius:6}}>{tag}</span>)}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {task.dueDate && <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:overdue?"#dc2626":(dark?"#94a3b8":"#64748b"),fontWeight:overdue?600:400}}><Calendar size={13}/>{new Date(task.dueDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
          {task.subtasks?.length>0 && <span style={{fontSize:11.5,color:dark?"#94a3b8":"#64748b",display:"flex",alignItems:"center",gap:3}}><CheckCircle2 size={13}/>{task.subtasks.filter(s=>s.done).length}/{task.subtasks.length}</span>}
        </div>
        {person && !person.isAll && <Avatar name={person.name} size={24}/>}
      </div>
      {menuOpen && (<>
        <div style={{position:"fixed",inset:0,zIndex:90,background:isMobile?"rgba(0,0,0,0.4)":"transparent"}} onClick={e=>{e.stopPropagation();setMenuOpen(false);}} />
        <div style={isMobile?{position:"fixed",bottom:0,left:0,right:0,zIndex:91,background:dark?"#1e293b":"#fff",borderRadius:"16px 16px 0 0",padding:"8px 0",paddingBottom:"calc(12px + env(safe-area-inset-bottom, 16px))",boxShadow:"0 -8px 30px rgba(0,0,0,0.2)",animation:"sheetUp 200ms ease-out"}:{position:"absolute",right:0,top:40,zIndex:91,background:dark?"#1e293b":"#fff",border:`1px solid ${dark?"#334155":"#e2e8f0"}`,borderRadius:10,padding:4,minWidth:180,boxShadow:"0 8px 24px rgba(0,0,0,0.15)"}}>
          {isMobile && <div style={{width:36,height:4,borderRadius:2,background:dark?"#475569":"#cbd5e1",margin:"6px auto 8px"}}/>}
          <ActBtn icon={Edit3} label="Edit" dark={dark} onClick={()=>{onEdit(task);setMenuOpen(false);}} />
          {columns.filter(c=>c.id!==task.column).map(c=><ActBtn key={c.id} icon={c.id==="blocked"?ShieldAlert:ArrowRight} label={`Move to ${c.label}`} dark={dark} iconColor={c.color} onClick={()=>{onMove(task.id,c.id);setMenuOpen(false);}} />)}
          <ActBtn icon={Trash2} label="Delete" dark={dark} danger onClick={()=>{onDelete(task.id);setMenuOpen(false);}} />
          {isMobile && <div style={{height:8}}/>}
        </div>
      </>)}
    </div>
  );
}

/* ── compact mobile card ── */
function MiniCard({ task, dark, onEdit, onDelete, onMove, columns, people, onTouchDragStart }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pri = PRIORITIES.find(p=>p.id===task.priority);
  const person = people.find(p=>p.id===task.personId);
  const longPressRef = useRef(null);
  const startPosRef = useRef(null);

  const handleTS = (e) => {
    const t = e.touches[0];
    startPosRef.current = {x:t.clientX, y:t.clientY};
    longPressRef.current = setTimeout(()=>{
      if(navigator.vibrate) navigator.vibrate(30);
      onTouchDragStart(task, t.clientX, t.clientY, e.currentTarget);
    }, 280);
  };
  const handleTM = (e) => {
    if(!startPosRef.current||!longPressRef.current) return;
    const t=e.touches[0];
    if(Math.abs(t.clientX-startPosRef.current.x)>8||Math.abs(t.clientY-startPosRef.current.y)>8){clearTimeout(longPressRef.current);longPressRef.current=null;}
  };
  const handleTE = () => {if(longPressRef.current){clearTimeout(longPressRef.current);longPressRef.current=null;}};

  return (
    <div
      onTouchStart={handleTS} onTouchMove={handleTM} onTouchEnd={handleTE}
      onClick={()=>setMenuOpen(true)}
      role="article" aria-label={task.title}
      style={{
        background:dark?"#1e293b":"#fff", borderRadius:8, padding:"7px 6px",
        borderLeft:`3px solid ${pri?pri.color:(dark?"#334155":"#e2e8f0")}`,
        marginBottom:6, cursor:"pointer", touchAction:"none",
        WebkitUserSelect:"none", userSelect:"none",
        transition:"all 150ms",
      }}
    >
      <div style={{fontSize:11,fontWeight:500,color:dark?"#e2e8f0":"#1e293b",lineHeight:1.3,
        display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",
        wordBreak:"break-word"}}>
        {task.title}
      </div>
      {person && !person.isAll && (
        <div style={{marginTop:4,display:"flex",justifyContent:"flex-end"}}>
          <Avatar name={person.name} size={14}/>
        </div>
      )}
      {menuOpen && (<>
        <div style={{position:"fixed",inset:0,zIndex:90,background:"rgba(0,0,0,0.4)"}} onClick={e=>{e.stopPropagation();setMenuOpen(false);}} />
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:91,background:dark?"#1e293b":"#fff",borderRadius:"16px 16px 0 0",padding:"8px 0",paddingBottom:"calc(12px + env(safe-area-inset-bottom, 16px))",boxShadow:"0 -8px 30px rgba(0,0,0,0.2)",animation:"sheetUp 200ms ease-out"}}>
          <div style={{width:36,height:4,borderRadius:2,background:dark?"#475569":"#cbd5e1",margin:"6px auto 4px"}}/>
          <div style={{padding:"8px 20px 4px"}}><span style={{fontSize:15,fontWeight:600,color:dark?"#e2e8f0":"#1e293b"}}>{task.title}</span>
            {task.description&&<p style={{fontSize:13,color:dark?"#94a3b8":"#64748b",marginTop:4}}>{task.description}</p>}
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              {pri&&<span style={{fontSize:11,fontWeight:600,color:pri.color,background:`${pri.color}15`,padding:"2px 8px",borderRadius:5}}>{pri.label}</span>}
              {task.dueDate&&<span style={{fontSize:11,color:dark?"#94a3b8":"#64748b",display:"flex",alignItems:"center",gap:3}}><Calendar size={11}/>{new Date(task.dueDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
              {task.tags?.map(tag=><span key={tag} style={{fontSize:11,color:dark?"#94a3b8":"#64748b",background:dark?"#334155":"#f1f5f9",padding:"2px 8px",borderRadius:5}}>{tag}</span>)}
            </div>
          </div>
          <div style={{borderTop:`1px solid ${dark?"#334155":"#f1f5f9"}`,marginTop:8,paddingTop:4}}>
            <ActBtn icon={Edit3} label="Edit" dark={dark} onClick={()=>{onEdit(task);setMenuOpen(false);}}/>
            {columns.filter(c=>c.id!==task.column).map(c=><ActBtn key={c.id} icon={c.id==="blocked"?ShieldAlert:ArrowRight} label={`Move to ${c.label}`} dark={dark} iconColor={c.color} onClick={()=>{onMove(task.id,c.id);setMenuOpen(false);}}/>)}
            <ActBtn icon={Trash2} label="Delete" dark={dark} danger onClick={()=>{onDelete(task.id);setMenuOpen(false);}}/>
          </div>
          <div style={{height:8}}/>
        </div>
      </>)}
    </div>
  );
}

function ActBtn({ icon:Icon, label, dark, danger, iconColor, onClick }) {
  return (<button onClick={e=>{e.stopPropagation();onClick();}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"14px 20px",border:"none",background:"none",cursor:"pointer",fontSize:15,color:danger?"#dc2626":(dark?"#e2e8f0":"#334155"),borderRadius:8,textAlign:"left",minHeight:48}}><Icon size={18} style={{color:danger?"#dc2626":(iconColor||(dark?"#94a3b8":"#64748b"))}}/>{label}</button>);
}

/* ── modal shell ── */
function ModalShell({ onClose, dark, isMobile, title, children, footer }) {
  const ref = useRef(null);
  useEffect(()=>{
    const el=ref.current;if(!el) return;
    const focusable=el.querySelectorAll("input,select,textarea,button,[tabindex]");
    if(focusable.length) setTimeout(()=>focusable[0].focus(),50);
    const trap=e=>{if(e.key==="Escape")onClose();if(e.key!=="Tab"||!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
    document.addEventListener("keydown",trap);return()=>document.removeEventListener("keydown",trap);
  },[onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",animation:"fadeIn 150ms ease-out"}} onClick={onClose}>
      <div ref={ref} onClick={e=>e.stopPropagation()} style={isMobile?{background:dark?"#0f172a":"#fff",borderRadius:"18px 18px 0 0",width:"100%",maxHeight:"92dvh",overflow:"auto",paddingBottom:"env(safe-area-inset-bottom,16px)",animation:"sheetUp 250ms cubic-bezier(0.32,0.72,0,1)"}:{background:dark?"#0f172a":"#fff",borderRadius:14,width:"100%",maxWidth:520,maxHeight:"85vh",overflow:"auto",border:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",animation:"slideUp 200ms cubic-bezier(0.4,0,0.2,1)"}}>
        {isMobile && <div style={{width:36,height:4,borderRadius:2,background:dark?"#475569":"#cbd5e1",margin:"10px auto 4px"}}/>}
        <div style={{padding:"18px 20px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${dark?"#1e293b":"#f1f5f9"}`}}>
          <h2 style={{fontSize:18,fontWeight:700,color:dark?"#f1f5f9":"#0f172a",margin:0}}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",cursor:"pointer",color:dark?"#64748b":"#94a3b8",padding:8,borderRadius:8,minWidth:40,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={22}/></button>
        </div>
        <div style={{padding:"16px 20px"}}>{children}</div>
        {footer && <div style={{padding:"14px 20px 18px",borderTop:`1px solid ${dark?"#1e293b":"#f1f5f9"}`,display:"flex",justifyContent:"flex-end",gap:10}}>{footer}</div>}
      </div>
    </div>
  );
}

/* ── task modal ── */
function TaskModal({ task, onSave, onClose, dark, people, isMobile }) {
  const isEdit=!!task?.id;
  const [f,setF]=useState({title:task?.title||"",description:task?.description||"",priority:task?.priority||"medium",column:task?.column||"todo",personId:task?.personId||(people.find(p=>!p.isAll)?.id||""),dueDate:task?.dueDate||"",tags:task?.tags||[],subtasks:task?.subtasks||[]});
  const [sub,setSub]=useState("");
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <ModalShell onClose={onClose} dark={dark} isMobile={isMobile} title={isEdit?"Edit Task":"New Task"} footer={<><MBtn label="Cancel" dark={dark} ghost onClick={onClose}/><MBtn label={isEdit?"Save":"Create Task"} onClick={()=>{if(!f.title.trim())return;onSave({...task,...f,id:task?.id||genId(),createdAt:task?.createdAt||new Date().toISOString()});}} disabled={!f.title.trim()}/></>}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Fld label="Title" dark={dark}><input value={f.title} onChange={e=>up("title",e.target.value)} placeholder="What needs to be done?" style={inp(dark)}/></Fld>
        <Fld label="Description" dark={dark}><textarea value={f.description} onChange={e=>up("description",e.target.value)} placeholder="Add details..." rows={3} style={{...inp(dark),resize:"vertical",fontFamily:"inherit"}}/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Person" dark={dark}><select value={f.personId} onChange={e=>up("personId",e.target.value)} style={inp(dark)}><option value="">Unassigned</option>{people.filter(p=>!p.isAll).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Fld>
          <Fld label="Priority" dark={dark}><select value={f.priority} onChange={e=>up("priority",e.target.value)} style={inp(dark)}>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Status" dark={dark}><select value={f.column} onChange={e=>up("column",e.target.value)} style={inp(dark)}>{COLUMNS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></Fld>
          <Fld label="Due Date" dark={dark}><input type="date" value={f.dueDate} onChange={e=>up("dueDate",e.target.value)} style={inp(dark)}/></Fld>
        </div>
        <Fld label="Tags" dark={dark}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{TAGS.map(tag=><button key={tag} onClick={()=>up("tags",f.tags.includes(tag)?f.tags.filter(t=>t!==tag):[...f.tags,tag])} style={{padding:"6px 14px",borderRadius:8,fontSize:13,fontWeight:500,border:`1px solid ${f.tags.includes(tag)?"#0d9488":(dark?"#334155":"#e2e8f0")}`,background:f.tags.includes(tag)?"#0d948815":"transparent",color:f.tags.includes(tag)?"#0d9488":(dark?"#94a3b8":"#64748b"),cursor:"pointer",transition:"all 150ms",minHeight:36}}>{tag}</button>)}</div></Fld>
        <Fld label="Subtasks" dark={dark}>
          {f.subtasks.map(st=><div key={st.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><input type="checkbox" checked={st.done} onChange={()=>up("subtasks",f.subtasks.map(s=>s.id===st.id?{...s,done:!s.done}:s))} style={{accentColor:"#0d9488",width:18,height:18,cursor:"pointer"}}/><span style={{fontSize:14,color:st.done?(dark?"#64748b":"#94a3b8"):(dark?"#e2e8f0":"#334155"),textDecoration:st.done?"line-through":"none",flex:1}}>{st.text}</span><button onClick={()=>up("subtasks",f.subtasks.filter(s=>s.id!==st.id))} aria-label="Remove" style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:6,minWidth:32,minHeight:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}><X size={16}/></button></div>)}
          <div style={{display:"flex",gap:8}}><input value={sub} onChange={e=>setSub(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&sub.trim()){up("subtasks",[...f.subtasks,{id:genId(),text:sub.trim(),done:false}]);setSub("");}}} placeholder="Add a subtask..." style={{...inp(dark),flex:1}}/><button onClick={()=>{if(!sub.trim())return;up("subtasks",[...f.subtasks,{id:genId(),text:sub.trim(),done:false}]);setSub("");}} aria-label="Add" style={{background:"#0d9488",color:"#fff",border:"none",borderRadius:10,padding:"0 16px",cursor:"pointer",fontSize:20,fontWeight:300,minHeight:46}}>+</button></div>
        </Fld>
      </div>
    </ModalShell>
  );
}

function PersonModal({ person, onSave, onClose, dark, isMobile }) {
  const [name,setName]=useState(person?.name||"");
  const [role,setRole]=useState(person?.role||"");
  return (
    <ModalShell onClose={onClose} dark={dark} isMobile={isMobile} title={person?"Edit Person":"Add Person"} footer={<><MBtn label="Cancel" dark={dark} ghost onClick={onClose}/><MBtn label={person?"Save":"Add"} onClick={()=>{if(!name.trim())return;onSave({id:person?.id||genId(),name:name.trim(),role:role.trim()});}} disabled={!name.trim()}/></>}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Fld label="Name" dark={dark}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" style={inp(dark)}/></Fld>
        <Fld label="Role / Context" dark={dark}><input value={role} onChange={e=>setRole(e.target.value)} placeholder="Client, friend, team..." style={inp(dark)}/></Fld>
      </div>
    </ModalShell>
  );
}

/* ── primitives ── */
function Fld({label,dark,children}){return <div><label style={{display:"block",fontSize:12,fontWeight:600,color:dark?"#94a3b8":"#64748b",marginBottom:6,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</label>{children}</div>;}
function MBtn({label,onClick,dark,ghost,disabled}){return <button onClick={onClick} disabled={disabled} style={{padding:"12px 22px",borderRadius:10,border:ghost?`1px solid ${dark?"#334155":"#e2e8f0"}`:"none",background:ghost?"transparent":"#0d9488",color:ghost?(dark?"#e2e8f0":"#334155"):"#fff",cursor:disabled?"default":"pointer",fontSize:14,fontWeight:600,opacity:disabled?0.45:1,transition:"all 150ms",minHeight:46,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>{label}</button>;}
const inp=(dark)=>({width:"100%",padding:"12px 14px",borderRadius:10,fontSize:14,border:`1px solid ${dark?"#334155":"#e2e8f0"}`,background:dark?"#1e293b":"#f8fafc",color:dark?"#e2e8f0":"#0f172a",outline:"none",boxSizing:"border-box",transition:"border-color 150ms",minHeight:46,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"});

/* ══════════════════════ MAIN APP ══════════════════════ */
function Board() {
  const prefDark = useMediaQuery("(prefers-color-scheme:dark)");
  const isMobile = useMediaQuery("(max-width:768px)");
  const [darkOverride, setDarkOverride] = useState(null);
  const dark = darkOverride !== null ? darkOverride : prefDark;

  const [people, setPeople] = useState([{id:"p1",name:"All Tasks",isAll:true}]);
  const [tasks, setTasks] = useState([]);
  const [activePerson, setActivePerson] = useState("p1");
  const [view, setView] = useState("board");
  const [taskModal, setTaskModal] = useState(null);
  const [personModal, setPersonModal] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filterPri, setFilterPri] = useState("");
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  /* touch drag state */
  const [dragTask, setDragTask] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dragCardSize, setDragCardSize] = useState({w:200,h:60});
  const colRefs = useRef({});

  const showToast = useCallback(msg=>setToast(msg),[]);
  const triggerDone = useCallback(()=>{setConfetti(true);setTimeout(()=>setConfetti(false),2200);showToast("Task completed");},[showToast]);

  /* touch drag handlers */
  const handleTouchDragStart = useCallback((task, x, y, el) => {
    const rect = el.getBoundingClientRect();
    setDragCardSize({w:rect.width, h:Math.min(rect.height,80)});
    setDragTask(task);
    setDragPos({x, y});
    document.body.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    if (!dragTask) return;
    const onMove = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      setDragPos({x:t.clientX, y:t.clientY});
      let found = null;
      for (const [colId, el] of Object.entries(colRefs.current)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
          found = colId; break;
        }
      }
      setDropTarget(found);
    };
    const onEnd = () => {
      if (dropTarget && dropTarget !== dragTask.column) {
        if (dropTarget === "done" && dragTask.column !== "done") triggerDone();
        else showToast(`Moved to ${COLUMNS.find(c=>c.id===dropTarget)?.label}`);
        setTasks(prev => prev.map(t => t.id === dragTask.id ? {...t, column: dropTarget} : t));
      }
      setDragTask(null); setDragPos(null); setDropTarget(null);
      document.body.style.overflow = "";
    };
    document.addEventListener("touchmove", onMove, {passive:false});
    document.addEventListener("touchend", onEnd);
    return () => { document.removeEventListener("touchmove", onMove); document.removeEventListener("touchend", onEnd); };
  }, [dragTask, dropTarget, triggerDone, showToast]);

  /* storage */
  useEffect(()=>{
    (async()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if(!user){ setLoaded(true); return; }

      const [{ data: peopleRows }, { data: taskRows }] = await Promise.all([
        supabase.from("people").select("*").order("created_at"),
        supabase.from("tasks").select("*").order("created_at"),
      ]);

      const loadedPeople = [{ id:"p1", name:"All Tasks", isAll:true }, ...(peopleRows||[]).map(p=>({id:p.id,name:p.name,role:p.role||""}))];
      const loadedTasks = (taskRows||[]).map(t=>({
        id:t.id, title:t.title, description:t.description||"", priority:t.priority,
        column:t.column_id, personId:t.person_id||"", dueDate:t.due_date||"",
        tags:t.tags||[], subtasks:t.subtasks||[], createdAt:t.created_at,
      }));
      setPeople(loadedPeople);
      setTasks(loadedTasks);

      const savedDark = localStorage.getItem("putterlist-theme-override");
      if(savedDark !== null) setDarkOverride(savedDark === "true" ? true : savedDark === "false" ? false : null);

      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{
    if(darkOverride===null) localStorage.removeItem("putterlist-theme-override");
    else localStorage.setItem("putterlist-theme-override", String(darkOverride));
  },[darkOverride]);

  const filtered = useMemo(()=>{let t=tasks;if(activePerson!=="p1")t=t.filter(tk=>tk.personId===activePerson);if(search)t=t.filter(tk=>tk.title.toLowerCase().includes(search.toLowerCase()));if(filterPri)t=t.filter(tk=>tk.priority===filterPri);return t;},[tasks,activePerson,search,filterPri]);

  const handleDrop = useCallback(colId=>e=>{
    e.preventDefault();
    const tid=e.dataTransfer.getData("taskId");
    setTasks(prev=>{
      const tk=prev.find(t=>t.id===tid);
      if(!tk||tk.column===colId) return prev;
      if(colId==="done"&&tk.column!=="done") triggerDone();
      else showToast(`Moved to ${COLUMNS.find(c=>c.id===colId)?.label}`);
      supabase.from("tasks").update({ column_id: colId }).eq("id", tid).then();
      return prev.map(t=>t.id===tid?{...t,column:colId}:t);
    });
  },[triggerDone,showToast]);

  const moveTask = useCallback((tid,colId)=>{
    setTasks(prev=>{
      const tk=prev.find(t=>t.id===tid);
      if(colId==="done"&&tk?.column!=="done") triggerDone();
      else showToast(`Moved to ${COLUMNS.find(c=>c.id===colId)?.label}`);
      supabase.from("tasks").update({ column_id: colId }).eq("id", tid).then();
      return prev.map(t=>t.id===tid?{...t,column:colId}:t);
    });
  },[triggerDone,showToast]);

  const saveTask = useCallback(async tk=>{
    const isNew = !tasks.find(t=>t.id===tk.id);
    const row = {
      title: tk.title, description: tk.description||null, priority: tk.priority,
      column_id: tk.column, person_id: tk.personId||null, due_date: tk.dueDate||null,
      tags: tk.tags||[], subtasks: tk.subtasks||[],
    };
    if(isNew){
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("tasks").insert({ ...row, owner_id: user.id }).select().single();
      if(!error && data) setTasks(prev=>[...prev, { ...tk, id: data.id, createdAt: data.created_at }]);
    } else {
      setTasks(prev=>prev.map(t=>t.id===tk.id?tk:t));
      supabase.from("tasks").update(row).eq("id", tk.id).then();
    }
    setTaskModal(null);
    showToast(isNew?"Task created":"Task saved");
  },[showToast,tasks]);

  const deleteTask = useCallback(id=>{
    setTasks(p=>p.filter(t=>t.id!==id));
    showToast("Task deleted");
    supabase.from("tasks").delete().eq("id", id).then();
  },[showToast]);

  const savePerson = useCallback(async p=>{
    const isNew = !people.find(x=>x.id===p.id);
    if(isNew){
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("people").insert({ name: p.name, role: p.role||null, owner_id: user.id }).select().single();
      if(!error && data) setPeople(prev=>[...prev, { id: data.id, name: data.name, role: data.role||"" }]);
    } else {
      setPeople(prev=>prev.map(x=>x.id===p.id?p:x));
      supabase.from("people").update({ name: p.name, role: p.role||null }).eq("id", p.id).then();
    }
    setPersonModal(null);
    showToast(`${p.name} added`);
  },[showToast,people]);

  const deletePerson = useCallback(id=>{
    setPeople(p=>p.filter(x=>x.id!==id));
    setTasks(p=>p.filter(t=>t.personId!==id));
    if(activePerson===id) setActivePerson("p1");
    showToast("Person removed");
    supabase.from("people").delete().eq("id", id).then();
  },[activePerson,showToast]);

  const stats = useMemo(()=>{const pt=activePerson==="p1"?tasks:tasks.filter(t=>t.personId===activePerson);const total=pt.length,done=pt.filter(t=>t.column==="done").length,overdue=pt.filter(t=>t.dueDate&&new Date(t.dueDate)<new Date()&&t.column!=="done").length,prog=pt.filter(t=>t.column==="progress").length,blocked=pt.filter(t=>t.column==="blocked").length;return{total,done,overdue,inProgress:prog,blocked,percent:total?Math.round(done/total*100):0};},[tasks,activePerson]);
  const pStats = useCallback(pid=>{const pt=tasks.filter(t=>t.personId===pid);const total=pt.length,done=pt.filter(t=>t.column==="done").length;return{total,done,percent:total?Math.round(done/total*100):0};},[tasks]);

  const bg=dark?"#0f172a":"#f8fafc",cardBg=dark?"#1e293b":"#ffffff",txt=dark?"#f1f5f9":"#0f172a",txt2=dark?"#94a3b8":"#64748b",brd=dark?"#1e293b":"#e2e8f0";
  const activePersonName = people.find(p=>p.id===activePerson)?.name||"Tasks";

  if(!loaded) return (<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",background:bg,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><Logo size={48}/><p style={{color:txt2,marginTop:12,fontSize:14}}>Loading PutterList...</p></div></div>);

  return (
    <div style={{fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",height:"100dvh",display:"flex",flexDirection:isMobile?"column":"row",background:bg,color:txt,overflow:"hidden",WebkitFontSmoothing:"antialiased"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes drawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${dark?"#334155":"#cbd5e1"};border-radius:3px;}
        input:focus,select:focus,textarea:focus{border-color:#0d9488!important;box-shadow:0 0 0 3px rgba(13,148,136,0.12)!important;}
        select{-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px!important;}
        @media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}}
      `}</style>

      <ConfettiCanvas active={confetti}/>
      {toast && <Toast message={toast} onDone={()=>setToast("")}/>}

      {/* drag ghost */}
      {dragTask && dragPos && (
        <div style={{position:"fixed",left:dragPos.x-(isMobile?50:dragCardSize.w/2),top:dragPos.y-24,width:isMobile?100:dragCardSize.w,zIndex:9998,pointerEvents:"none",opacity:0.92,transform:"rotate(2deg) scale(1.03)",transition:"none"}}>
          <div style={{background:dark?"#1e293b":"#fff",borderRadius:isMobile?8:12,padding:isMobile?"6px 8px":"12px 16px",border:`2px solid #0d9488`,boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
            <span style={{fontSize:isMobile?11:14,fontWeight:500,color:dark?"#e2e8f0":"#1e293b",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{dragTask.title}</span>
          </div>
        </div>
      )}

      {/* ── SIDEBAR / DRAWER ── */}
      {(isMobile ? drawerOpen : true) && (<>
        {isMobile && <div style={{position:"fixed",inset:0,zIndex:70,background:"rgba(0,0,0,0.5)"}} onClick={()=>setDrawerOpen(false)}/>}
        <aside style={{...(isMobile?{position:"fixed",top:0,left:0,bottom:0,zIndex:71,width:280,animation:"drawerIn 250ms cubic-bezier(0.32,0.72,0,1)"}:{width:260,minWidth:260}),background:dark?"#0b1120":"#fff",borderRight:`1px solid ${brd}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* logo */}
          <div style={{padding:"20px 20px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${brd}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Logo size={36}/>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:txt,letterSpacing:"-0.03em"}}>
                  Putter<span style={{fontWeight:400}}>List</span>
                </div>
                <div style={{fontSize:10,color:txt2,fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase"}}>Task Control</div>
              </div>
            </div>
            {isMobile && <button onClick={()=>setDrawerOpen(false)} aria-label="Close menu" style={{background:"none",border:"none",cursor:"pointer",color:txt2,padding:8,borderRadius:8,minWidth:40,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={22}/></button>}
          </div>
          {/* nav */}
          <div style={{padding:"12px 12px 8px"}}>
            {[{id:"board",icon:Columns3,label:"Board"},{id:"dashboard",icon:TrendingUp,label:"Dashboard"}].map(({id,icon:Icon,label})=>(<button key={id} onClick={()=>{setView(id);if(isMobile)setDrawerOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",borderRadius:8,border:"none",background:view===id?(dark?"#1e293b":"#f0fdfa"):"transparent",color:view===id?"#0d9488":txt2,cursor:"pointer",fontSize:14,fontWeight:view===id?600:400,transition:"all 150ms",textAlign:"left",marginBottom:2,minHeight:44}}><Icon size={18}/>{label}</button>))}
          </div>
          {/* people */}
          <div style={{padding:"4px 12px 0",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:txt2,textTransform:"uppercase",letterSpacing:"0.08em"}}>People</span>
              <button onClick={()=>setPersonModal({})} aria-label="Add person" style={{background:"none",border:"none",cursor:"pointer",color:"#0d9488",padding:6,borderRadius:6,minWidth:32,minHeight:32,display:"flex",alignItems:"center",justifyContent:"center"}}><UserPlus size={16}/></button>
            </div>
            <div style={{overflowY:"auto",flex:1}}>
              {people.map(p=>{const ps=!p.isAll?pStats(p.id):null;return(<button key={p.id} onClick={()=>{setActivePerson(p.id);if(isMobile)setDrawerOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:8,border:"none",background:activePerson===p.id?(dark?"#1e293b":"#f0fdfa"):"transparent",color:activePerson===p.id?"#0d9488":txt,cursor:"pointer",fontSize:14,fontWeight:activePerson===p.id?600:400,transition:"all 150ms",textAlign:"left",marginBottom:2,minHeight:44}}>{p.isAll?<Users size={18} style={{color:activePerson===p.id?"#0d9488":txt2}}/>:<Avatar name={p.name} size={28}/>}<div style={{flex:1,minWidth:0}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>{p.role&&<div style={{fontSize:11,color:txt2,fontWeight:400}}>{p.role}</div>}</div>{ps&&ps.total>0&&<ProgressRing percent={ps.percent} size={26} stroke={2.5}/>}</button>);})}
            </div>
          </div>
          <div style={{padding:12,borderTop:`1px solid ${brd}`}}>
            <button onClick={()=>setDarkOverride(dark?false:true)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",borderRadius:8,border:"none",background:"transparent",color:txt2,cursor:"pointer",fontSize:13,textAlign:"left",minHeight:44}}>{dark?<Sun size={16}/>:<Moon size={16}/>}{dark?"Light Mode":"Dark Mode"}</button>
            <button onClick={()=>supabase.auth.signOut()} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",borderRadius:8,border:"none",background:"transparent",color:txt2,cursor:"pointer",fontSize:13,textAlign:"left",minHeight:44}}>Sign Out</button>
          </div>
        </aside>
      </>)}

      {/* ── MAIN ── */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {/* header */}
        <header style={{padding:isMobile?"12px 16px":"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${brd}`,background:dark?"#0b1120":"#fff",gap:12,flexShrink:0,minHeight:isMobile?56:64}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
            {isMobile&&<button onClick={()=>setDrawerOpen(true)} aria-label="Open menu" style={{background:"none",border:"none",cursor:"pointer",color:txt2,padding:8,borderRadius:8,minWidth:40,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center"}}><Menu size={22}/></button>}
            <div style={{minWidth:0}}>
              <h1 style={{fontSize:isMobile?16:20,fontWeight:700,letterSpacing:"-0.02em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activePersonName}</h1>
              {!isMobile&&stats.total>0&&<span style={{fontSize:12,color:txt2}}>{stats.done} of {stats.total} complete ({stats.percent}%){stats.overdue>0&&<span style={{color:"#dc2626",fontWeight:600}}> / {stats.overdue} overdue</span>}{stats.blocked>0&&<span style={{color:"#ef4444",fontWeight:600}}> / {stats.blocked} blocked</span>}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile?<button onClick={()=>setSearchOpen(!searchOpen)} aria-label="Search" style={{background:"none",border:"none",cursor:"pointer",color:txt2,padding:8,borderRadius:8,minWidth:40,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center"}}><Search size={20}/></button>:(
              <div style={{display:"flex",alignItems:"center",gap:8,background:dark?"#1e293b":"#f1f5f9",borderRadius:10,padding:"8px 14px"}}><Search size={16} style={{color:txt2}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{border:"none",background:"transparent",outline:"none",fontSize:14,color:txt,width:140,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}/></div>
            )}
            {!isMobile&&<select value={filterPri} onChange={e=>setFilterPri(e.target.value)} aria-label="Filter" style={{padding:"10px 34px 10px 14px",borderRadius:10,fontSize:13,border:`1px solid ${brd}`,background:dark?"#1e293b":"#f8fafc",color:txt,cursor:"pointer",outline:"none",minHeight:42,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}><option value="">All Priorities</option>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>}
            <button onClick={()=>setTaskModal({column:"todo",personId:activePerson==="p1"?"":activePerson})} aria-label="Create task" style={{display:"flex",alignItems:"center",gap:6,...(isMobile?{width:42,height:42,borderRadius:12,justifyContent:"center",padding:0}:{padding:"10px 20px",borderRadius:10}),border:"none",background:"#0d9488",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,transition:"all 150ms",minHeight:42}}><Plus size={18}/>{!isMobile&&"New Task"}</button>
          </div>
        </header>

        {/* mobile search */}
        {isMobile&&searchOpen&&<div style={{padding:"8px 16px",background:dark?"#0b1120":"#fff",borderBottom:`1px solid ${brd}`,display:"flex",gap:8}}><div style={{flex:1,display:"flex",alignItems:"center",gap:8,background:dark?"#1e293b":"#f1f5f9",borderRadius:10,padding:"8px 14px"}}><Search size={16} style={{color:txt2}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..." autoFocus style={{border:"none",background:"transparent",outline:"none",fontSize:14,color:txt,width:"100%",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}/></div><select value={filterPri} onChange={e=>setFilterPri(e.target.value)} style={{padding:"8px 30px 8px 10px",borderRadius:10,fontSize:13,border:`1px solid ${brd}`,background:dark?"#1e293b":"#f8fafc",color:txt,minHeight:42,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}><option value="">All</option>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></div>}


        {/* ── BOARD VIEW ── */}
        {view==="board" ? (
          isMobile ? (
            /* ── MOBILE: compact 5-column board ── */
            <div style={{flex:1,display:"flex",gap:4,padding:"8px 6px",overflowY:"auto",paddingBottom:"calc(70px + env(safe-area-inset-bottom, 0px))"}}>
              {COLUMNS.map(col=>{
                const colTasks=filtered.filter(t=>t.column===col.id);
                const isDropHere = dragTask && dropTarget === col.id;
                return (
                  <div key={col.id} ref={el=>{colRefs.current[col.id]=el;}}
                    style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",borderRadius:10,
                      transition:"background 150ms",
                      background:isDropHere?(dark?col.bgDark:col.bgLight):"transparent"}}>
                    {/* compact column header */}
                    <div style={{textAlign:"center",padding:"6px 2px 4px",borderBottom:`2.5px solid ${col.color}`,marginBottom:6}}>
                      <div style={{fontSize:9,fontWeight:700,color:col.color,textTransform:"uppercase",letterSpacing:"0.04em",lineHeight:1,marginBottom:3}}>{col.short}</div>
                      <div style={{fontSize:15,fontWeight:800,color:txt}}>{colTasks.length}</div>
                    </div>
                    {/* cards */}
                    <div style={{flex:1,overflowY:"auto",padding:"0 2px 4px"}}>
                      {colTasks.map(task=>(
                        <MiniCard key={task.id} task={task} dark={dark} onEdit={t=>setTaskModal(t)} onDelete={deleteTask} onMove={moveTask} columns={COLUMNS} people={people} onTouchDragStart={handleTouchDragStart}/>
                      ))}
                    </div>
                    <button onClick={()=>setTaskModal({column:col.id,personId:activePerson==="p1"?"":activePerson})}
                      aria-label={`Add to ${col.label}`}
                      style={{margin:"2px 4px 6px",padding:"6px 0",borderRadius:6,border:`1.5px dashed ${dark?"#334155":"#e2e8f0"}`,
                        background:"transparent",cursor:"pointer",color:txt2,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",minHeight:32}}>
                      <Plus size={14}/>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── DESKTOP: full kanban ── */
            <div style={{flex:1,display:"flex",gap:16,padding:20,overflowX:"auto",overflowY:"hidden"}}>
              {COLUMNS.map(col=>{
                const colTasks=filtered.filter(t=>t.column===col.id);
                const isDropHere = dragTask && dropTarget === col.id;
                return (
                  <div key={col.id} ref={el=>{colRefs.current[col.id]=el;}}
                    onDragOver={e=>{e.preventDefault();e.currentTarget.style.background=dark?col.bgDark:col.bgLight;}}
                    onDragLeave={e=>{e.currentTarget.style.background="transparent";}}
                    onDrop={e=>{handleDrop(col.id)(e);e.currentTarget.style.background="transparent";}}
                    style={{flex:1,minWidth:220,maxWidth:340,display:"flex",flexDirection:"column",borderRadius:12,transition:"background 200ms",background:isDropHere?(dark?col.bgDark:col.bgLight):"transparent"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {col.id==="blocked"?<ShieldAlert size={12} style={{color:col.color}}/>:<div style={{width:10,height:10,borderRadius:"50%",background:col.color}}/>}
                        <span style={{fontSize:14,fontWeight:700,color:txt}}>{col.label}</span>
                        <span style={{fontSize:12,fontWeight:600,color:txt2,background:dark?"#1e293b":"#f1f5f9",padding:"2px 8px",borderRadius:10}}>{colTasks.length}</span>
                      </div>
                      <button onClick={()=>setTaskModal({column:col.id,personId:activePerson==="p1"?"":activePerson})} aria-label={`Add to ${col.label}`} style={{background:"none",border:"none",cursor:"pointer",color:txt2,padding:6,borderRadius:6,minWidth:32,minHeight:32,display:"flex",alignItems:"center",justifyContent:"center"}}><Plus size={16}/></button>
                    </div>
                    <div style={{flex:1,overflowY:"auto",padding:"0 6px 8px",minHeight:100}}>
                      {colTasks.length===0?(
                        <div style={{padding:"32px 16px",textAlign:"center",border:`2px dashed ${brd}`,borderRadius:12,color:txt2,fontSize:13}}>Drop tasks here</div>
                      ):colTasks.map(task=>(
                        <TaskCard key={task.id} task={task} dark={dark} onEdit={t=>setTaskModal(t)} onDelete={deleteTask} onMove={moveTask} columns={COLUMNS} people={people} isMobile={false} onTouchDragStart={handleTouchDragStart}/>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── DASHBOARD ── */
          <div style={{flex:1,overflowY:"auto",padding:isMobile?16:24,paddingBottom:isMobile?"calc(80px + env(safe-area-inset-bottom, 0px))":24}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:isMobile?10:14,marginBottom:24}}>
              {[{label:"Total",value:stats.total,icon:LayoutDashboard,color:"#6366f1"},{label:"Active",value:stats.inProgress,icon:Clock,color:"#0d9488"},{label:"Blocked",value:stats.blocked,icon:ShieldAlert,color:"#ef4444"},{label:"Done",value:stats.done,icon:CheckCircle2,color:"#16a34a"},{label:"Overdue",value:stats.overdue,icon:AlertCircle,color:"#dc2626"}].map(s=>(
                <div key={s.label} style={{background:cardBg,borderRadius:12,padding:isMobile?"14px 16px":"18px 20px",border:`1px solid ${brd}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:11,color:txt2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.label}</span><s.icon size={16} style={{color:s.color}}/></div>
                  <div style={{fontSize:isMobile?22:28,fontWeight:800,color:txt,letterSpacing:"-0.03em"}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{background:cardBg,borderRadius:12,padding:isMobile?16:20,border:`1px solid ${brd}`,marginBottom:24}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:14,fontWeight:700,color:txt}}>Overall Progress</span><span style={{fontSize:14,fontWeight:700,color:"#0d9488"}}>{stats.percent}%</span></div>
              <div style={{height:8,borderRadius:4,background:dark?"#1e293b":"#f1f5f9",overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:"linear-gradient(90deg,#0d9488,#14b8a6)",width:`${stats.percent}%`,transition:"width 600ms cubic-bezier(0.4,0,0.2,1)"}}/></div>
            </div>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:14,color:txt}}>People</h3>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
              {people.filter(p=>!p.isAll).map(p=>{const ps=pStats(p.id),pt=tasks.filter(t=>t.personId===p.id);return(
                <div key={p.id} onClick={()=>{setActivePerson(p.id);setView("board");}} style={{background:cardBg,borderRadius:12,padding:isMobile?16:20,border:`1px solid ${brd}`,cursor:"pointer",transition:"all 150ms"}} onMouseEnter={!isMobile?e=>{e.currentTarget.style.borderColor="#0d9488";}:undefined} onMouseLeave={!isMobile?e=>{e.currentTarget.style.borderColor=brd;}:undefined}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}><Avatar name={p.name} size={isMobile?32:36}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:700,color:txt}}>{p.name}</div>{p.role&&<div style={{fontSize:12,color:txt2}}>{p.role}</div>}</div><ProgressRing percent={ps.percent} size={36} stroke={3}/></div>
                  <div style={{display:"flex",gap:4}}>{COLUMNS.map(col=>{const count=pt.filter(t=>t.column===col.id).length;return(<div key={col.id} style={{flex:1,textAlign:"center",padding:"8px 2px",background:dark?col.bgDark:col.bgLight,borderRadius:6}}><div style={{fontSize:14,fontWeight:700,color:col.color}}>{count}</div><div style={{fontSize:9,color:txt2,fontWeight:500}}>{col.short}</div></div>);})}</div>
                </div>
              );})}
              {people.filter(p=>!p.isAll).length===0&&(<div style={{padding:isMobile?32:40,textAlign:"center",border:`2px dashed ${brd}`,borderRadius:12,gridColumn:"1/-1"}}><Users size={28} style={{color:txt2,marginBottom:10}}/><p style={{color:txt2,fontSize:14,marginBottom:14}}>Add your first person to get started</p><button onClick={()=>setPersonModal({})} style={{padding:"12px 24px",borderRadius:10,border:"none",background:"#0d9488",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,minHeight:46,display:"inline-flex",alignItems:"center",gap:8}}><UserPlus size={16}/>Add Person</button></div>)}
            </div>
          </div>
        )}
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile&&!dragTask&&(<nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:60,background:dark?"#0b1120":"#fff",borderTop:`1px solid ${brd}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom, 0px)"}} role="navigation" aria-label="Main">
        {[{id:"board",icon:Columns3,label:"Board"},{id:"dashboard",icon:TrendingUp,label:"Dashboard"},{id:"people",icon:Users,label:"People"}].map(({id,icon:Icon,label})=>(<button key={id} onClick={()=>{if(id==="people"){setDrawerOpen(true);return;}setView(id);}} aria-label={label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 0 8px",border:"none",background:"transparent",cursor:"pointer",color:view===id&&id!=="people"?"#0d9488":txt2,fontSize:10,fontWeight:600,transition:"color 150ms",minHeight:50}}><Icon size={20}/>{label}</button>))}
      </nav>)}

      {taskModal&&<TaskModal task={taskModal} onSave={saveTask} onClose={()=>setTaskModal(null)} dark={dark} people={people} isMobile={isMobile}/>}
      {personModal!==null&&<PersonModal person={personModal.id?personModal:null} onSave={savePerson} onClose={()=>setPersonModal(null)} dark={dark} isMobile={isMobile}/>}
    </div>
  );
}

/* ══════════════════════ AUTH GATE ══════════════════════ */
function LoginScreen({ dark }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const bg = dark ? "#0f172a" : "#f8fafc";
  const txt = dark ? "#f1f5f9" : "#0f172a";
  const txt2 = dark ? "#94a3b8" : "#64748b";
  const cardBg = dark ? "#1e293b" : "#ffffff";
  const brd = dark ? "#334155" : "#e2e8f0";

  const sendLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: bg, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", padding: 20,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 380, background: cardBg, borderRadius: 16, padding: 32, border: `1px solid ${brd}`, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <Logo size={44} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: txt, marginTop: 14, letterSpacing: "-0.02em" }}>
            Putter<span style={{ fontWeight: 400 }}>List</span>
          </h1>
          <p style={{ fontSize: 13, color: txt2, marginTop: 4 }}>Task control, one board per person</p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ fontSize: 14, color: txt, fontWeight: 600, marginBottom: 6 }}>Check your inbox</p>
            <p style={{ fontSize: 13, color: txt2 }}>We sent a sign-in link to {email}</p>
          </div>
        ) : (
          <form onSubmit={sendLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14, border: `1px solid ${brd}`, background: dark ? "#0f172a" : "#f8fafc", color: txt, outline: "none", boxSizing: "border-box" }}
            />
            {err && <p style={{ fontSize: 12, color: "#dc2626" }}>{err}</p>}
            <button type="submit" disabled={busy} style={{ padding: "12px 0", borderRadius: 10, border: "none", background: "#0d9488", color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Sending..." : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PutterList() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const prefDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme:dark)").matches;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // brief flash, avoids login/board jump
  if (!session) return <LoginScreen dark={prefDark} />;
  return <Board key={session.user.id} />;
}

