(() => {
const API="https://kusqzczsngirgqddztjw.supabase.co/functions/v1/zayn-api",SK="zayn_session_token";
const api=async(p,o={})=>{const h={"Content-Type":"application/json",...(o.headers||{})},t=localStorage.getItem(SK);if(t)h.Authorization="Bearer "+t;const r=await fetch(API+"/"+p.replace(/^\//,""),{...o,headers:h}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d};
const esc=s=>String(s??"").replace(/[&<>"\']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#039;"}[m]));
const fail=e=>{console.error(e);alert(e?.message||"Something went wrong.")};
const save=d=>localStorage.setItem(SK,d.token);
async function member(){publicSite.style.display="none";adminArea.classList.remove("active");memberArea.classList.add("active");try{const m=await api("me");if(m.user?.role!=="student")throw Error("Session expired.");memberWelcome.textContent=m.user.full_name+", your private academy dashboard is ready.";const [x,p]=await Promise.all([api("modules"),api("my-progress")]),done=new Set((p.progress||[]).filter(x=>x.completed).map(x=>x.lesson_id)),ls=(x.modules||[]).flatMap(m=>(m.zayn_course_lessons||[]).map(l=>({...l,moduleTitle:m.title,videoRef:l.video_path||l.video_uid||""})));memberLessonList.innerHTML=ls.length?ls.map(l=>'<div class="lesson"><div class="lesson-thumb">'+(done.has(l.id)?"DONE":"VIDEO")+'</div><div class="lesson-main"><strong>'+esc(l.title)+'</strong><span>'+esc(l.moduleTitle)+'</span></div><button class="btn btn-dark" onclick="zOpen(\''+l.id+'\',\''+(l.videoRef||"")+'\')">Open</button></div>').join(""):'<div class="notice">Course lessons will appear here when published.</div>'}catch(e){localStorage.removeItem(SK);fail(e)}}
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
window.zOpen=async(id,videoPath)=>{if(!videoPath)return alert("This lesson has no video yet.");try{const d=await api("video-token",{method:"POST",body:JSON.stringify({videoPath})});openModal('<div class="modal-top"><div><div class="eyebrow">Private lesson</div><h3>Watch securely</h3></div><button class="close" onclick="closeModal()">×</button></div><video controls playsinline style="width:100%;aspect-ratio:16/9;border:0;border-radius:15px;background:#000;margin-top:18px" src="'+esc(d.signedUrl)+'"></video><button class="btn" style="width:100%;margin-top:14px" onclick="zDone(\''+id+'\')">Mark lesson complete</button>')}catch(e){fail(e)}};
window.zDone=async id=>{try{await api("progress",{method:"POST",body:JSON.stringify({lessonId:id,completed:true})});closeModal();member()}catch(e){fail(e)}};
window.openAdminLogin=()=>{openModal('<div class="modal-top"><div><div class="eyebrow">Private Admin</div><h3>Zayn only.</h3></div><button class="close" onclick="closeModal()">×</button></div><form id="zAdmin" style="margin-top:18px"><label>Admin number<input id="zAP" required></label><label>Private password<input id="zPW" type="password" required></label><button class="btn" type="submit">Open Admin</button></form>');zAdmin.onsubmit=async e=>{e.preventDefault();try{const d=await api("login",{method:"POST",body:JSON.stringify({phone:zAP.value,password:zPW.value})});if(d.user.role!=="admin")throw Error("Admin access required.");save(d);closeModal();admin()}catch(e){fail(e)}}};
memberLoginBtn.onclick=()=>{openModal('<div class="modal-top"><div><div class="eyebrow">Member Login</div><h3>Welcome back.</h3></div><button class="close" onclick="closeModal()">×</button></div><form id="zMember" style="margin-top:18px"><label>Phone number<input id="zMP" required></label><label>Password<input id="zMpw" type="password" required></label><button class="btn" type="submit">Enter Academy</button></form>');zMember.onsubmit=async e=>{e.preventDefault();try{const d=await api("login",{method:"POST",body:JSON.stringify({phone:zMP.value,password:zMpw.value})});if(d.user.role!=="student")throw Error("Use admin login for admin access.");save(d);closeModal();member()}catch(e){fail(e)}}};
const af=document.getElementById("admissionForm");if(af){const f=af.cloneNode(true);af.replaceWith(f);f.onsubmit=async e=>{e.preventDefault();try{await api("application",{method:"POST",body:JSON.stringify({fullName:fullName.value.trim(),phone:phone.value.trim(),email:email.value.trim(),age:age.value,city:city.value.trim(),goal:goal.value.trim()})});alert("Application received.");f.reset()}catch(e){fail(e)}}}
window.logout=async()=>{try{await api("logout",{method:"POST",body:"{}"})}catch{}localStorage.removeItem(SK);location.reload()};
const t=localStorage.getItem(SK);if(t)api("me").then(x=>{if(x.user?.role==="student")member();else if(x.user?.role==="admin")admin()}).catch(()=>localStorage.removeItem(SK));
})();