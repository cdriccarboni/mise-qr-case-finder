const STORE='mises-label-templates-v1'
const RECENTS='mises-label-recents-v1'
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n))
const clone=x=>structuredClone(x)
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))

export const LABEL_PRESETS=[
  {id:'40x30',label:'40 × 30 mm',w:40,h:30},
  {id:'50x30',label:'50 × 30 mm',w:50,h:30},
  {id:'50x50',label:'50 × 50 mm',w:50,h:50},
  {id:'58x40',label:'58 × 40 mm',w:58,h:40},
  {id:'80x50',label:'80 × 50 mm',w:80,h:50}
]

function load(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function uid(prefix){return `${prefix}-${crypto.randomUUID()}`}

function defaultModel(context={}){
  const name=context.name||context.label||''
  const blocks=[]
  if(name)blocks.push({id:uid('txt'),kind:'text',text:name,x:8,y:8,w:84,h:24,rotation:0,size:18,bold:true,italic:false,underline:false,align:'center',lineHeight:1.1})
  if(context.photo)blocks.push({...imageBlock(context.photo),x:20,y:38,w:60,h:52})
  return {id:uid('label'),name:name||'Étiquette',w:50,h:30,orientation:'horizontal',thermal:{enabled:false,threshold:145,invert:false,dither:false},blocks}
}
function textBlock(text='Texte'){return {id:uid('txt'),kind:'text',text,x:10,y:12,w:80,h:28,rotation:0,size:18,bold:false,italic:false,underline:false,align:'center',lineHeight:1.15}}
function imageBlock(src){return {id:uid('img'),kind:'image',src,x:15,y:15,w:70,h:70,rotation:0,fit:'contain'}}

function renderModel(canvas,model,{thermal=model.thermal?.enabled}={}){
  const scale=6
  const w=Math.max(120,Math.round(model.w*scale)),h=Math.max(80,Math.round(model.h*scale))
  canvas.width=w;canvas.height=h
  const ctx=canvas.getContext('2d',{willReadFrequently:true})
  ctx.save();ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.restore()
  const drawBlock=block=>{
    const x=block.x/100*w,y=block.y/100*h,bw=block.w/100*w,bh=block.h/100*h
    ctx.save();ctx.translate(x+bw/2,y+bh/2);ctx.rotate((Number(block.rotation)||0)*Math.PI/180);ctx.translate(-bw/2,-bh/2)
    if(block.kind==='text'){
      ctx.fillStyle='#000'
      ctx.textAlign=block.align||'center';ctx.textBaseline='top'
      ctx.font=`${block.italic?'italic ':''}${block.bold?'700 ':'400 '}${Math.max(8,Number(block.size)||18)}px system-ui,sans-serif`
      const lines=String(block.text||'').split('\n')
      const lineH=(Number(block.size)||18)*(Number(block.lineHeight)||1.15)
      lines.forEach((line,i)=>{
        const tx=block.align==='left'?0:block.align==='right'?bw:bw/2
        ctx.fillText(line,tx,i*lineH,Math.max(1,bw))
        if(block.underline){
          const metrics=ctx.measureText(line),width=Math.min(bw,metrics.width)
          const ux=block.align==='left'?0:block.align==='right'?bw-width:(bw-width)/2
          ctx.fillRect(ux,i*lineH+(Number(block.size)||18)+2,width,1)
        }
      })
    }else if(block.kind==='image'&&block._image?.complete){
      const img=block._image
      const ratio=Math.min(bw/img.naturalWidth,bh/img.naturalHeight)
      const dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio
      ctx.drawImage(img,(bw-dw)/2,(bh-dh)/2,dw,dh)
    }
    ctx.restore()
  }
  for(const block of model.blocks||[])drawBlock(block)
  if(thermal){
    const image=ctx.getImageData(0,0,w,h),d=image.data,t=Number(model.thermal?.threshold)||145,inv=Boolean(model.thermal?.invert),dither=Boolean(model.thermal?.dither)
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4
      let gray=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]
      if(dither)gray+=((x+y)%2?18:-18)
      const bit=gray<t?0:255,val=inv?255-bit:bit
      d[i]=d[i+1]=d[i+2]=val
    }
    ctx.putImageData(image,0,0)
  }
  return canvas.toDataURL('image/png')
}

