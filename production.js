(() => {
const API="https://kusqzczsngirgqddztjw.supabase.co/functions/v1/zayn-api",SK="zayn_session_token";
const api=async(p,o={})=>{const h={"Content-Type":"application/json",...(o.headers||{})},t=localStorage.getItem(SK);if(t)h.Authorization="Bearer "+t;const r=await fetch(API+"/"+p.replace(/^\//,""),{...o,headers:h}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d};
const esc=s=>String(s??"").replace(/[&<>"\']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#039;"}[m]));
const fail=e=>{console.error(e);alert(e?.message||"Something went wrong.")};
const save=d=>localStorage.setItem(SK,d.token);
async function member(){publicSite.style.display="none";adminArea.classList.remove("active");memberArea.classList.add("active");try{const m=await api("me");if(m.user?.role!=="student")throw Error("Session expired.");window.__zaynMember=m.user; memberArea.classList.add("protected-content"); memberWelcome.textContent=m.user.full_name+", your private academy dashboard is ready."; if(typeof profileName!=="undefined")profileName.textContent=m.user.full_name||"Zayn Member"; if(typeof profilePhone!=="undefined")profilePhone.textContent=m.user.phone||"—"; if(typeof profileStatus!=="undefined")profileStatus.textContent=m.user.payment_status==="paid"?"Active":(m.user.payment_status==="manual"?"Active":"Active");const [x,p]=await Promise.all([api("modules"),api("my-progress")]),done=new Set((p.progress||[]).filter(x=>x.completed).map(x=>x.lesson_id)),ls=(x.modules||[]).flatMap(m=>(m.zayn_course_lessons||[]).map(l=>({...l,moduleTitle:m.title,videoRef:l.id})));memberLessonList.innerHTML=ls.length?ls.map(l=>'<div class="lesson"><div class="lesson-thumb">'+(done.has(l.id)?"DONE":"VIDEO")+'</div><div class="lesson-main"><strong>'+esc(l.title)+'</strong><span>'+esc(l.moduleTitle)+'</span></div><button class="btn btn-dark" onclick="zOpen(\''+l.id+'\',\''+l.id+'\')">Open</button></div>').join(""):'<div class="notice">Course lessons will appear here when published.</div>'}catch(e){localStorage.removeItem(SK);fail(e)}}
async function admin(){publicSite.style.display="none";memberArea.classList.remove("active");adminArea.classList.add("active");try{const m=await api("me");if(m.user?.role!=="admin")throw Error("Admin access required.");await loadAdmin()}catch(e){localStorage.removeItem(SK);fail(e)}}
async function loadAdmin(){const a=await api("applications");adminVideoList.innerHTML=(a.applications||[]).map(x=>'<div class="video-item"><div><strong>'+esc(x.full_name)+'</strong><small>'+esc(x.phone)+' · '+esc(x.email)+' · '+esc(x.status)+'</small></div>'+(x.status==="pending"?'<button class="btn" onclick="zActivate(\''+x.id+'\')">Activate</button>':'<span class="pill">Processed</span>')+'</div>').join("")||'<div class="notice">No applications yet.</div>';const ms=await api("modules"),sel=videoModule;if(sel&&ms.modules?.length)sel.innerHTML=ms.modules.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.title)+'</option>').join("");const old=videoForm;if(old){const form=old.cloneNode(true);old.replaceWith(form);form.addEventListener("submit",upload)}}
async function upload(e){
 e.preventDefault();
 const form=e.currentTarget,file=videoFile.files[0],title=videoTitle.value.trim(),moduleId=videoModule.value;
 if(!file||!title||!moduleId)return alert("Choose a title, module and video.");
 const b=form.querySelector('button[type="submit"]');
 try{
  b.disabled=true;b.textContent="Preparing…";
  const s=await api("video-upload",{method:"POST",body:JSON.stringify({size:file.size,name:file.name,contentType:file.type||"video/mp4"})});
  const r=await fetch(s.signedUrl,{
    method:"PUT",
    headers:{
      "Content-Type":file.type||"video/mp4",
      "Cache-Control":"max-age=3600"
    },
    body:file
  });
  if(!r.ok){
    const msg=await r.text().catch(()=>"");
    throw Error("Supabase Storage upload failed ("+r.status+")"+(msg?": "+msg:""));
  }
  b.textContent="Publishing…";
  await api("lessons",{method:"POST",body:JSON.stringify({moduleId,title,videoPath:s.path,description:""})});
  form.reset();
  alert("Video uploaded and lesson published.");
  await loadAdmin();
 }catch(e){fail(e)}finally{b.disabled=false;b.textContent="Upload video"}
}
window.zActivate=async id=>{if(!confirm("Activate this applicant as a member?"))return;try{const d=await api("applications/activate",{method:"POST",body:JSON.stringify({applicationId:id})});openModal('<div class="modal-top"><div><div class="eyebrow">Member activated</div><h3>Credentials generated</h3></div><button class="close" onclick="closeModal()">×</button></div><div class="notice success" style="margin-top:18px"><strong>Phone:</strong> '+esc(d.member.phone)+'<br><strong>Temporary password:</strong> '+esc(d.temporaryPassword)+'</div>');await loadAdmin()}catch(e){fail(e)}};
window.zOpen=async(id)=>{if(!id)return alert("This lesson is unavailable.");try{const d=await api("video-token",{method:"POST",body:JSON.stringify({lessonId:id})});const u=window.__zaynMember||{};const wm=esc((u.full_name||"Private Member")+" • "+(u.phone||"Private")+" • DO NOT SHARE");openModal('<div class="modal-top"><div><div class="eyebrow">Private lesson</div><h3>Watch securely</h3></div><button class="close" onclick="closeModal()">×</button></div><div class="video-shell"><video controls playsinline disablePictureInPicture controlsList="nodownload noplaybackrate noremoteplayback" style="width:100%;aspect-ratio:16/9;border:0;border-radius:15px;background:#000;display:block;margin-top:18px" src="'+esc(d.signedUrl)+'"></video><div class="video-watermark-grid" aria-hidden="true"><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span><span>'+wm+'</span></div></div><div class="legal protected-note">Private member content • personalized watermark • sharing is prohibited.</div><button class="btn" style="width:100%;margin-top:14px" onclick="zDone(\''+id+'\')">Mark lesson complete</button>')}catch(e){fail(e)}};
window.zDone=async id=>{try{await api("progress",{method:"POST",body:JSON.stringify({lessonId:id,completed:true})});closeModal();member()}catch(e){fail(e)}};
window.openAdminLogin=()=>{openModal('<div class="modal-top"><div><div class="eyebrow">Private Admin</div><h3>Zayn only.</h3></div><button class="close" onclick="closeModal()">×</button></div><form id="zAdmin" style="margin-top:18px"><label>Admin number<input id="zAP" required></label><label>Private password<input id="zPW" type="password" required></label><button class="btn" type="submit">Open Admin</button></form>');zAdmin.onsubmit=async e=>{e.preventDefault();try{const d=await api("login",{method:"POST",body:JSON.stringify({phone:zAP.value,password:zPW.value})});if(d.user.role!=="admin")throw Error("Admin access required.");save(d);closeModal();admin()}catch(e){fail(e)}}};
memberLoginBtn.onclick=()=>{openModal('<div class="modal-top"><div><div class="eyebrow">Member Login</div><h3>Welcome back.</h3></div><button class="close" onclick="closeModal()">×</button></div><form id="zMember" style="margin-top:18px"><label>Phone number<input id="zMP" required inputmode="tel" placeholder="+91..."></label><label>Password<input id="zMpw" type="password" required placeholder="Member password"></label><button class="btn" type="submit">Enter Course</button><div class="legal">Use your phone number with the member password to access the course.</div></form>');zMember.onsubmit=async e=>{e.preventDefault();try{const d=await api("login",{method:"POST",body:JSON.stringify({phone:zMP.value,password:zMpw.value})});if(d.user.role!=="student")throw Error("Use member login for the course.");save(d);closeModal();member()}catch(e){fail(e)}}};
const af=document.getElementById("admissionForm");if(af){const f=af.cloneNode(true);af.replaceWith(f);f.onsubmit=async e=>{e.preventDefault();try{const data={fullName:fullName.value.trim(),phone:phone.value.trim(),email:email.value.trim(),age:age.value,city:city.value.trim(),goal:goal.value.trim()};await api("application",{method:"POST",body:JSON.stringify(data)});const msg="Hi Zayn, I want to join Zayn's Look Maxxing.\n\nName: "+data.fullName+"\nPhone: "+data.phone+"\nEmail: "+data.email+"\nAge: "+data.age+"\nCity: "+data.city+"\nGoal: "+(data.goal||"Not specified");window.open("https://wa.me/919901841353?text="+encodeURIComponent(msg),"_blank");f.reset()}catch(e){fail(e)}}}
const protectedRoot=()=>document.getElementById("memberArea");
document.addEventListener("contextmenu",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("selectstart",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("dragstart",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("copy",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("cut",e=>{if(e.target.closest("#memberArea"))e.preventDefault()});
document.addEventListener("keydown",e=>{if(!e.target.closest("#memberArea"))return;const k=e.key.toLowerCase(),cmd=e.metaKey||e.ctrlKey;if((cmd&&["s","u","p","c"].includes(k))||e.key==="F12"||(cmd&&e.shiftKey&&["i","j","c"].includes(k))){e.preventDefault();e.stopPropagation()}});
document.addEventListener("visibilitychange",()=>{const root=protectedRoot();if(!root)return;root.classList.toggle("privacy-shield",document.hidden)});
window.logout=async()=>{try{await api("logout",{method:"POST",body:"{}"})}catch{}localStorage.removeItem(SK);location.reload()};
const t=localStorage.getItem(SK);if(t)api("me").then(x=>{if(x.user?.role==="student")member();else if(x.user?.role==="admin")admin()}).catch(()=>localStorage.removeItem(SK));
})();