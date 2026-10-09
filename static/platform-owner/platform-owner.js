(function(){
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const tokenKey='msme-platform-owner-token';
  let state={companies:[],totals:{},system:{},plans:[],audit:[]};
  let section='overview';
  let selected=null;
  const token=()=>sessionStorage.getItem(tokenKey)||'';
  async function api(path,options={}){
    const response=await fetch(path,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...(options.headers||{}),...(token()?{Authorization:`Bearer ${token()}`}:{})}});
    const payload=await response.json().catch(()=>({}));
    if(response.status===401&&path!=='/api/platform-owner/login'){signOut();throw new Error('Your owner session expired. Sign in again.')}
    if(!response.ok)throw new Error(payload.error||'The request could not be completed.');
    return payload;
  }
  function moneyBytes(value){let number=Number(value||0),unit='B';for(const next of ['KB','MB','GB']){if(number<1024)break;number/=1024;unit=next}return `${number<10&&unit!=='B'?number.toFixed(1):Math.round(number)} ${unit}`}
  function dateText(value){if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}
  function initials(value){return String(value||'CO').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
  function toast(message){document.querySelector('.toast')?.remove();const item=document.createElement('div');item.className='toast';item.textContent=message;document.body.appendChild(item);setTimeout(()=>item.remove(),2800)}
  function signOut(){sessionStorage.removeItem(tokenKey);$('#owner-app').hidden=true;$('#owner-login').hidden=false;closeDrawer()}
  async function load(){
    $('#owner-root').innerHTML='<div class="loading">Loading company information…</div>';
    state=await api('/api/platform-owner/overview');
    render();
  }
  const metric=(label,value,note,icon)=>`<article class="metric"><div class="metric-head"><span>${esc(label)}</span><i>${icon}</i></div><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
  function companyRows(companies){return companies.map(company=>`<tr data-company="${esc(company.company_id)}"><td><div class="company-cell"><span class="company-icon">${esc(initials(company.company_name))}</span><div><b>${esc(company.company_name)}</b><small>${esc(company.owner_email)}</small></div></div></td><td><span class="status ${company.status.toLowerCase()}">${esc(company.status)}</span></td><td><span class="plan">${esc(company.plan_code)}</span></td><td>${esc(company.employee_count)}</td><td>${esc(company.photo_count)}</td><td>${esc(moneyBytes(company.database_bytes_estimate))}</td><td>${esc(dateText(company.last_activity_at))}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No companies match this view.</td></tr>'}
  function companyPanel(companies=state.companies){return `<section class="panel"><div class="panel-head"><div><h2>Companies</h2><p>Select a company to inspect its plan, employees and storage.</p></div><div class="filter-row"><input id="company-search" placeholder="Search company or email"><select id="company-status-filter"><option value="ALL">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option></select></div></div><div class="table-wrap"><table class="company-table"><thead><tr><th>COMPANY</th><th>STATUS</th><th>PLAN</th><th>EMPLOYEES</th><th>PHOTOS</th><th>DATABASE</th><th>LAST ACTIVITY</th></tr></thead><tbody id="company-table-body">${companyRows(companies)}</tbody></table></div></section>`}
  function systemPanel(){const sys=state.system||{};return `<section class="panel"><div class="panel-head"><div><h2>System health</h2><p>Current service connections</p></div></div><div class="system-list"><div class="system-item"><span>Render API</span><b class="online">${esc(sys.api||'UNKNOWN')}</b></div><div class="system-item"><span>Database</span><b>${esc(sys.database||'UNKNOWN')}</b></div><div class="system-item"><span>Photo storage</span><b>${esc(String(sys.photo_storage||'').replaceAll('_',' ').toUpperCase())}</b></div><div class="system-item"><span>Schema</span><b>Version ${esc(sys.schema_version||'—')}</b></div></div></section>`}
  function activityPanel(limit=8){const items=(state.audit||[]).slice(0,limit);return `<section class="panel"><div class="panel-head"><div><h2>Owner activity</h2><p>Audited platform changes</p></div></div><div class="activity-list">${items.map(item=>`<div class="activity"><i></i><div><b>${esc(item.action.replaceAll('_',' '))}</b><span>${esc(dateText(item.created_at))}</span></div></div>`).join('')||'<div class="empty">No owner actions recorded.</div>'}</div></section>`}
  function bindCompanyTable(){
    document.querySelectorAll('[data-company]').forEach(row=>row.onclick=()=>openCompany(row.dataset.company));
    const search=$('#company-search'),filter=$('#company-status-filter');
    const apply=()=>{const term=search.value.trim().toLowerCase(),status=filter.value;const rows=state.companies.filter(item=>(status==='ALL'||item.status===status)&&(`${item.company_name} ${item.owner_email} ${item.company_id}`).toLowerCase().includes(term));$('#company-table-body').innerHTML=companyRows(rows);document.querySelectorAll('[data-company]').forEach(row=>row.onclick=()=>openCompany(row.dataset.company))};
    search?.addEventListener('input',apply);filter?.addEventListener('change',apply);
  }
  function render(){
    const totals=state.totals||{};$('#page-title').textContent=section==='companies'?'Company management':section==='activity'?'Owner activity':'SaaS overview';
    document.querySelectorAll('.nav').forEach(item=>item.classList.toggle('active',item.dataset.section===section));
    if(section==='overview'){$('#owner-root').innerHTML=`<div class="metric-grid">${metric('Registered companies',totals.companies||0,`${totals.active_companies||0} active`,'▤')}${metric('Employees',totals.employees||0,'Across every company','♙')}${metric('Private photos',totals.photos||0,`${totals.r2_photos||0} in Cloudflare R2`,'▣')}${metric('Estimated database data',moneyBytes(totals.database_bytes_estimate),'Workspace and profile records','◫')}</div><div class="dashboard-grid"><div>${companyPanel(state.companies.slice(0,8))}</div><div>${systemPanel()}<div style="height:20px"></div>${activityPanel(6)}</div></div>`;bindCompanyTable();return}
    if(section==='companies'){$('#owner-root').innerHTML=companyPanel();bindCompanyTable();return}
    $('#owner-root').innerHTML=activityPanel(30);
  }
  function closeDrawer(){$('#drawer-backdrop').hidden=true;$('#company-drawer').hidden=true;selected=null}
  function detail(label,value){return `<div class="detail"><span>${esc(label)}</span><b>${esc(value??'—')}</b></div>`}
  function openCompany(companyId){
    const c=state.companies.find(item=>item.company_id===companyId);if(!c)return;selected=c;
    const planOptions=state.plans.map(plan=>`<option value="${esc(plan.code)}" ${plan.code===c.plan_code?'selected':''}>${esc(plan.name)} · ${esc(plan.code)}</option>`).join('');
    const drawer=$('#company-drawer');drawer.innerHTML=`<div class="drawer-head"><div><h2>${esc(c.company_name)}</h2><p>${esc(c.company_id)}</p></div><button class="close" id="close-company" aria-label="Close">×</button></div><div class="drawer-section"><div class="detail-grid">${detail('Company status',c.status)}${detail('Subscription',`${c.plan_code} · ${c.subscription_status}`)}${detail('Owner',c.owner_name||'—')}${detail('Owner email',c.owner_email)}${detail('Employees',`${c.employee_count} / ${c.employee_limit??'—'}`)}${detail('Private photos',`${c.photo_count} total · ${c.r2_photo_count} R2`)}${detail('Attendance events',c.attendance_event_count)}${detail('Database estimate',moneyBytes(c.database_bytes_estimate))}${detail('Created',dateText(c.created_at))}${detail('Last activity',dateText(c.last_activity_at))}</div></div><div class="drawer-section"><h3>Company access</h3><p class="drawer-note">Suspending blocks new administrator and employee sessions. Existing company records and private photos remain stored.</p><div class="drawer-actions"><button class="secondary" data-status="ACTIVE">Activate</button><button class="danger" data-status="SUSPENDED">Suspend</button></div></div><form class="drawer-section" id="owner-plan-form"><h3>Manual subscription control</h3><p class="drawer-note">Use this until Razorpay payment webhooks are connected.</p><div class="form-row"><label class="field">PLAN<select name="plan_code">${planOptions}</select></label><label class="field">BILLING CYCLE<select name="billing_cycle"><option>MONTHLY</option><option>YEARLY</option><option>CUSTOM</option></select></label></div><label class="field">EMPLOYEE LIMIT<input type="number" name="employee_limit" min="1" max="1000000" value="${esc(c.employee_limit||25)}" required></label><button class="primary save-plan">Save plan and activate subscription</button><p class="message" id="drawer-message"></p></form>`;
    $('#drawer-backdrop').hidden=false;drawer.hidden=false;$('#close-company').onclick=closeDrawer;$('#drawer-backdrop').onclick=closeDrawer;
    drawer.querySelectorAll('[data-status]').forEach(button=>button.onclick=async()=>{const next=button.dataset.status,reason=next==='SUSPENDED'?prompt('Reason for suspension (optional):',''):'';if(next==='SUSPENDED'&&!confirm(`Suspend ${c.company_name}? Existing data will be preserved.`))return;button.disabled=true;try{await api(`/api/platform-owner/companies/${c.company_id}/status`,{method:'PATCH',body:JSON.stringify({status:next,reason})});toast(`Company ${next.toLowerCase()}.`);await load();openCompany(c.company_id)}catch(error){toast(error.message)}finally{button.disabled=false}});
    $('#owner-plan-form').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;try{await api(`/api/platform-owner/companies/${c.company_id}/plan`,{method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast('Subscription plan updated.');await load();openCompany(c.company_id)}catch(error){$('#drawer-message').textContent=error.message}finally{button.disabled=false}};
  }
  $('#owner-login-form').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button'),message=$('#login-message');button.disabled=true;message.textContent='Checking owner credentials…';try{const result=await api('/api/platform-owner/login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});sessionStorage.setItem(tokenKey,result.access_token);$('#owner-email').textContent=result.owner.email;$('#owner-login').hidden=true;$('#owner-app').hidden=false;message.textContent='';await load()}catch(error){message.textContent=error.message}finally{button.disabled=false}};
  document.querySelectorAll('.nav').forEach(button=>button.onclick=()=>{section=button.dataset.section;render()});
  $('#refresh-dashboard').onclick=()=>load().catch(error=>toast(error.message));$('#owner-logout').onclick=signOut;
  api('/api/platform-owner/config').then(config=>{if(!config.configured)$('#configuration-note').textContent='Owner credentials must be configured in Render environment variables before sign-in.'}).catch(()=>{});
  if(token()){api('/api/platform-owner/overview').then(result=>{state=result;$('#owner-login').hidden=true;$('#owner-app').hidden=false;render()}).catch(()=>signOut())}
})();
