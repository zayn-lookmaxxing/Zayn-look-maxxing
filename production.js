(() => {
const API="https://kusqzczsngirgqddztjw.supabase.co/functions/v1/zayn-api",SK="zayn_session_token";
const api=async(p,o={})=>{const h={"Content-Type":"application/json",...(o.headers||{})},t=localStorage.getItem(SK);if(t)h.Authorization="Bearer "+t;const r=await fetch(API+"/"+p.replace(/^\//,""),{...o,headers:h}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d};
const esc=s=>String(s??"").replace(/[&<>"\']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#039;"}[m]));
const fail=e=>{console.error(e);alert(e?.message||"Something went wrong.")};
const save=d=>localStorage.setItem(SK,d.token);
async function member(){publicSite.style.display="none";adminArea.classList.remove("active");memberArea.classList.add("active");try{const m=await api("me");if(m.user?.role!=="student")throw Error("Session expired.");window.__zaynMember=m.user; memberArea.classList.add("protected-content"); memberWelcome.textContent=m.user.full_name+", your private academy dashboard is ready."; if(typeof profileName!=="undefined")profileName.textContent=m.user.full_name||"Zayn Member"; if(typeof profilePhone!=="undefined")profilePhone.textContent=m.user.phone||"—"; if(typeof profileStatus!=="undefined")profileStatus.textContent=m.user.payment_status==="paid"?"Active":(m.user.payment_status==="manual"?"Active":"Active");const [x,p]=await Promise.all([api("modules"),api("my-progress")]),done=new Set((p.progress||[]).filter(x=>x.completed).map(x=>x.lesson_id)),ls=(x.modules||[]).flatMap(m=>(m.zayn_course_lessons||[]).map(l=>({...l,moduleTitle:m.title,videoRef:l.id})));memberLessonList.innerHTML=ls.length?ls.map(l=>'<div class="lesson"><div class="lesson-thumb">'+(done.has(l.id)?"DONE":"VIDEO")+'</div><div class="lesson-main"><strong>'+esc(l.title)+'</strong><span>'+esc(l.moduleTitle)+'</span></div><button class="btn btn-dark" onclick="zOpen(\''+l.id+'\',\''+l.id+'\')">Open</button></div>').join(""):'<div class="notice">Course lessons will appear here when published.</div>'}catch(e){localStorage.removeItem(SK);fail(e)}}
async function admin(){publicSite.style.display="none";memberArea.classList.remove("active");adminArea.classList.add("active");try{const m=await api("me");if(m.user?.role!=="admin")throw Error("Admin access required.");await loadAdmin()}catch(e){localStorage.removeItem(SK);fail(e)}}
async function loadAdmin(){await api("mux-reconcile",{method:"POST",body:"{}"}).catch(()=>{});const a=await api("applications");const appList=document.getElementById("adminApplicationsList");if(appList)appList.innerHTML=(a.applications||[]).map(x=>'<div class="video-item"><div><strong>'+esc(x.full_name)+'</strong><small>'+esc(x.phone)+' · '+esc(x.email)+' · '+esc(x.status)+'</small></div>'+ (x.status==="pending" ? '<button class="btn" onclick="zActivate(\''+x.id+'\')">Activate</button>' : '<button class="btn btn-dark" onclick="zActivate(\''+x.id+'\')">Reset credentials</button>') +'</div>').join("")||'<div class="notice">No applications yet.</div>';const ms=await api("modules"),sel=videoModule;if(sel&&ms.modules?.length)sel.innerHTML=ms.modules.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.title)+'</option>').join("");const lessons=(ms.modules||[]).flatMap(m=>(m.zayn_course_lessons||[]).map(l=>({...l,moduleTitle:m.title})));adminVideoList.innerHTML=lessons.length?lessons.map(l=>'<div class="video-item"><div><strong>'+esc(l.title)+'</strong><small>'+esc(l.moduleTitle)+' · '+esc(l.video_status)+(l.duration_seconds?' · '+Math.floor(l.duration_seconds/60)+':'+String(l.duration_seconds%60).padStart(2,"0"):'')+'</small></div><span class="pill">'+(l.video_status==="ready"?"Published":l.video_status)+'</span></div>').join(""):'<div class="notice">No published lessons yet.</div>';const old=videoForm;if(old){const form=old.cloneNode(true);old.replaceWith(form);form.addEventListener("submit",upload)}}
async function upload(e){
 e.preventDefault();
 const form=e.currentTarget,file=videoFile.files[0],title=videoTitle.value.trim(),moduleId=videoModule.value;
 if(!file||!title||!moduleId)return alert("Choose a title, module and video.");
 if(!file.type.startsWith("video/"))return alert("Please choose a video file.");
 const b=form.querySelector('button[type="submit"]');
 try{
  b.disabled=true;b.textContent="Preparing secure upload…";
  const s=await api("mux-upload",{method:"POST",body:JSON.stringify({name:file.name,contentType:file.type,size:file.size})});
  if(!s.uploadUrl||!s.uploadId)throw Error("Could not create the Mux upload.");
  if(!window.UpChunk?.createUpload)throw Error("Large-video upload component failed to load. Refresh the page and try again.");
  const up=UpChunk.createUpload({
    endpoint:s.uploadUrl,
    file,
    chunkSize:5120
  });
  await new Promise((resolve,reject)=>{
    up.on("progress",ev=>{
      const pct=Math.max(0,Math.min(100,Number(ev.detail)||0));
      b.textContent=`Uploading ${Math.round(pct)}%`;
    });
    up.on("success",resolve);
    up.on("error",ev=>reject(ev?.detail||new Error("Mux upload failed.")));
  });
  b.textContent="Registering lesson…";
  const lessonResp=await api("lessons",{method:"POST",body:JSON.stringify({moduleId,title,description:"",muxUploadId:s.uploadId})});
  const lessonId=lessonResp.lesson?.id;
  if(!lessonId)throw Error("Upload finished but the lesson could not be created.");
  let ready=false, lastStatus=null;
  for(let i=0;i<600;i++){
    const st=await api("mux-status",{method:"POST",body:JSON.stringify({uploadId:s.uploadId,lessonId})});
    lastStatus=st;
    if(st.ready){ready=true;break;}
    if(st.uploadStatus==="errored"||st.assetStatus==="errored")throw Error("Mux could not process this video.");
    if(st.uploadStatus==="timed_out")throw Error("The Mux upload timed out.");
    const progress=Number(st.assetStatus==="preparing"&&st.assetProgress)||0;
    b.textContent=st.assetStatus==="preparing"&&progress>0?`Processing ${Math.round(progress)}%`:"Processing video…";
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  if(!ready)throw Error("The video uploaded but is still processing. It will become available automatically once Mux finishes processing.");
  form.reset();
  alert("Video uploaded, processed and published.");
  await loadAdmin();
 }catch(e){fail(e)}finally{b.disabled=false;b.textContent="Upload video"}
}
window.copyCredentials=async(phone,password,button)=>{
  const text=phone+" / "+password;
  try{
    await navigator.clipboard.writeText(text);
    if(button)button.textContent="Copied!";
  }catch{
    const ta=document.createElement("textarea");
    ta.value=text;
    ta.style.position="fixed";
    ta.style.opacity="0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    if(button)button.textContent="Copied!";
  }
  setTimeout(()=>{if(button)button.textContent="Copy credentials"},1500);
};

window.zActivate=async id=>{
  if(!confirm("Generate a new temporary password for this member?"))return;
  try{
    const d=await api("applications/activate",{method:"POST",body:JSON.stringify({applicationId:id})});
    openModal(
      '<div class="modal-top"><div><div class="eyebrow">Member credentials</div><h3>Ready to send</h3></div><button class="close" onclick="closeModal()">×</button></div>'+
      '<div class="notice success" style="margin-top:18px">'+
      '<strong>Phone:</strong> '+esc(d.member.phone)+
      '<br><strong>Temporary password:</strong> <span style="user-select:text;-webkit-user-select:text">'+esc(d.temporaryPassword)+'</span>'+
      '</div>'+
      '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">'+
      '<button class="btn" onclick="copyCredentials('+JSON.stringify(d.member.phone)+','+JSON.stringify(d.temporaryPassword)+',this)">Copy credentials</button>'+
      '<button class="btn btn-dark" onclick="closeModal()">Done</button>'+
      '</div>'+
      '<div class="legal" style="margin-top:10px">The temporary password works immediately. Ask the member to change it after login.</div>'
    );
    await loadAdmin();
  }catch(e){fail(e)}
};
window.zOpen=async(id)=>{if(!id)return alert("This lesson is unavailable.");try{const d=await api("video-token",{method:"POST",body:JSON.stringify({lessonId:id})});const u=window.__zaynMember||{};const wm=esc((u.full_name||"Private Member")+" • "+(u.phone||"Private")+" • DO NOT SHARE");const player=d.playbackType==="mux"?'<mux-player src="'+esc(d.signedUrl)+'" stream-type="on-demand" controls playsinline style="width:100%;aspect-ratio:16/9;border:0;border-radius:15px;background:#000;display:block;margin-top:18px"></mux-player>':'<video controls playsinline disablePictureInPicture controlsList="nodownload noplaybackrate noremoteplayback" style="width:100%;aspect-ratio:16/9;border:0;border-radius:15px;background:#000;display:block;margin-top:18px" src="'+esc(d.signedUrl)+'"></video>';openModal('<div class="modal-top"><div><div class="eyebrow">Private lesson</div><h3>Watch securely</h3></div><button class="close" onclick="closeModal()">×</button></div><div class="video-shell">'+player+'<div class="video-watermark-grid" aria-hidden="true"><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span></div></div><div class="legal protected-note">Private member content • personalized watermark • sharing is prohibited.</div><button class="btn" style="width:100%;margin-top:14px" onclick="zDone(\''+id+'\')">Mark lesson complete</button>')}catch(e){fail(e)}};
window.zDone=async id=>{try{await api("progress",{method:"POST",body:JSON.stringify({lessonId:id,completed:true})});closeModal();member()}catch(e){fail(e)}};
window.openAdminLogin=()=>{openModal('<div class="modal-top"><div><div class="eyebrow">Private Admin</div><h3>Zayn only.</h3></div><button class="close" onclick="closeModal()">×</button></div><form id="zAdmin" style="margin-top:18px"><label>Admin number<input id="zAP" required></label><label>Private password<input id="zPW" type="password" required></label><button class="btn" type="submit">Open Admin</button></form>');zAdmin.onsubmit=async e=>{e.preventDefault();try{const d=await api("login",{method:"POST",body:JSON.stringify({phone:zAP.value,password:zPW.value})});if(d.user.role!=="admin")throw Error("Admin access required.");save(d);closeModal();admin()}catch(e){fail(e)}}};
memberLoginBtn.onclick=()=>{openModal('<div class="modal-top"><div><div class="eyebrow">Member Login</div><h3>Welcome back.</h3></div><button class="close" onclick="closeModal()">×</button></div><form id="zMember" style="margin-top:18px"><label>Phone number<input id="zMP" required inputmode="tel" placeholder="+91..."></label><label>Password<input id="zMpw" type="password" required placeholder="Member password"></label><button class="btn" type="submit">Enter Course</button><div class="legal">Use your phone number with the member password to access the course.</div></form>');zMember.onsubmit=async e=>{e.preventDefault();try{const d=await api("login",{method:"POST",body:JSON.stringify({phone:zMP.value,password:zMpw.value})});if(d.user.role!=="student")throw Error("Use member login for the course.");save(d);closeModal();member()}catch(e){fail(e)}}};
const af=document.getElementById("admissionForm");if(af){const f=af.cloneNode(true);af.replaceWith(f);f.onsubmit=e=>{e.preventDefault();const data={fullName:fullName.value.trim(),phone:phone.value.trim(),email:email.value.trim(),age:age.value,city:city.value.trim(),goal:goal.value.trim()};const msg="Hi Zayn, I want to join Zayn's Look Maxxing.\\n\\nName: "+data.fullName+"\\nPhone: "+data.phone+"\\nEmail: "+data.email+"\\nAge: "+data.age+"\\nCity: "+data.city+"\\nGoal: "+(data.goal||"Not specified");const wa="https://wa.me/919180445781?text="+encodeURIComponent(msg);api("application",{method:"POST",body:JSON.stringify(data)}).catch(()=>{});window.location.href=wa;}}
const protectedRoot=()=>document.getElementById("memberArea");
document.addEventListener("contextmenu",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("selectstart",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("dragstart",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("copy",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("cut",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("keydown",e=>{if(!e.target.closest("#memberArea"))return;const k=e.key.toLowerCase(),cmd=e.metaKey||e.ctrlKey;if((cmd&&["s","u","p","c"].includes(k))||e.key==="F12"||(cmd&&e.shiftKey&&["i","j","c"].includes(k))){e.preventDefault();e.stopPropagation()}});
document.addEventListener("visibilitychange",()=>{const root=protectedRoot();if(!root)return;root.classList.toggle("privacy-shield",document.hidden)});
function openAdminFromPhone(){window.openAdminLogin&&window.openAdminLogin()}
if(location.hash==="#admin")setTimeout(openAdminFromPhone,250);
const brand=document.querySelector(".brand");let brandTaps=0,brandTimer=null;
if(brand){
  brand.addEventListener("click",e=>{
    brandTaps++;
    clearTimeout(brandTimer);
    brandTimer=setTimeout(()=>brandTaps=0,1800);
    if(brandTaps>=5){brandTaps=0;openAdminFromPhone();}
  });
}
window.logout=async()=>{try{await api("logout",{method:"POST",body:"{}"})}catch{}localStorage.removeItem(SK);location.reload()};
const t=localStorage.getItem(SK);if(t)api("me").then(x=>{if(x.user?.role==="student")member();else if(x.user?.role==="admin")admin()}).catch(()=>localStorage.removeItem(SK));
})();