function hydrateImages(model,refresh){
  for(const block of model.blocks||[])if(block.kind==='image'&&block.src&&!block._image){
    const img=new Image();block._image=img;img.onload=refresh;img.src=block.src
  }
}

export function openLabelEditor({context={},printImage}={}){
  const dialog=document.createElement('dialog');dialog.className='labelEditorDialog';document.body.append(dialog)
  let model=defaultModel(context),selected=model.blocks[0]?.id||null,history=[],future=[]
  const push=()=>{history.push(clone({...model,blocks:model.blocks.map(({_image,...b})=>b)}));if(history.length>30)history.shift();future=[]}
  const selectedBlock=()=>model.blocks.find(b=>b.id===selected)
  const restore=snapshot=>{model=clone(snapshot);hydrateImages(model,draw);selected=model.blocks[0]?.id||null;draw()}
  const addRecent=()=>{const recents=load(RECENTS,[]);save(RECENTS,[{...clone({...model,blocks:model.blocks.map(({_image,...b})=>b)}),savedAt:new Date().toISOString()},...recents].slice(0,8))}
  const readFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})
  dialog.innerHTML=`<div class="labelEditor">
    <div class="dialoghead"><div><b>Créer une étiquette</b><small>Libre · texte · image · thermique</small></div><button data-close class="ghost">×</button></div>
    <div class="labelEditorLayout">
      <div class="labelTools">
        <label>Format<select data-preset>${LABEL_PRESETS.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}<option value="custom">Personnalisé</option></select></label>
        <div class="grid2"><label>Largeur mm<input data-w type="number" min="15" max="150" value="${model.w}"></label><label>Hauteur mm<input data-h type="number" min="15" max="150" value="${model.h}"></label></div>
        <div class="row"><button data-add-text type="button">+ Texte</button><button data-add-image type="button" class="ghost">+ Image</button><input data-image-file type="file" accept="image/png,image/jpeg,image/webp" hidden></div>
        <div data-block-tools></div>
        <fieldset><legend>Rendu thermique</legend><label class="check"><input data-thermal type="checkbox"> Aperçu imprimé</label><label>Seuil<input data-threshold type="range" min="40" max="220" value="145"></label><label class="check"><input data-dither type="checkbox"> Tramage</label><label class="check"><input data-invert type="checkbox"> Inverser</label></fieldset>
        <div class="row"><button data-undo class="ghost">Annuler</button><button data-redo class="ghost">Rétablir</button><button data-reset class="ghost">Réinitialiser</button></div>
        <label>Nom du modèle<input data-template-name value="${esc(model.name)}"></label>
        <div class="row"><button data-save-template class="ghost">Enregistrer modèle</button><button data-load-template class="ghost">Modèles / récentes</button></div>
      </div>
      <div class="labelStageWrap"><div class="labelStage" data-stage><canvas data-canvas></canvas><div data-overlay></div></div><small>Aperçu écran : le format imprimé reste défini en millimètres.</small></div>
    </div>
    <div class="row labelBottom"><button data-print>Imprimer</button><button data-export class="ghost">Exporter PNG</button><button data-close-bottom class="ghost">Fermer</button></div>
  </div>`
  const $=s=>dialog.querySelector(s),$$=s=>[...dialog.querySelectorAll(s)]
  const canvas=$('[data-canvas]'),overlay=$('[data-overlay]'),stage=$('[data-stage]')
  const download=src=>{const a=document.createElement('a');a.href=src;a.download='MISES-etiquette.png';a.click()}
  function blockTools(){
    const b=selectedBlock(),box=$('[data-block-tools]')
    if(!b){box.innerHTML='<p class="hint">Ajoute ou sélectionne un élément.</p>';return}
    box.innerHTML=`<fieldset><legend>${b.kind==='text'?'Texte':'Image'}</legend>
      ${b.kind==='text'? `<label>Contenu<textarea data-text rows="3">${esc(b.text)}</textarea></label><div class="grid2"><label>Taille<input data-size type="number" min="8" max="80" value="${b.size}"></label><label>Alignement<select data-align><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select></label></div><div class="row"><label class="check"><input data-bold type="checkbox" ${b.bold?'checked':''}> Gras</label><label class="check"><input data-italic type="checkbox" ${b.italic?'checked':''}> Italique</label><label class="check"><input data-under type="checkbox" ${b.underline?'checked':''}> Souligné</label></div>` : '<p class="hint">Déplace, redimensionne ou tourne l’image directement.</p>'}
      <div class="grid2"><label>Rotation<input data-rotation type="number" min="-180" max="180" value="${b.rotation||0}"></label><label>Largeur %<input data-bw type="number" min="5" max="100" value="${Math.round(b.w)}"></label></div>
      <div class="row"><button data-duplicate class="ghost">Dupliquer</button><button data-front class="ghost">Avant</button><button data-back class="ghost">Arrière</button><button data-delete class="ghost">Supprimer</button></div>
    </fieldset>`
    const bind=(sel,fn,event='input')=>{const el=$(sel);if(el)el.addEventListener(event,()=>{push();fn(el);draw()})}
    if(b.kind==='text'){
      bind('[data-text]',el=>b.text=el.value)
      bind('[data-size]',el=>b.size=Number(el.value))
      const align=$('[data-align]');align.value=b.align||'center';align.onchange=()=>{push();b.align=align.value;draw()}
      $('[data-bold]').onchange=e=>{push();b.bold=e.target.checked;draw()}
      $('[data-italic]').onchange=e=>{push();b.italic=e.target.checked;draw()}
      $('[data-under]').onchange=e=>{push();b.underline=e.target.checked;draw()}
    }
    bind('[data-rotation]',el=>b.rotation=Number(el.value))
    bind('[data-bw]',el=>b.w=Number(el.value))
    $('[data-duplicate]').onclick=()=>{push();const copy=clone({...b,_image:undefined});copy.id=uid(b.kind);copy.x=clamp(b.x+4,0,95);copy.y=clamp(b.y+4,0,95);model.blocks.push(copy);if(copy.kind==='image')hydrateImages(model,draw);selected=copy.id;draw()}
    $('[data-front]').onclick=()=>{push();model.blocks=model.blocks.filter(x=>x!==b);model.blocks.push(b);draw()}
    $('[data-back]').onclick=()=>{push();model.blocks=model.blocks.filter(x=>x!==b);model.blocks.unshift(b);draw()}
    $('[data-delete]').onclick=()=>{push();model.blocks=model.blocks.filter(x=>x!==b);selected=model.blocks.at(-1)?.id||null;draw()}
  }
  function drawOverlay(){
    overlay.innerHTML=''
    const rect=stage.getBoundingClientRect()
    for(const b of model.blocks){
      const el=document.createElement('div');el.className='labelBlock'+(b.id===selected?' selected':'');el.dataset.id=b.id
      Object.assign(el.style,{left:`${b.x}%`,top:`${b.y}%`,width:`${b.w}%`,height:`${b.h}%`,transform:`rotate(${b.rotation||0}deg)`})
      el.innerHTML=b.kind==='text'?esc(b.text).replace(/\n/g,'<br>'):'Image'
      const handle=document.createElement('span');handle.className='labelResizeHandle';handle.textContent='↘';el.append(handle)
      handle.onpointerdown=e=>{e.stopPropagation();selected=b.id;blockTools();handle.setPointerCapture(e.pointerId);const sx=e.clientX,sy=e.clientY,ow=b.w,oh=b.h;push();handle.onpointermove=ev=>{if(!handle.hasPointerCapture(ev.pointerId))return;b.w=clamp(ow+(ev.clientX-sx)/rect.width*100,5,100-b.x);b.h=clamp(oh+(ev.clientY-sy)/rect.height*100,5,100-b.y);renderModel(canvas,model);el.style.width=`${b.w}%`;el.style.height=`${b.h}%`};handle.onpointerup=ev=>{try{handle.releasePointerCapture(ev.pointerId)}catch{};handle.onpointermove=null;blockTools()}}
      el.onpointerdown=e=>{
        selected=b.id;blockTools();drawOverlay();el.setPointerCapture(e.pointerId)
        const sx=e.clientX,sy=e.clientY,ox=b.x,oy=b.y;push()
        el.onpointermove=ev=>{if(!el.hasPointerCapture(ev.pointerId))return;b.x=clamp(ox+(ev.clientX-sx)/rect.width*100,0,100-b.w);b.y=clamp(oy+(ev.clientY-sy)/rect.height*100,0,100-b.h);renderModel(canvas,model);el.style.left=`${b.x}%`;el.style.top=`${b.y}%`}
        el.onpointerup=ev=>{try{el.releasePointerCapture(ev.pointerId)}catch{};el.onpointermove=null}
      }
      overlay.append(el)
    }
  }
  function draw(){hydrateImages(model,draw);renderModel(canvas,model);stage.style.aspectRatio=`${model.w}/${model.h}`;drawOverlay();blockTools()}
  $('[data-close]').onclick=$('[data-close-bottom]').onclick=()=>dialog.close()
  dialog.addEventListener('close',()=>dialog.remove(),{once:true})
  $('[data-preset]').onchange=e=>{if(e.target.value==='custom')return;const p=LABEL_PRESETS.find(x=>x.id===e.target.value);if(!p)return;push();model.w=p.w;model.h=p.h;$('[data-w]').value=p.w;$('[data-h]').value=p.h;draw()}
  $('[data-w]').onchange=e=>{push();model.w=clamp(Number(e.target.value)||50,15,150);draw()}
  $('[data-h]').onchange=e=>{push();model.h=clamp(Number(e.target.value)||30,15,150);draw()}
  $('[data-add-text]').onclick=()=>{push();const b=textBlock();model.blocks.push(b);selected=b.id;draw()}
  $('[data-add-image]').onclick=()=> $('[data-image-file]').click()
  $('[data-image-file]').onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;push();const src=await readFile(f);const b=imageBlock(src);model.blocks.push(b);selected=b.id;hydrateImages(model,draw);draw()}
  $('[data-thermal]').onchange=e=>{model.thermal.enabled=e.target.checked;draw()}
  $('[data-threshold]').oninput=e=>{model.thermal.threshold=Number(e.target.value);draw()}
  $('[data-dither]').onchange=e=>{model.thermal.dither=e.target.checked;draw()}
  $('[data-invert]').onchange=e=>{model.thermal.invert=e.target.checked;draw()}
  $('[data-undo]').onclick=()=>{if(!history.length)return;future.push(clone({...model,blocks:model.blocks.map(({_image,...b})=>b)}));restore(history.pop())}
  $('[data-redo]').onclick=()=>{if(!future.length)return;history.push(clone({...model,blocks:model.blocks.map(({_image,...b})=>b)}));restore(future.pop())}
  $('[data-reset]').onclick=()=>{push();model=defaultModel(context);selected=model.blocks[0]?.id||null;draw()}
  $('[data-save-template]').onclick=()=>{model.name=$('[data-template-name]').value.trim()||'Modèle';const clean=clone({...model,blocks:model.blocks.map(({_image,...b})=>b)});const list=load(STORE,[]).filter(x=>x.id!==clean.id);save(STORE,[clean,...list].slice(0,20));addRecent()}
  $('[data-load-template]').onclick=()=>{const all=[...load(STORE,[]),...load(RECENTS,[])];if(!all.length)return;const choice=prompt(all.map((x,i)=>`${i+1}. ${x.name||'Étiquette'}`).join('\n')+'\nNuméro à charger :','1');const item=all[Number(choice)-1];if(item){push();restore(item)}}
  $('[data-export]').onclick=()=>{const src=renderModel(canvas,model,{thermal:model.thermal.enabled});addRecent();download(src)}
  $('[data-print]').onclick=()=>{const src=renderModel(canvas,model,{thermal:true});addRecent();if(printImage)printImage(src,model.name||'Étiquette');else{const w=window.open('','_blank');w.document.write(`<img src="${src}" style="max-width:100%"><script>onload=()=>print()<\/script>`)}}
  hydrateImages(model,draw);draw();dialog.showModal()
  return dialog
}
