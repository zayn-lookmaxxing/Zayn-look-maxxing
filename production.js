/* Zayn's Look Maxxing production bridge */
(() => {
  const API = "https://kusqzczsngirgqddztjw.supabase.co/functions/v1/zayn-api";
  const SESSION_KEY = "zayn_session_token";

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = localStorage.getItem(SESSION_KEY);
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API + "/" + path.replace(/^\//, ""), { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function showError(err) {
    console.error(err);
    alert(err?.message || "Something went wrong. Please try again.");
  }

  function saveSession(data) {
    localStorage.setItem(SESSION_KEY, data.token);
    window.zaynUser = data.user;
  }

  window.zaynApi = api;

  // Real member login: phone + password, backed by Supabase.
  const memberBtn = document.getElementById("memberLoginBtn");
  if (memberBtn) {
    memberBtn.onclick = () => {
      openModal(`
        <div class="modal-top"><div><div class="eyebrow">Member Login</div><h3 style="font-size:28px;margin:6px 0">Welcome back.</h3></div><button class="close" onclick="closeModal()">×</button></div>
        <form id="productionMemberLogin" style="margin-top:18px">
          <label>Phone number<input id="prodLoginPhone" inputmode="tel" autocomplete="tel" required placeholder="Your registered phone number" /></label>
          <label>Password<input id="prodLoginPass" type="password" autocomplete="current-password" required placeholder="Your password" /></label>
          <button class="btn" type="submit">Enter Academy</button>
          <button class="btn btn-dark" type="button" onclick="closeModal()">Close</button>
        </form>
        <div class="legal">Your account is authenticated securely by the Zayn backend.</div>
      `);
      setTimeout(() => {
        const f = document.getElementById("productionMemberLogin");
        f?.addEventListener("submit", async e => {
          e.preventDefault();
          const btn = f.querySelector('button[type="submit"]');
          btn.disabled = true; btn.textContent = "Signing in…";
          try {
            const data = await api("login", {
              method: "POST",
              body: JSON.stringify({
                phone: document.getElementById("prodLoginPhone").value,
                password: document.getElementById("prodLoginPass").value
              })
            });
            if (data.user.role !== "student") throw new Error("This is not a member account.");
            saveSession(data);
            closeModal();
            window.productionShowMember?.();
          } catch (err) { showError(err); }
          finally { btn.disabled = false; btn.textContent = "Enter Academy"; }
        });
      }, 0);
    };
  }

  // Real admission/application flow. Payment is intentionally not activated until Razorpay KYC is complete.
  const admissionForm = document.getElementById("admissionForm");
  if (admissionForm) {
    admissionForm.onsubmit = async e => {
      e.preventDefault();
      const data = {
        fullName: document.getElementById("fullName").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        email: document.getElementById("email").value.trim(),
        age: document.getElementById("age").value,
        city: document.getElementById("city").value.trim(),
        goal: document.getElementById("goal").value.trim()
      };
      const submit = admissionForm.querySelector('button[type="submit"]');
      if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }
      try {
        await api("application", { method: "POST", body: JSON.stringify(data) });
        openModal(`
          <div class="modal-top"><div><div class="eyebrow">Application received</div><h3 style="font-size:28px;margin:6px 0">You're on the list.</h3></div><button class="close" onclick="closeModal()">×</button></div>
          <div class="notice success" style="margin-top:18px">Your application has been submitted. The team will review it and activate your membership after the payment gateway is ready.</div>
          <button class="btn" style="width:100%;margin-top:14px" onclick="closeModal()">Done</button>
        `);
        admissionForm.reset();
      } catch (err) { showError(err); }
      finally { if (submit) { submit.disabled = false; submit.textContent = "Apply for membership"; } }
    };
  }

  // Real private admin login. No admin password is stored in this file.
  window.openAdminLogin = function() {
    openModal(`
      <div class="modal-top"><div><div class="eyebrow">Private Admin</div><h3 style="font-size:28px;margin:6px 0">Zayn only.</h3></div><button class="close" onclick="closeModal()">×</button></div>
      <form id="productionAdminLogin" style="margin-top:18px">
        <label>Admin number<input id="prodAdminPhone" inputmode="tel" required /></label>
        <label>Private password<input id="prodAdminPass" type="password" autocomplete="current-password" required /></label>
        <button class="btn" type="submit">Open Admin</button>
      </form>
      <div class="legal">Admin authentication is handled server-side. Credentials are never stored in the website code.</div>
    `);
    setTimeout(() => {
      const f = document.getElementById("productionAdminLogin");
      f?.addEventListener("submit", async e => {
        e.preventDefault();
        const btn = f.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = "Checking…";
        try {
          const data = await api("login", {
            method: "POST",
            body: JSON.stringify({
              phone: document.getElementById("prodAdminPhone").value,
              password: document.getElementById("prodAdminPass").value
            })
          });
          if (data.user.role !== "admin") throw new Error("Admin access required.");
          saveSession(data);
          closeModal();
          window.productionShowAdmin?.();
        } catch (err) { showError(err); }
        finally { btn.disabled = false; btn.textContent = "Open Admin"; }
      });
    }, 0);
  };

  window.productionShowMember = async function() {
    document.getElementById("publicSite").style.display = "none";
    document.getElementById("adminArea").classList.remove("active");
    document.getElementById("memberArea").classList.add("active");
    try {
      const me = await api("me");
      if (!me.user || me.user.role !== "student") throw new Error("Session expired. Please log in again.");
      window.zaynUser = me.user;
      document.getElementById("memberWelcome").textContent = me.user.full_name + ", your private academy dashboard is ready.";
      await loadProductionLessons();
    } catch (err) {
      localStorage.removeItem(SESSION_KEY);
      showError(err);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.productionShowAdmin = async function() {
    document.getElementById("publicSite").style.display = "none";
    document.getElementById("memberArea").classList.remove("active");
    document.getElementById("adminArea").classList.add("active");
    await loadProductionAdmin();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function loadProductionLessons() {
    const wrap = document.getElementById("memberLessonList");
    if (!wrap) return;
    try {
      const [mods, progress] = await Promise.all([api("modules"), api("my-progress")]);
      const done = new Set((progress.progress || []).filter(x => x.completed).map(x => x.lesson_id));
      const lessons = (mods.modules || []).flatMap(m => (m.zayn_course_lessons || []).map(l => ({ ...l, moduleTitle: m.title })));
      if (!lessons.length) {
        wrap.innerHTML = '<div class="notice">Your course content will appear here after the admin publishes lessons.</div>';
        return;
      }
      wrap.innerHTML = lessons.map(l => `
        <div class="lesson">
          <div class="lesson-thumb">${done.has(l.id) ? "DONE" : "VIDEO"}</div>
          <div class="lesson-main"><strong>${escapeHtml(l.title)}</strong><span>${escapeHtml(l.moduleTitle)} <span class="pill">${done.has(l.id) ? "Completed" : "Course"}</span></span></div>
          <button class="btn btn-dark" onclick="openProductionLesson('${l.id}','${escapeHtml(l.video_uid || "")}')">Open</button>
        </div>`).join("");
    } catch (err) { showError(err); }
  }

  window.openProductionLesson = async function(lessonId, videoUid) {
    if (!videoUid) {
      openModal('<div class="modal-top"><div><div class="eyebrow">Lesson</div><h3 style="font-size:26px">Video coming soon.</h3></div><button class="close" onclick="closeModal()">×</button></div>');
      return;
    }
    try {
      const data = await api("video-token", { method: "POST", body: JSON.stringify({ videoUid }) });
      openModal(`
        <div class="modal-top"><div><div class="eyebrow">Private lesson</div><h3 style="font-size:26px">Watch securely</h3></div><button class="close" onclick="closeModal()">×</button></div>
        <iframe src="https://iframe.videodelivery.net/${encodeURIComponent(data.token)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:15px;background:#000;margin-top:18px"></iframe>
        <button class="btn" style="margin-top:14px;width:100%" onclick="markProductionComplete('${lessonId}')">Mark lesson complete</button>
      `);
    } catch (err) { showError(err); }
  };

  window.markProductionComplete = async function(lessonId) {
    try {
      await api("progress", { method: "POST", body: JSON.stringify({ lessonId, completed: true }) });
      closeModal();
      await loadProductionLessons();
    } catch (err) { showError(err); }
  };

  async function loadProductionAdmin() {
    const wrap = document.getElementById("adminVideoList");
    if (!wrap) return;
    try {
      const data = await api("applications");
      wrap.innerHTML = (data.applications || []).map(a => `
        <div class="video-item">
          <div><strong>${escapeHtml(a.full_name)}</strong><small>${escapeHtml(a.phone)} · ${escapeHtml(a.email)} · ${escapeHtml(a.status)}</small></div>
          ${a.status === "pending" ? '<button class="btn" onclick="activateProductionApplication(\'' + a.id + '\')">Activate</button>' : '<span class="pill">Processed</span>'}
        </div>`).join("") || '<div class="notice">No applications yet.</div>';
    } catch (err) { showError(err); }
  }

  window.activateProductionApplication = async function(id) {
    if (!confirm("Activate this applicant as a member?")) return;
    try {
      const data = await api("applications/activate", { method: "POST", body: JSON.stringify({ applicationId: id }) });
      openModal(`
        <div class="modal-top"><div><div class="eyebrow">Member activated</div><h3 style="font-size:26px">Credentials generated</h3></div><button class="close" onclick="closeModal()">×</button></div>
        <div class="notice success" style="margin-top:18px"><strong>Phone:</strong> ${escapeHtml(data.member.phone)}<br/><strong>Temporary password:</strong> ${escapeHtml(data.temporaryPassword)}</div>
        <div class="legal" style="margin-top:12px">Share these credentials privately with the member. They are not stored in this page.</div>
      `);
      await loadProductionAdmin();
    } catch (err) { showError(err); }
  };

  // Logout uses the real server session.
  window.logout = async function() {
    try { await api("logout", { method: "POST", body: "{}" }); } catch {}
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  // Restore an existing production session instead of the old localStorage demo.
  const token = localStorage.getItem(SESSION_KEY);
  if (token) {
    api("me").then(({ user }) => {
      if (!user) return localStorage.removeItem(SESSION_KEY);
      window.zaynUser = user;
      if (user.role === "student") window.productionShowMember();
      if (user.role === "admin") window.productionShowAdmin();
    }).catch(() => localStorage.removeItem(SESSION_KEY));
  }
})();