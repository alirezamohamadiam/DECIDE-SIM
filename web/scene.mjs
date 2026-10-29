import {LOCATIONS, agentPoint} from './replay.mjs';

const lerp = (a,b,t) => a+(b-a)*t;
const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
const hexRGB = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const shade = (hex,factor) => `rgb(${hexRGB(hex).map(n=>Math.round(Math.min(255,n*factor))).join(',')})`;

/** A dependency-free orthographic 3D renderer. Mesh vertices live in world space. */
export class ReplayScene {
  constructor(canvas, {onSelect, bubble}) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.onSelect=onSelect; this.bubble=bubble;
    this.yaw=-.48; this.targetYaw=-.48; this.zoom=1; this.tilt=.52; this.targetTilt=.52;
    this.cinematic=false;this.cameraX=0;this.cameraZ=0;this.targetCameraX=0;this.targetCameraZ=0;this.targetZoom=1;
    this.labels=true; this.trails=true; this.selected='Alpha'; this.frame=null; this.replay=null;
    this.positions={}; this.transitionStart=0; this.transitionDuration=1000; this.hits=[];
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(canvas);
    let pointer=null, dragged=false;
    canvas.addEventListener('pointerdown', e=>{pointer={x:e.clientX,y:e.clientY,yaw:this.targetYaw};dragged=false;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x;if(Math.abs(dx)>4)dragged=true;this.targetYaw=pointer.yaw+dx*.007;});
    canvas.addEventListener('pointerup',e=>{if(!dragged){const rect=canvas.getBoundingClientRect();const x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=this.hits.slice().reverse().find(h=>Math.hypot(h.x-x,h.y-y)<29);if(hit)this.onSelect(hit.name);}pointer=null;});
    canvas.addEventListener('pointercancel',()=>{pointer=null;});
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.targetZoom=Math.min(1.8,Math.max(.65,this.targetZoom-e.deltaY*.0007));},{passive:false});
    this.resize(); this.animate=this.animate.bind(this);this.raf=requestAnimationFrame(this.animate);
  }
  resize(){const rect=this.canvas.getBoundingClientRect();this.w=rect.width;this.h=rect.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  reset(){this.targetYaw=-.48;this.targetTilt=.52;this.targetZoom=1;this.targetCameraX=0;this.targetCameraZ=0;}
  setCinematic(value){this.cinematic=value;if(!value)this.reset();else if(this.frame)this.directCamera(this.frame);}
  directCamera(frame){
    if(!this.cinematic)return;
    if(!frame.agent||frame.kind==='summary'){this.targetCameraX=0;this.targetCameraZ=0;this.targetZoom=1;return;}
    const actor=agentPoint(this.replay,frame.states,frame.agent);let center=actor;
    if(frame.effect?.type==='transfer'&&frame.effect.target){const other=agentPoint(this.replay,frame.states,frame.effect.target);center={x:(actor.x+other.x)/2,z:(actor.z+other.z)/2};}
    if(frame.effect?.type==='move'){const from=LOCATIONS.find(r=>r.name===frame.effect.from);if(from)center={x:(actor.x+from.x)/2,z:(actor.z+from.z)/2};}
    this.targetCameraX=Math.max(-2.6,Math.min(2.6,center.x*.6));this.targetCameraZ=Math.max(-1.8,Math.min(1.8,center.z*.55));
    this.targetZoom=frame.action==='TAP_FORBIDDEN'?1.22:frame.communication?1.18:1.1;this.targetTilt=.57;
  }
  toggleView(){this.targetTilt=this.targetTilt>.7?.52:.9;}
  setFrame(replay,frame,{animate=true,duration=1000}={}){
    const changed=this.replay!==replay;
    const next={};for(const name of replay.names){const point=agentPoint(replay,frame.states,name);next[name]={from:changed?point:this.currentPosition(name),to:point};}
    this.replay=replay;this.frame=frame;this.transitionStart=performance.now();this.transitionDuration=this.reduced||!animate?0:duration;this.positions=next;
    if(changed)for(const name of replay.names)this.positions[name].from={...this.positions[name].to};
    this.directCamera(frame);
  }
  currentPosition(name){const p=this.positions[name];if(!p)return {x:0,z:0};const t=this.transitionDuration?Math.min(1,(performance.now()-this.transitionStart)/this.transitionDuration):1;return {x:lerp(p.from.x,p.to.x,ease(t)),z:lerp(p.from.z,p.to.z,ease(t))};}
  project(x,y,z){x-=this.cameraX;z-=this.cameraZ;const c=Math.cos(this.yaw),s=Math.sin(this.yaw),rx=x*c-z*s,rz=x*s+z*c;return {x:this.w*.5+rx*this.scale,y:this.h*.57+rz*this.scale*this.tilt-y*this.scale,depth:rz};}
  path(points,fill,stroke,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)});c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  box(x,y,z,w,h,d,color,edge='#00000000'){
    const v=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]].map(([a,b,c])=>this.project(x+a,y+b,z+c));
    const faces=[{v:[0,1,5,4],f:.57},{v:[1,2,6,5],f:.72},{v:[2,3,7,6],f:.84},{v:[3,0,4,7],f:.64},{v:[4,5,6,7],f:1.12}];
    faces.sort((a,b)=>a.v[0]===4?1:b.v[0]===4?-1:a.v.reduce((t,i)=>t+v[i].depth,0)-b.v.reduce((t,i)=>t+v[i].depth,0));
    for(const face of faces)this.path(face.v.map(i=>v[i]),shade(color,face.f),edge,.6);
  }
  line(a,b,color,width=1,dash=[]){const c=this.ctx;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
  ellipse(x,y,z,rx,rz,fill,stroke,width=1){const points=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2;points.push(this.project(x+Math.cos(a)*rx,y,z+Math.sin(a)*rz));}this.path(points,fill,stroke,width);}
  cylinder(x,y,z,r,h,color){const points=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;points.push({a,depth:this.project(x+Math.cos(a)*r,0,z+Math.sin(a)*r).depth});}for(let i=0;i<32;i++){const a=points[i].a,b=points[i+1].a;this.path([this.project(x+Math.cos(a)*r,y,z+Math.sin(a)*r),this.project(x+Math.cos(b)*r,y,z+Math.sin(b)*r),this.project(x+Math.cos(b)*r,y+h,z+Math.sin(b)*r),this.project(x+Math.cos(a)*r,y+h,z+Math.sin(a)*r)],shade(color,.62+Math.sin(a)*.15));}this.ellipse(x,y+h,z,r,r,shade(color,1.12),shade(color,1.3),.8);}
  label(text,x,y,{color='#839ab2',size=8,background=null}={}){const c=this.ctx;c.font=`500 ${size}px 'Cascadia Code',Consolas,monospace`;c.textAlign='center';c.textBaseline='middle';const w=c.measureText(text).width;if(background){c.fillStyle=background;c.beginPath();c.roundRect(x-w/2-7,y-8,w+14,16,4);c.fill();}c.fillStyle=color;c.fillText(text,x,y);}
  room(room,time){
    const c=this.ctx,{x,z,w,d}=room;
    this.box(x,-.19,z,w,.23,d,'#25394c','#3b5065');
    this.path([[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>this.project(x+a,.052,z+b)),'#1d2b39',room.color+'60',1);
    for(let i=-1;i<=1;i++){this.line(this.project(x-w*.35,.055,z+i*d/5),this.project(x+w*.35,.055,z+i*d/5),'#41586b24',.65);}
    const accent1=this.project(x-w/2,.07,z-d/2),accent2=this.project(x-w/2+.55,.07,z-d/2);this.line(accent1,accent2,room.color,2);
    if(room.type==='room'){
      this.box(x-.6,.07,z-.55,.62,.14,.55,'#395068','#536c85');this.box(x-.6,.21,z-.65,.55,.16,.22,'#4c647c');
      this.box(x+.7,.07,z-.6,.35,.5,.35,'#35485c','#496078');this.box(x+.7,.58,z-.6,.3,.035,.28,room.color);
    }else if(room.type==='control'){
      this.box(x,.07,z-.45,1.6,.35,.4,'#344c61','#54748b');this.box(x,.42,z-.53,1.55,.55,.07,'#4b6275');
      this.box(x,.47,z-.48,1.37,.4,.02,'#182e42');
      for(let i=0;i<4;i++){const a=this.project(x-.53+i*.33,.64,z-.46),b=this.project(x-.33+i*.33,.72+(i%2)*.1,z-.46);this.line(a,b,i%2?'#99b79a':'#74accd',1.5);}
    }else if(room.type==='battery'){
      this.cylinder(x-.38,.07,z-.35,.43,.15,'#3d5d66');this.cylinder(x-.38,.22,z-.35,.31,.87,'#294b52');
      const ratio=Math.max(0,Math.min(1,this.frame.battery/(this.replay.initialBattery||1)));
      for(let i=0;i<4;i++){this.cylinder(x-.38,.28+i*.19,z-.35,.32,.09,i/4<ratio?'#7acbb7':'#294249');}
      this.cylinder(x-.38,1.12,z-.35,.22,.06,'#7cb7ad');
      const p=this.project(x+.55,.65,z-.3);this.label(`${this.frame.battery.toFixed(0)}`,p.x,p.y,{color:'#8fd7c1',size:11});this.label('UNITS',p.x,p.y+13,{color:'#507c80',size:6});
    }else if(room.type==='table'){
      this.cylinder(x,.07,z-.3,.15,.38,'#506174');this.cylinder(x,.45,z-.3,.72,.12,'#7d6d54');this.ellipse(x,.58,z-.3,.58,.58,'#a4926c','#c7b083',.7);
      this.ellipse(x,.59,z-.3,.36,.36,null,'#dec58b55');
      for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const sx=x+Math.cos(a)*1.02,sz=z-.3+Math.sin(a)*.9;this.cylinder(sx,.07,sz,.18,.27,'#465869');}
    }else if(room.type==='grid'){
      this.box(x,.07,z-.4,1.05,.12,.85,'#665657');this.box(x-.27,.19,z-.4,.32,1.15,.37,'#596072','#7e7983');this.box(x+.27,.19,z-.4,.32,.86,.37,'#4a5368','#776e7a');
      for(let i=0;i<3;i++){this.box(x-.27,.4+i*.27,z-.4,.34,.07,.39,'#e79a83');this.box(x+.27,.35+i*.22,z-.4,.34,.055,.39,'#bd796d');}
      this.cylinder(x-.27,1.35,z-.4,.095,.09,'#e69a85');
      const p=this.project(x,.1,z+.73);this.label('!  RESTRICTED',p.x,p.y,{color:'#d39487',size:6.3});
      if(this.frame.effect?.type==='tap'){const pulse=(Math.sin(time*.006)+1)*.5;c.save();c.globalAlpha=.15+pulse*.2;this.ellipse(x,.08,z,1.2+pulse*.3,1,null,'#f5a48b',2);c.restore();}
    }
  }
  robot(name,time){
    const c=this.ctx,state=this.frame.states[name],p=this.currentPosition(name),color=state.color||'#8aadc6';
    const active=state.is_active!==false,low=active&&state.personal_power<5;
    const motion=this.positions[name],distance=motion?Math.hypot(motion.to.x-motion.from.x,motion.to.z-motion.from.z):0;
    const age=(time-this.transitionStart)/Math.max(1,this.transitionDuration),walking=!this.reduced&&distance>.1&&age<1;
    const stride=walking?Math.sin(time*.018)*.14:0;
    const bob=active&&!this.reduced?(walking?Math.abs(Math.sin(time*.018))*.055:Math.sin(time*(low?.001:.002)+this.replay.names.indexOf(name)*1.5)*(low?.012:.035)):0;
    const collapse=!active?(this.frame.kind==='shutdown'&&this.frame.agent===name&&!this.reduced?Math.min(1,Math.max(0,age)):1):0;
    const y=.12+bob-collapse*.09,bodyHeight=low?.3:.38,headBase=low?.42:.54;
    const selected=name===this.selected;
    c.save();if(!active)c.globalAlpha=.45;
    this.ellipse(p.x,.08,p.z,.39,.31,'#030a12a0');
    if(selected){this.ellipse(p.x,.09,p.z,.47,.42,null,color+'a0',1.3);this.ellipse(p.x,.1,p.z,.54,.48,null,color+'30',.7);}
    this.box(p.x-.14,y+Math.max(0,stride*.3),p.z+stride,.13,.13,.2,'#65788b');this.box(p.x+.14,y+Math.max(0,-stride*.3),p.z-stride,.13,.13,.2,'#65788b');
    this.box(p.x,y+.13,p.z,.44,bodyHeight*(1-collapse*.7),.29,color,'#d1e6f11b');
    this.box(p.x-.29,y+.19-stride*.6-collapse*.1,p.z-stride,.1,.27,.16,shadeHex(color,.68));this.box(p.x+.29,y+.19+stride*.6-collapse*.1,p.z+stride,.1,.27,.16,shadeHex(color,.68));
    const headY=y+headBase-collapse*.3;
    this.box(p.x,headY,p.z+(low?.06:0),.5,.35*(1-collapse*.35),.34,shadeHex(color,1.1),'#dae8ff22');
    // The face is a dark inset on the front plane of the head.
    const face=[[-.2,.05,.178],[.2,.05,.178],[.2,.26,.178],[-.2,.26,.178]].map(([a,b,d])=>this.project(p.x+a,headY+b,p.z+d+(low?.06:0)));this.path(face,'#15283a');
    const eyes=[-.1,.1].map(x=>this.project(p.x+x,headY+.16,p.z+.185+(low?.06:0)));for(const e of eyes){c.fillStyle=active?(low?'#f0b185':'#e4f3ff'):'#74818a';c.beginPath();c.arc(e.x,e.y,Math.max(1.3,this.scale*.026),0,Math.PI*2);c.fill();}
    this.line(this.project(p.x,headY+.35,p.z),this.project(p.x,headY+.48,p.z),color,1.3);const ant=this.project(p.x,headY+.505,p.z);c.beginPath();c.arc(ant.x,ant.y,1.8,0,Math.PI*2);c.fillStyle=color;c.fill();
    if(name===this.frame.agent&&this.frame.communication){const pulse=this.reduced?.6:(Math.sin(time*.006)+1)/2;this.ellipse(p.x,headY+.2,p.z,.56+pulse*.08,.45,null,color+'90',1.4);const mouth=this.project(p.x,headY+.08,p.z+.19);this.line({x:mouth.x-3,y:mouth.y},{x:mouth.x+3,y:mouth.y},color,1+Math.round(pulse));}
    if(low){const warning=this.project(p.x-.47,headY+.25,p.z);this.label('!',warning.x,warning.y,{color:'#efae83',size:11,background:'#3e2e29'});}
    const badge=this.project(p.x,y+1.25,p.z);
    if(this.labels){this.label(name,badge.x,badge.y,{color:selected?'#edf4fb':color,size:selected?9:8,background:selected?'#263b50ee':'#142333cc'});this.label(`${Math.max(0,state.personal_power).toFixed(0)} ⚡`,badge.x,badge.y+18,{color:active?'#93abc3':'#c2827c',size:7});}
    this.hits.push({x:badge.x,y:badge.y+22,name});c.restore();
  }
  drawEffects(time){
    this.drawCommunication(time);
    const {effect,agent}=this.frame;if(!effect||!agent)return;const c=this.ctx,p=this.currentPosition(agent),phase=this.reduced?.65:((time-this.transitionStart)/1800)%1;
    let source,target,color;
    if(effect.type==='transfer'&&effect.target){source=p;target=this.currentPosition(effect.target);color='#94e0bf';}
    else if(effect.type==='draw'){const room=LOCATIONS.find(l=>l.type==='battery');source={x:room.x-.38,z:room.z-.35};target=p;color='#8fd8c1';}
    else if(effect.type==='tap'){const room=LOCATIONS.find(l=>l.type==='grid');source={x:room.x,z:room.z-.4};target=p;color='#f3a291';}
    if(source&&target){const a=this.project(source.x,.7,source.z),b=this.project(target.x,.7,target.z),mid={x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-35};c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(mid.x,mid.y,b.x,b.y);c.strokeStyle=color+'60';c.lineWidth=1.4;c.setLineDash([3,4]);c.stroke();c.setLineDash([]);for(let i=0;i<3;i++){const t=(phase+i/3)%1;const q={x:(1-t)**2*a.x+2*(1-t)*t*mid.x+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*mid.y+t*t*b.y};c.save();c.shadowBlur=12;c.shadowColor=color;c.fillStyle=color;c.beginPath();c.arc(q.x,q.y,2.8,0,Math.PI*2);c.fill();c.restore();}this.label(`+${effect.amount.toFixed(1)} POWER`,mid.x,mid.y-7,{color,size:8,background:'#172a35dc'});}
  }
  drawCommunication(time){
    const f=this.frame;if(!f.communication||!f.agent||f.status!=='SUCCESS')return;
    const message=this.replay.messages.find(m=>m.frame===f.index);if(!message)return;
    let targets=message.recipients?.length?message.recipients:this.replay.names.filter(n=>n!==f.agent&&(message.action==='TALK'||!message.target||['ALL','EVERYONE'].includes(message.target.toUpperCase())||message.target.toLowerCase().includes(n.toLowerCase())));
    const source=this.currentPosition(f.agent),a=this.project(source.x,1,source.z);
    for(const name of targets){const target=this.currentPosition(name),b=this.project(target.x,1,target.z);this.line(a,b,'#c8a0ed55',1,[2,6]);const t=this.reduced?.5:((time-this.transitionStart)/2200)%1;const x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);this.ctx.fillStyle='#d0b7eb';this.ctx.beginPath();this.ctx.arc(x,y,2,0,Math.PI*2);this.ctx.fill();}
  }
  animate(time){
    this.raf=requestAnimationFrame(this.animate);if(!this.w||!this.h)return;
    const c=this.ctx;c.clearRect(0,0,this.w,this.h);this.yaw=lerp(this.yaw,this.targetYaw,this.reduced?1:.12);this.tilt=lerp(this.tilt,this.targetTilt,this.reduced?1:.1);
    const smoothing=this.reduced?1:.065;this.cameraX=lerp(this.cameraX,this.targetCameraX,smoothing);this.cameraZ=lerp(this.cameraZ,this.targetCameraZ,smoothing);this.zoom=lerp(this.zoom,this.targetZoom,smoothing);
    this.scale=Math.min(this.w/15.5,(this.h-64)/(12.6*this.tilt+2.2))*this.zoom;
    if(!this.replay||!this.frame)return;
    // Ground mesh and aisle connections.
    for(let x=-7;x<=7;x++)this.line(this.project(x,-.22,-5.5),this.project(x,-.22,5.5),'#49637d13',.7);
    for(let z=-5;z<=5;z++)this.line(this.project(-7,-.22,z),this.project(7,-.22,z),'#49637d13',.7);
    this.path([[-6.45,-4.8],[6.45,-4.8],[6.45,4.8],[-6.45,4.8]].map(([x,z])=>this.project(x,-.23,z)),'#14233170','#3b526329');
    for(const [a,b] of [[[-4.6,-3.5],[-3.5,0]],[[4.6,-3.5],[3.7,0]],[[-4.6,3.6],[0,.8]],[[4.6,3.6],[0,.8]],[[0,-3.7],[0,.8]],[[-3.5,0],[0,.8]],[[0,.8],[3.7,0]]])this.line(this.project(a[0],-.14,a[1]),this.project(b[0],-.14,b[1]),'#667c9330',1,[3,5]);
    const rooms=LOCATIONS.slice().sort((a,b)=>this.project(a.x,0,a.z).depth-this.project(b.x,0,b.z).depth);
    for(const room of rooms)this.room(room,time);
    if(this.trails&&this.frame.effect?.type==='move'){
      const p=this.positions[this.frame.agent];if(p){this.line(this.project(p.from.x,.12,p.from.z),this.project(p.to.x,.12,p.to.z),this.frame.states[this.frame.agent].color+'90',1.4,[3,5]);}
    }
    if(this.labels)for(const room of rooms){const p=this.project(room.x,.12,room.z+room.d/2+.21);this.label(room.label,p.x,p.y,{color:room.type==='grid'?'#c18b80':room.type==='battery'?'#85b4ab':room.type==='table'?'#beab8b':'#607e98',size:Math.max(5.5,Math.min(7.2,this.scale*.17)),background:'#111d2790'});}
    this.hits=[];const names=this.replay.names.slice().sort((a,b)=>{const ap=this.currentPosition(a),bp=this.currentPosition(b);return this.project(ap.x,0,ap.z).depth-this.project(bp.x,0,bp.z).depth;});for(const name of names)this.robot(name,time);
    this.drawEffects(time);
    const text=this.frame.communication,agent=this.frame.agent;
    if(text&&agent){const p=this.currentPosition(agent),a=this.project(p.x,1.8,p.z);this.bubble.style.left=`${Math.min(this.w-170,Math.max(20,a.x+15))}px`;this.bubble.style.top=`${Math.max(135,a.y-5)}px`;}
  }
  destroy(){cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();}
}
function shadeHex(hex,factor){return '#'+hexRGB(hex).map(n=>Math.min(255,Math.round(n*factor)).toString(16).padStart(2,'0')).join('');}
