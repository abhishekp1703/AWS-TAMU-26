import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ⚠️ CHANGE THIS to your API Gateway URL after deploying
const API_URL = 'YOUR_API_GATEWAY_URL_HERE';

const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0;transform:translateY(10px);} to {opacity:1;transform:translateY(0);} }
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  input:focus,textarea:focus { border-color:#667eea!important; outline:none; }
`;
document.head.appendChild(styleEl);

const S = {
  page: { minHeight:'100vh', background:'linear-gradient(160deg,#0f0c29 0%,#1a1a2e 40%,#0f3460 100%)', padding:'40px 20px' },
  container: { maxWidth:740, margin:'0 auto' },
  wide: { maxWidth:1000, margin:'0 auto' },
  header: { textAlign:'center', marginBottom:36 },
  logo: { color:'white', fontSize:42, fontWeight:900, letterSpacing:-2 },
  logoAccent: { color:'#667eea' },
  tagline: { color:'rgba(255,255,255,0.5)', fontSize:14, marginTop:6 },
  card: { background:'white', borderRadius:20, padding:32, marginBottom:20, boxShadow:'0 30px 70px rgba(0,0,0,0.4)' },
  cardTitle: { color:'#1a1a2e', fontSize:19, fontWeight:800, marginBottom:16 },
  label: { display:'block', color:'#374151', fontWeight:700, fontSize:14, marginBottom:8, marginTop:20 },
  input: { width:'100%', padding:'13px 16px', border:'2px solid #e5e7eb', borderRadius:12, fontSize:15, fontFamily:'inherit' },
  textarea: { width:'100%', padding:'13px 16px', border:'2px solid #e5e7eb', borderRadius:12, fontSize:15, fontFamily:'inherit', height:100, resize:'vertical' },
  btn: { width:'100%', padding:'15px 24px', background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', color:'white', border:'none', borderRadius:12, fontSize:16, fontWeight:800, cursor:'pointer', marginTop:24 },
  btnSmall: { padding:'9px 18px', background:'#667eea', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:14 },
  btnGreen: { padding:'9px 18px', background:'#22c55e', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:14 },
  tabRow: { display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' },
  tab: { padding:'9px 18px', border:'2px solid rgba(255,255,255,0.25)', borderRadius:10, background:'transparent', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:14, fontWeight:600 },
  activeTab: { background:'white', color:'#1a1a2e', border:'2px solid white' },
  badge: { display:'inline-block', background:'rgba(255,255,255,0.15)', color:'white', padding:'4px 14px', borderRadius:20, fontSize:13, marginLeft:10 },
  sectorBadge: { display:'inline-block', background:'#667eea', color:'white', padding:'3px 10px', borderRadius:20, fontSize:12, marginLeft:8 },
  successBanner: { background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'white', padding:'16px 24px', borderRadius:14, marginBottom:20, fontWeight:700 },
  infoBanner: { background:'rgba(102,126,234,0.2)', border:'1px solid rgba(102,126,234,0.4)', borderRadius:14, padding:20, marginBottom:20 },
  warningBox: { background:'#fff7ed', border:'2px solid #fed7aa', borderRadius:12, padding:16, marginBottom:16 },
  schemaRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 0', borderBottom:'1px solid #f3f4f6' },
  spinner: { width:52, height:52, margin:'0 auto', border:'5px solid #e5e7eb', borderTop:'5px solid #667eea', borderRadius:'50%', animation:'spin 1s linear infinite' },
  loadingScreen: { minHeight:'100vh', background:'linear-gradient(160deg,#0f0c29 0%,#1a1a2e 40%,#0f3460 100%)', display:'flex', alignItems:'center', justifyContent:'center' },
  loadingCard: { background:'white', borderRadius:24, padding:52, textAlign:'center', maxWidth:440, width:'90%', boxShadow:'0 40px 80px rgba(0,0,0,0.5)' },
  footer: { textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:12, marginTop:24 }
};

// ─── HOME ────────────────────────────────────────────────────
function Home() {
  const [company,setCompany]=useState(''); const [url,setUrl]=useState(''); const [notes,setNotes]=useState('');
  const [loading,setLoading]=useState(false); const [stepIdx,setStepIdx]=useState(0);
  const navigate=useNavigate();
  const steps=['🔍 Scraping public sources...','🤠 Analyzing Texas ecosystem...','💬 Crafting interview questions...','🔎 Mapping knowledge gaps...','📋 Building intelligence schema...','📄 Assembling your brief...'];

  const generate=async()=>{
    if(!company.trim()) return alert('Please enter a company name');
    setLoading(true);
    steps.forEach((_,i)=>setTimeout(()=>setStepIdx(i),i*10000));
    try {
      const sr=await axios.post(`${API_URL}/scrape`,{company_name:company,company_url:url});
      const sd=typeof sr.data==='string'?JSON.parse(sr.data):sr.data;
      const scraped=sd.body?JSON.parse(sd.body).scraped_content:(sd.scraped_content||`Company: ${company}`);
      const r=await axios.post(`${API_URL}/generate`,{company_name:company,scraped_content:scraped,tamu_notes:notes});
      const rd=typeof r.data==='string'?JSON.parse(r.data):r.data;
      const result=rd.body?JSON.parse(rd.body):rd;
      navigate(`/brief/${result.interview_id}`);
    } catch(err){ console.error(err); alert('Generation failed — check console and Lambda logs.'); setLoading(false); }
  };

  if(loading) return(
    <div style={S.loadingScreen}><div style={S.loadingCard}>
      <div style={S.spinner}/>
      <h2 style={{color:'#1a1a2e',marginTop:24,fontSize:22}}>AXIS is working...</h2>
      <p style={{color:'#667eea',fontWeight:600,fontSize:15,marginTop:8}}>{steps[stepIdx]}</p>
      <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:20}}>
        {steps.map((_,i)=><div key={i} style={{width:8,height:8,borderRadius:4,background:i<=stepIdx?'#667eea':'#e5e7eb',transition:'background 0.3s'}}/>)}
      </div>
      <p style={{color:'#9ca3af',fontSize:13,marginTop:16}}>Usually 60–90 seconds</p>
    </div></div>
  );

  return(
    <div style={S.page}><div style={S.container}>
      <div style={S.header}><h1 style={S.logo}>⚡ <span style={S.logoAccent}>AX</span>IS</h1><p style={S.tagline}>Adaptive Interview Intelligence • Texas A&M</p></div>
      <div style={S.card}>
        <h2 style={{...S.cardTitle,marginBottom:4}}>Prepare Your Interview</h2>
        <p style={{color:'#9ca3af',fontSize:14}}>From zero to interview-ready in under 90 seconds.</p>
        <label style={S.label}>Company Name *</label>
        <input style={S.input} placeholder="e.g. GridFlex Energy, H-E-B, Texas Instruments" value={company} onChange={e=>setCompany(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generate()}/>
        <label style={S.label}>Company Website <span style={{fontWeight:400,color:'#9ca3af'}}>(recommended)</span></label>
        <input style={S.input} placeholder="https://www.example.com" value={url} onChange={e=>setUrl(e.target.value)}/>
        <label style={S.label}>Internal Texas A&M Notes <span style={{fontWeight:400,color:'#9ca3af'}}>(optional)</span></label>
        <textarea style={S.textarea} placeholder="Prior research, alumni connections, faculty knowledge..." value={notes} onChange={e=>setNotes(e.target.value)}/>
        <button style={S.btn} onClick={generate}>Generate Interview Brief →</button>
      </div>
      <p style={S.footer}>Powered by Amazon Bedrock (Claude) • Texas A&M Interview Intelligence</p>
    </div></div>
  );
}

// ─── BRIEF ───────────────────────────────────────────────────
function Brief() {
  const {id}=useParams();
  const [data,setData]=useState(null); const [tab,setTab]=useState('brief'); const [copied,setCopied]=useState(false);
  const load=useCallback(async()=>{
    try{const r=await axios.get(`${API_URL}/brief/${id}`);const rd=typeof r.data==='string'?JSON.parse(r.data):r.data;setData(rd.body?JSON.parse(rd.body):rd);}catch(e){console.error(e);}
  },[id]);
  useEffect(()=>{load();},[load]);

  const copyEmail=()=>{navigator.clipboard.writeText(data?.interviewee_email||'');setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const tabs=[{id:'brief',label:'📄 Brief'},{id:'schema',label:'🗂 Intel Schema'},{id:'email',label:'📧 Exec Email'},{id:'debrief',label:'✅ Post-Interview'}];

  return(
    <div style={S.page}><div style={S.wide}>
      <div style={S.header}>
        <h1 style={S.logo}>⚡ <span style={S.logoAccent}>AX</span>IS<span style={S.badge}>#{id}</span>{data?.sector&&<span style={S.sectorBadge}>{data.sector}</span>}</h1>
        <p style={S.tagline}>{data?.company_name||'Loading...'}</p>
      </div>
      {data?.debrief_completed&&<div style={S.successBanner}>✓ Post-interview debrief complete — insights saved to Texas A&M knowledge graph</div>}
      <div style={S.tabRow}>{tabs.map(t=><button key={t.id} style={{...S.tab,...(tab===t.id?S.activeTab:{})}} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>

      {tab==='brief'&&<div style={S.card}>{!data?<p style={{color:'#9ca3af',textAlign:'center',padding:40}}>Loading...</p>:<pre style={{fontFamily:'inherit',fontSize:14,lineHeight:1.85,color:'#1a1a2e',whiteSpace:'pre-wrap'}}>{data.brief}</pre>}</div>}

      {tab==='schema'&&<div style={S.card}>
        <h3 style={S.cardTitle}>🗂 Texas Intelligence Schema (Document 4)</h3>
        <p style={{color:'#6b7280',fontSize:14,marginBottom:24}}>AXIS pre-filled this from public research. Complete remaining fields after your interview — this feeds the Texas A&M knowledge graph.</p>
        {!data?.schema?<p style={{color:'#9ca3af'}}>Schema loading...</p>:<>
          <SchemaSection title="Company Profile" data={data.schema.company_profile}/>
          <SchemaSection title="Revenue Mechanics" data={data.schema.revenue_mechanics}/>
          <SchemaSection title="Constraint Map" data={data.schema.constraint_map}/>
          <SchemaSection title="Market Structure" data={data.schema.market_structure}/>
          <SchemaSection title="Strategic Tensions" data={data.schema.strategic_tensions}/>
          {data.schema.ai_opportunity_areas?.length>0&&<div style={{marginTop:20}}>
            <p style={{fontWeight:700,color:'#1a1a2e',marginBottom:10}}>AI Opportunity Areas</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{data.schema.ai_opportunity_areas.map((a,i)=><span key={i} style={{background:'#eff6ff',color:'#1d4ed8',padding:'4px 12px',borderRadius:20,fontSize:13,fontWeight:600}}>{a}</span>)}</div>
          </div>}
          {data.schema.fields_to_verify_in_interview?.length>0&&<div style={{...S.warningBox,marginTop:20}}>
            <p style={{fontWeight:700,color:'#92400e',marginBottom:8}}>⚠️ Verify These In Interview</p>
            {data.schema.fields_to_verify_in_interview.map((f,i)=><p key={i} style={{color:'#78350f',fontSize:14,marginBottom:4}}>• {f}</p>)}
          </div>}
          <div style={{marginTop:16,padding:'12px 16px',background:'#f8fafc',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'#6b7280',fontSize:13}}>Completeness: <strong style={{color:'#667eea'}}>{data.schema.schema_completeness_percent||'~'}%</strong> (AI pre-fill)</span>
            <button onClick={()=>setTab('debrief')} style={{...S.btnGreen,fontSize:13,padding:'6px 14px'}}>Complete after interview →</button>
          </div>
        </>}
      </div>}

      {tab==='email'&&<div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{...S.cardTitle,marginBottom:0}}>📧 Exec Info Email</h3>
          <button style={S.btnSmall} onClick={copyEmail}>{copied?'✓ Copied!':'Copy Email'}</button>
        </div>
        <div style={{...S.infoBanner,marginBottom:20}}>
          <p style={{color:'rgba(255,255,255,0.9)',fontWeight:600,marginBottom:4}}>ℹ️ Zero effort required from the executive</p>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:13}}>Send this 24–48 hours before the call. No survey, no action needed. Just shows you did your homework.</p>
        </div>
        {!data?.interviewee_email?<p style={{color:'#9ca3af'}}>Email loading...</p>:
          <pre style={{fontFamily:'inherit',fontSize:14,lineHeight:1.85,color:'#1a1a2e',background:'#f9fafb',padding:24,borderRadius:12,whiteSpace:'pre-wrap'}}>{data.interviewee_email}</pre>}
      </div>}

      {tab==='debrief'&&<PostInterviewDebrief interviewId={id} companyName={data?.company_name} sector={data?.sector} schema={data?.schema} completed={data?.debrief_completed} onComplete={load}/>}
    </div></div>
  );
}

function SchemaSection({title,data}){
  if(!data) return null;
  return(
    <div style={{marginBottom:20}}>
      <p style={{fontWeight:800,color:'#1a1a2e',marginBottom:8,fontSize:15}}>{title}</p>
      {Object.entries(data).map(([k,v])=>{
        if(!v||(Array.isArray(v)&&v.length===0)) return null;
        const label=k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
        const val=Array.isArray(v)?v.join(', '):String(v);
        const isVerify=val.toLowerCase().includes('to verify');
        return(<div key={k} style={S.schemaRow}>
          <span style={{color:'#6b7280',fontSize:13,fontWeight:600}}>{label}</span>
          <span style={{color:isVerify?'#f59e0b':'#1a1a2e',fontSize:13,fontWeight:700,textAlign:'right',maxWidth:'60%',fontStyle:isVerify?'italic':'normal'}}>{val}</span>
        </div>);
      })}
    </div>
  );
}

// ─── POST-INTERVIEW DEBRIEF ───────────────────────────────────
function PostInterviewDebrief({interviewId,companyName,sector,schema,completed,onComplete}){
  const [wrong,setWrong]=useState(''); const [insights,setInsights]=useState('');
  const [goodQs,setGoodQs]=useState(''); const [surprises,setSurprises]=useState('');
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(completed||false);

  const save=async()=>{
    if(!insights.trim()) return alert('Please add at least one key insight.');
    setSaving(true);
    try{
      await axios.post(`${API_URL}/debrief/${interviewId}`,{
        what_ai_got_wrong:wrong, key_insights:insights,
        questions_that_worked:goodQs.split('\n').filter(q=>q.trim()),
        surprises, sector:sector||'general', company_name:companyName||'', completed_schema:schema||{}
      });
      setSaved(true); if(onComplete) onComplete();
    }catch(e){console.error(e);alert('Save failed.');}finally{setSaving(false);}
  };

  if(saved) return(
    <div style={S.card}><div style={{textAlign:'center',padding:'20px 0'}}>
      <div style={{fontSize:56,marginBottom:16}}>✓</div>
      <h3 style={{color:'#1a1a2e',fontSize:22,marginBottom:8}}>Debrief Complete</h3>
      <p style={{color:'#6b7280',fontSize:15}}>Insights saved to the Texas A&M knowledge graph. The next team interviewing in the <strong>{sector}</strong> sector starts smarter because of this conversation.</p>
    </div></div>
  );

  return(
    <div style={S.card}>
      <h3 style={S.cardTitle}>✅ Post-Interview Debrief</h3>
      <p style={{color:'#6b7280',fontSize:14,marginBottom:24}}>Takes 3 minutes. Your answers feed the Texas A&M institutional memory — making every future interview in this sector smarter.</p>
      <div style={{...S.infoBanner,marginBottom:24}}>
        <p style={{color:'rgba(255,255,255,0.9)',fontWeight:600,fontSize:14}}>🧠 You're building the knowledge graph</p>
        <p style={{color:'rgba(255,255,255,0.6)',fontSize:13,marginTop:4}}>What you learned today briefs the next interviewer in the {sector} sector automatically.</p>
      </div>
      <label style={S.label}>What did AI get wrong about {companyName}?</label>
      <textarea style={S.textarea} placeholder="e.g. We assumed they were a VPP operator — they're actually a marketing/distribution layer..." value={wrong} onChange={e=>setWrong(e.target.value)}/>
      <label style={S.label}>Key insights from this interview *</label>
      <textarea style={{...S.textarea,height:120}} placeholder="e.g. Installer concentration risk is the real bottleneck, not demand. ERCOT deregulation is the structural unlock..." value={insights} onChange={e=>setInsights(e.target.value)}/>
      <label style={S.label}>Questions that got great responses (one per line)</label>
      <textarea style={S.textarea} placeholder="e.g. Walk me through how a homeowner ends up as your customer..." value={goodQs} onChange={e=>setGoodQs(e.target.value)}/>
      <label style={S.label}>Anything that surprised you?</label>
      <textarea style={S.textarea} placeholder="e.g. Company is deliberately staying invisible to competitors — no press, no announcements..." value={surprises} onChange={e=>setSurprises(e.target.value)}/>
      <button style={{...S.btn,background:saving?'#9ca3af':'linear-gradient(135deg,#22c55e,#16a34a)',marginTop:24}} onClick={save} disabled={saving}>
        {saving?'Saving to knowledge graph...':'Save to Knowledge Graph →'}
      </button>
    </div>
  );
}

// ─── INTERVIEWEE INFO PAGE ────────────────────────────────────
function IntervieweePage(){
  const {id}=useParams();
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    axios.get(`${API_URL}/brief/${id}`)
      .then(r=>{const rd=typeof r.data==='string'?JSON.parse(r.data):r.data;setData(rd.body?JSON.parse(rd.body):rd);})
      .catch(console.error).finally(()=>setLoading(false));
  },[id]);

  if(loading) return(<div style={S.loadingScreen}><div style={S.loadingCard}><div style={S.spinner}/><p style={{color:'#6b7280',marginTop:20}}>Loading...</p></div></div>);

  return(
    <div style={S.page}><div style={S.container}>
      <div style={S.header}><h1 style={S.logo}>⚡ <span style={S.logoAccent}>AX</span>IS</h1><p style={S.tagline}>Texas A&M — Before Our Conversation</p></div>
      <div style={S.card}>
        <div style={{display:'inline-block',background:'#eff6ff',color:'#1d4ed8',padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,marginBottom:16}}>FROM TEXAS A&M UNIVERSITY</div>
        <h2 style={{color:'#1a1a2e',fontSize:22,fontWeight:800,marginBottom:12}}>Before our conversation about {data?.company_name||'your organization'}</h2>
        <p style={{color:'#6b7280',fontSize:15,lineHeight:1.7,marginBottom:24}}>We wanted to share what we've learned so our time together goes straight to the things that actually matter — no basic background questions, just a real conversation.</p>
        <div style={{background:'#f8fafc',borderRadius:14,padding:24}}>
          <pre style={{fontFamily:'inherit',fontSize:14,lineHeight:1.85,color:'#374151',whiteSpace:'pre-wrap'}}>{data?.interviewee_email||'Loading your preparation materials...'}</pre>
        </div>
        <div style={{marginTop:24,padding:16,background:'#f0fdf4',borderRadius:12,border:'1px solid #bbf7d0'}}>
          <p style={{color:'#166534',fontSize:14,fontWeight:600}}>✓ No action needed — this is just a heads-up before we talk.</p>
        </div>
      </div>
      <p style={S.footer}>Texas A&M University • AXIS Interview Intelligence</p>
    </div></div>
  );
}

export default function App(){
  return(<Router><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/brief/:id" element={<Brief/>}/>
    <Route path="/i/:id" element={<IntervieweePage/>}/>
  </Routes></Router>);
}
