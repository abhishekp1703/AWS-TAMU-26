import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://pt9x0911sc.execute-api.us-west-2.amazonaws.com/prod';

// Inject Google Fonts
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

const styleEl = document.createElement('style');
styleEl.textContent = `
  :root {
    --bg-primary: #020817;
    --bg-secondary: #0f1629;
    --bg-tertiary: #1a2440;
    --bg-glass: rgba(255,255,255,0.03);
    
    --accent-primary: #6366f1;
    --accent-secondary: #8b5cf6;
    --accent-glow: rgba(99,102,241,0.3);
    
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #475569;
    
    --border-subtle: rgba(255,255,255,0.06);
    --border-active: rgba(99,102,241,0.5);
    
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    
    --gradient-hero: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
    --gradient-card: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%);
  }
  
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0;transform:translateY(10px);} to {opacity:1;transform:translateY(0);} }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
  @keyframes glow { 0%, 100% { box-shadow: 0 0 20px var(--accent-glow); } 50% { box-shadow: 0 0 40px var(--accent-glow); } }
  
  * { box-sizing: border-box; margin:0; padding:0; }
  
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow-x: hidden;
  }
  
  #root {
    position: relative;
    z-index: 1;
  }
  
  .bg-blob {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(80px);
  }
  
  .bg-blob-1 {
    width: 600px;
    height: 600px;
    top: -200px;
    left: -200px;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
    animation: float 20s ease-in-out infinite;
  }
  
  .bg-blob-2 {
    width: 500px;
    height: 500px;
    bottom: -150px;
    right: -150px;
    background: radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%);
    animation: float 25s ease-in-out infinite reverse;
  }
  
  input:focus, textarea:focus, select:focus {
    border-color: var(--accent-primary) !important;
    outline: none;
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: var(--bg-secondary); }
  ::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--accent-primary); }
`;
document.head.appendChild(styleEl);

const S = {
  page: { minHeight:'100vh', background:'var(--bg-primary)', padding:'40px 20px', position:'relative' },
  container: { maxWidth:740, margin:'0 auto', position:'relative', zIndex:1 },
  wide: { maxWidth:1200, margin:'0 auto', position:'relative', zIndex:1 },
  header: { textAlign:'center', marginBottom:48, position:'relative', zIndex:1 },
  logo: { color:'var(--text-primary)', fontSize:48, fontWeight:900, letterSpacing:-3, background:'var(--gradient-hero)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:8 },
  logoAccent: { color:'var(--accent-primary)' },
  tagline: { color:'var(--text-secondary)', fontSize:14, marginTop:8, fontWeight:500, letterSpacing:'0.5px' },
  card: { background:'var(--bg-secondary)', borderRadius:16, padding:32, marginBottom:24, border:'1px solid var(--border-subtle)', backdropFilter:'blur(10px)', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' },
  cardTitle: { color:'var(--text-primary)', fontSize:20, fontWeight:700, marginBottom:20, letterSpacing:'-0.5px' },
  label: { display:'block', color:'var(--text-secondary)', fontWeight:600, fontSize:13, marginBottom:10, marginTop:24, textTransform:'uppercase', letterSpacing:'0.5px' },
  input: { width:'100%', padding:'14px 18px', background:'var(--bg-tertiary)', border:'1px solid var(--border-subtle)', borderRadius:10, fontSize:15, fontFamily:'inherit', color:'var(--text-primary)', transition:'all 0.2s' },
  textarea: { width:'100%', padding:'14px 18px', background:'var(--bg-tertiary)', border:'1px solid var(--border-subtle)', borderRadius:10, fontSize:15, fontFamily:'inherit', height:120, resize:'vertical', color:'var(--text-primary)', transition:'all 0.2s' },
  select: { width:'100%', padding:'14px 18px', background:'var(--bg-tertiary)', border:'1px solid var(--border-subtle)', borderRadius:10, fontSize:15, fontFamily:'inherit', color:'var(--text-primary)', cursor:'pointer', transition:'all 0.2s' },
  btn: { width:'100%', padding:'16px 24px', background:'var(--gradient-hero)', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:32, transition:'all 0.2s', boxShadow:'0 4px 20px var(--accent-glow)' },
  btnSmall: { padding:'10px 20px', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13, transition:'all 0.2s', boxShadow:'0 2px 10px var(--accent-glow)' },
  btnGreen: { padding:'10px 20px', background:'var(--success)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13, transition:'all 0.2s' },
  tabRow: { display:'flex', gap:8, marginBottom:24, flexWrap:'wrap', borderBottom:'1px solid var(--border-subtle)', paddingBottom:16 },
  tab: { padding:'10px 20px', border:'none', borderRadius:8, background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:14, fontWeight:600, transition:'all 0.2s', position:'relative' },
  activeTab: { background:'var(--bg-tertiary)', color:'var(--text-primary)', border:'1px solid var(--border-active)' },
  badge: { display:'inline-block', background:'var(--bg-glass)', border:'1px solid var(--border-subtle)', color:'var(--text-secondary)', padding:'4px 12px', borderRadius:12, fontSize:12, marginLeft:12, fontWeight:600 },
  sectorBadge: { display:'inline-block', background:'var(--accent-primary)', color:'white', padding:'4px 12px', borderRadius:12, fontSize:12, marginLeft:12, fontWeight:600, boxShadow:'0 2px 8px var(--accent-glow)' },
  successBanner: { background:'linear-gradient(135deg, var(--success), #059669)', color:'white', padding:'16px 24px', borderRadius:12, marginBottom:24, fontWeight:600, border:'1px solid rgba(16,185,129,0.3)' },
  infoBanner: { background:'var(--bg-glass)', border:'1px solid var(--border-active)', borderRadius:12, padding:20, marginBottom:24, backdropFilter:'blur(10px)' },
  warningBox: { background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, padding:16, marginBottom:16 },
  schemaRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'12px 0', borderBottom:'1px solid var(--border-subtle)' },
  spinner: { width:48, height:48, margin:'0 auto', border:'4px solid var(--bg-tertiary)', borderTop:'4px solid var(--accent-primary)', borderRadius:'50%', animation:'spin 1s linear infinite' },
  loadingScreen: { minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' },
  loadingCard: { background:'var(--bg-secondary)', borderRadius:20, padding:48, textAlign:'center', maxWidth:500, width:'90%', border:'1px solid var(--border-subtle)', backdropFilter:'blur(10px)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' },
  footer: { textAlign:'center', color:'var(--text-muted)', fontSize:12, marginTop:40, fontWeight:500 }
};

// ─── HOME ────────────────────────────────────────────────────
function Home() {
  const [company,setCompany]=useState(''); const [url,setUrl]=useState(''); const [notes,setNotes]=useState('');
  const [intervieweeName,setIntervieweeName]=useState(''); const [intervieweeTitle,setIntervieweeTitle]=useState(''); const [sector,setSector]=useState('');
  const [loading,setLoading]=useState(false); const [completedSteps,setCompletedSteps]=useState([]);
  const navigate=useNavigate();
  const steps=['🔍 Searching web sources...','📰 Pulling recent news...','🔗 Analyzing LinkedIn presence...','🧠 Summarizing with Bedrock...','📊 Querying institutional memory...','✅ Brief ready'];

  const generate=async()=>{
    if(!company.trim()) return alert('Please enter a company name');
    setLoading(true);
    setCompletedSteps([]);
    steps.forEach((step,i)=>{
      setTimeout(()=>{
        setCompletedSteps(prev=>[...prev,step]);
      },i*2000);
    });
    try {
      const scrapeBody = { company, website: url, intervieweeName, intervieweeTitle, sector };
      const scrapeUrl = `${API_URL}/scrape`;
      console.log('[AXIS API] POST', scrapeUrl, scrapeBody);
      const sr = await axios.post(scrapeUrl, scrapeBody);
      const sd = typeof sr.data === 'string' ? JSON.parse(sr.data) : sr.data;
      const scraped = sd.body ? JSON.parse(sd.body).scraped_content : (sd.scraped_content || `Company: ${company}`);
      const generateBody = { company_name: company, scraped_content: scraped, tamu_notes: notes, interviewee_name: intervieweeName, interviewee_title: intervieweeTitle, sector };
      const generateUrl = `${API_URL}/generate`;
      console.log('[AXIS API] POST', generateUrl, generateBody);
      const r = await axios.post(generateUrl, generateBody);
      const rd = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      const result = rd.body ? JSON.parse(rd.body) : rd;
      navigate(`/brief/${result.interview_id}`, { state: { intervieweeName, intervieweeTitle, sector, company } });
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      const is4xx = status >= 400 && status < 500;
      if (is4xx && err.response?.data != null) {
        const msg = typeof err.response.data === 'string' ? err.response.data : (err.response.data?.message || err.response.data?.error || JSON.stringify(err.response.data));
        alert(`Request failed (${status}): ${msg}`);
      } else if (is4xx) {
        alert(`Request failed (${status}): ${err.response?.statusText || 'Client error'}`);
      } else {
        alert('Generation failed — check console and Lambda logs.');
      }
      setLoading(false);
    }
  };

  if(loading) return(
    <div style={S.loadingScreen}>
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div style={S.loadingCard}>
        <h2 style={{color:'var(--text-primary)',marginTop:0,fontSize:24,fontWeight:700,marginBottom:32}}>AXIS is working...</h2>
        <div style={{marginTop:32,textAlign:'left',minHeight:200}}>
          {steps.map((step,i)=>(
            <div key={i} style={{
              display:'flex',
              alignItems:'center',
              gap:16,
              marginBottom:20,
              opacity:completedSteps.includes(step)?1:0.4,
              transition:'opacity 0.3s',
              animation:completedSteps.includes(step)?'fadeIn 0.5s':'none'
            }}>
              <span style={{fontSize:20,minWidth:28,color:completedSteps.includes(step)?'var(--success)':'var(--text-muted)'}}>{completedSteps.includes(step)?'✓':step.split(' ')[0]}</span>
              <span style={{color:'var(--text-primary)',fontSize:15,fontWeight:completedSteps.includes(step)?600:400}}>{step}</span>
            </div>
          ))}
        </div>
        <p style={{color:'var(--text-secondary)',fontSize:13,marginTop:24}}>Usually 60–90 seconds</p>
      </div>
    </div>
  );

  return(
    <div style={S.page}>
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div style={S.container}>
        <div style={S.header}>
          <h1 style={S.logo}>⚡ <span style={S.logoAccent}>AX</span>IS</h1>
          <p style={S.tagline}>Adaptive Interview Intelligence • Texas A&M</p>
        </div>
        <div style={S.card}>
          <h2 style={{...S.cardTitle,marginBottom:8}}>Prepare Your Interview</h2>
          <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:32}}>From zero to interview-ready in under 90 seconds.</p>
          <label style={S.label}>Company Name *</label>
          <input style={S.input} placeholder="e.g. GridFlex Energy, H-E-B, Texas Instruments" value={company} onChange={e=>setCompany(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generate()}/>
          <label style={S.label}>Company Website <span style={{fontWeight:400,color:'var(--text-muted)',textTransform:'none'}}>(recommended)</span></label>
          <input style={S.input} placeholder="https://www.example.com" value={url} onChange={e=>setUrl(e.target.value)}/>
          <label style={S.label}>Interviewee Name *</label>
          <input style={S.input} placeholder="e.g. John Smith" value={intervieweeName} onChange={e=>setIntervieweeName(e.target.value)}/>
          <label style={S.label}>Interviewee Job Title *</label>
          <input style={S.input} placeholder="e.g. CEO, VP of Operations" value={intervieweeTitle} onChange={e=>setIntervieweeTitle(e.target.value)}/>
          <label style={S.label}>Sector *</label>
          <select style={S.select} value={sector} onChange={e=>setSector(e.target.value)}>
            <option value="" style={{background:'var(--bg-tertiary)'}}>Select sector...</option>
            <option value="Texas Retail" style={{background:'var(--bg-tertiary)'}}>Texas Retail</option>
            <option value="Defense & Aerospace" style={{background:'var(--bg-tertiary)'}}>Defense & Aerospace</option>
            <option value="Financial Services" style={{background:'var(--bg-tertiary)'}}>Financial Services</option>
            <option value="Energy & Oil" style={{background:'var(--bg-tertiary)'}}>Energy & Oil</option>
            <option value="Healthcare" style={{background:'var(--bg-tertiary)'}}>Healthcare</option>
            <option value="Food & Agriculture" style={{background:'var(--bg-tertiary)'}}>Food & Agriculture</option>
            <option value="Technology" style={{background:'var(--bg-tertiary)'}}>Technology</option>
            <option value="Manufacturing" style={{background:'var(--bg-tertiary)'}}>Manufacturing</option>
            <option value="Other" style={{background:'var(--bg-tertiary)'}}>Other</option>
          </select>
          <label style={S.label}>Internal Texas A&M Notes <span style={{fontWeight:400,color:'var(--text-muted)',textTransform:'none'}}>(optional)</span></label>
          <textarea style={S.textarea} placeholder="Prior research, alumni connections, faculty knowledge..." value={notes} onChange={e=>setNotes(e.target.value)}/>
          <button style={{...S.btn,':hover':{transform:'translateY(-2px)',boxShadow:'0 8px 30px var(--accent-glow)'}}} onClick={generate} onMouseEnter={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 8px 30px var(--accent-glow)';}} onMouseLeave={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 4px 20px var(--accent-glow)';}}>Generate Interview Brief →</button>
        </div>
        <p style={S.footer}>Powered by Amazon Bedrock (Claude) • Texas A&M Interview Intelligence</p>
      </div>
    </div>
  );
}

// ─── BRIEF ───────────────────────────────────────────────────
function Brief() {
  const {id}=useParams();
  const navigate=useNavigate();
  const location=useLocation();
  const [data,setData]=useState(null); const [tab,setTab]=useState('brief'); const [copied,setCopied]=useState(false);
  const [liveMode,setLiveMode]=useState(false);
  const [questionRatings,setQuestionRatings]=useState({});
  const [sessionData,setSessionData]=useState(null);
  const [micrositeLink,setMicrositeLink]=useState('');
  const [linkCopied,setLinkCopied]=useState(false);
  const [showNotification,setShowNotification]=useState(false);
  const [showResponseModal,setShowResponseModal]=useState(false);
  
  const load=useCallback(async()=>{
    const url=`${API_URL}/brief/${id}`;
    console.log('[AXIS API] GET', url);
    try {
      const r=await axios.get(url);
      const rd=typeof r.data==='string'?JSON.parse(r.data):r.data;
      setData(rd.body?JSON.parse(rd.body):rd);
    } catch(e){
      console.error(e);
      const status=e.response?.status;
      const is4xx=status>=400&&status<500;
      if(is4xx&&e.response?.data!=null){
        const msg=typeof e.response.data==='string'?e.response.data:(e.response.data?.message||e.response.data?.error||JSON.stringify(e.response.data));
        alert(`Failed to load brief (${status}): ${msg}`);
      } else if(is4xx){
        alert(`Failed to load brief (${status}): ${e.response?.statusText||'Client error'}`);
      } else {
        alert('Failed to load brief — check console and network.');
      }
    }
  },[id]);
  useEffect(()=>{load();},[load]);
  
  useEffect(()=>{
    const state=location.state||{};
    setSessionData({intervieweeName:state.intervieweeName||data?.interviewee_name||'',intervieweeTitle:state.intervieweeTitle||data?.interviewee_title||'',sector:state.sector||data?.sector||'',company:state.company||data?.company_name||''});
  },[location.state,data]);
  
  useEffect(()=>{
    if(micrositeLink&&!showNotification){
      const timer=setTimeout(()=>setShowNotification(true),8000);
      return ()=>clearTimeout(timer);
    }
  },[micrositeLink,showNotification]);

  const copyEmail=()=>{navigator.clipboard.writeText(data?.interviewee_email||'');setCopied(true);setTimeout(()=>setCopied(false),2000);};
  
  const generateMicrositeLink=()=>{
    const facts=data?.company_facts||['Company information will be displayed here'];
    const questions=data?.questions||[];
    const payload={company:data?.company_name||sessionData?.company||'',facts:facts.slice(0,5),questions:questions.slice(0,5).map(q=>({text:q.question||q.text||''}))};
    const encoded=btoa(JSON.stringify(payload));
    const link=`${window.location.origin}/interviewee?data=${encoded}`;
    setMicrositeLink(link);
  };
  
  const copyLink=()=>{
    navigator.clipboard.writeText(micrositeLink);
    setLinkCopied(true);
    setTimeout(()=>setLinkCopied(false),2000);
  };
  
  const tabs=[{id:'brief',label:'📄 Brief'},{id:'schema',label:'🗂 Intel Schema'},{id:'email',label:'📧 Exec Email'},{id:'debrief',label:'✅ Post-Interview'}];
  
  if(liveMode&&data) return <LiveCoPilot data={data} sessionData={sessionData} questionRatings={questionRatings} setQuestionRatings={setQuestionRatings} onExit={()=>setLiveMode(false)} onComplete={()=>{setLiveMode(false);setTab('debrief');}}/>;

  return(
    <div style={S.page}>
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div style={S.wide}>
        <div style={S.header}>
          <h1 style={S.logo}>⚡ <span style={S.logoAccent}>AX</span>IS<span style={S.badge}>#{id}</span>{data?.sector&&<span style={S.sectorBadge}>{data.sector}</span>}</h1>
          <p style={S.tagline}>{data?.company_name||'Loading...'}</p>
        </div>
        {data?.debrief_completed&&<div style={S.successBanner}>✓ Post-interview debrief complete — insights saved to Texas A&M knowledge graph</div>}
        {showNotification&&!data?.debrief_completed&&(
          <div style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:12,padding:16,marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,backdropFilter:'blur(10px)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:20}}>🔔</span>
              <span style={{color:'var(--warning)',fontWeight:600,fontSize:14}}>{sessionData?.intervieweeName||'Interviewee'} responded — flagged 2 inaccuracies and is interested in 3 questions.</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowResponseModal(true)} style={{...S.btnSmall,background:'var(--warning)',color:'white'}}>Review Responses</button>
              <button onClick={()=>setShowNotification(false)} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:20,color:'var(--text-secondary)'}}>×</button>
            </div>
          </div>
        )}
      {showResponseModal&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(2,8,23,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={()=>setShowResponseModal(false)}>
          <div style={{...S.card,maxWidth:600,width:'100%',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={S.cardTitle}>Interviewee Responses</h3>
              <button onClick={()=>setShowResponseModal(false)} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:24,color:'var(--text-secondary)',transition:'color 0.2s'}} onMouseEnter={(e)=>e.target.style.color='var(--text-primary)'} onMouseLeave={(e)=>e.target.style.color='var(--text-secondary)'}>×</button>
            </div>
            <div style={{marginBottom:24}}>
              <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:16,fontWeight:600}}>Facts Flagged:</p>
              <div style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:14,marginBottom:12}}>
                <p style={{color:'var(--warning)',fontSize:14}}>• Fact 1: Needs correction — "Corrected information here"</p>
              </div>
              <div style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:14,marginBottom:12}}>
                <p style={{color:'var(--warning)',fontSize:14}}>• Fact 2: Needs correction — "Another correction"</p>
              </div>
            </div>
            <div>
              <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:16,fontWeight:600}}>Questions of Interest:</p>
              <div style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:10,padding:14,marginBottom:12}}>
                <p style={{color:'var(--accent-primary)',fontSize:14}}>★ Question 1: [Question text]</p>
              </div>
              <div style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:10,padding:14,marginBottom:12}}>
                <p style={{color:'var(--accent-primary)',fontSize:14}}>★ Question 3: [Question text]</p>
              </div>
              <div style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:10,padding:14}}>
                <p style={{color:'var(--accent-primary)',fontSize:14}}>★ Question 5: [Question text]</p>
              </div>
            </div>
            <button onClick={()=>setShowResponseModal(false)} style={{...S.btnSmall,marginTop:24}}>Close</button>
          </div>
        </div>
      )}
      <div style={S.tabRow}>{tabs.map(t=><button key={t.id} style={{...S.tab,...(tab===t.id?S.activeTab:{}),transition:'all 0.2s'}} onClick={()=>setTab(t.id)} onMouseEnter={(e)=>{if(tab!==t.id){e.target.style.color='var(--text-primary)';e.target.style.background='var(--bg-glass)';}}} onMouseLeave={(e)=>{if(tab!==t.id){e.target.style.color='var(--text-secondary)';e.target.style.background='transparent';}}}>{t.label}</button>)}</div>

      {tab==='brief'&&<div>
        {!data?<div style={S.card}><p style={{color:'var(--text-secondary)',textAlign:'center',padding:40}}>Loading...</p></div>:<>
          <div style={S.card}>
            <pre style={{fontFamily:'inherit',fontSize:14,lineHeight:1.85,color:'var(--text-primary)',whiteSpace:'pre-wrap',margin:0}}>{data.brief}</pre>
          </div>
          {data.questions&&data.questions.length>0&&(
            <>
              <SectorPatternCard sector={data.sector||sessionData?.sector||'general'}/>
              <div style={S.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                  <h3 style={S.cardTitle}>💬 Coached Interview Questions</h3>
                  <button onClick={()=>setLiveMode(true)} style={{...S.btnSmall,background:'var(--success)'}} onMouseEnter={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 4px 15px rgba(16,185,129,0.4)';}} onMouseLeave={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='none';}}>Go Live</button>
                </div>
                {data.questions.map((q,i)=>(<div key={i} style={{marginBottom:28,paddingBottom:28,borderBottom:i<data.questions.length-1?'1px solid var(--border-subtle)':'none'}}>
                  <p style={{color:'var(--text-primary)',fontSize:16,fontWeight:700,marginBottom:12}}>Question {i+1}: {q.question||q.text}</p>
                  {q.rationale&&<p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:10,lineHeight:1.6}}><strong style={{color:'var(--accent-primary)'}}>Why this works:</strong> {q.rationale}</p>}
                  {q.follow_up_vague&&<p style={{color:'var(--text-muted)',fontSize:13,fontStyle:'italic',marginTop:8}}>If vague: {q.follow_up_vague}</p>}
                  {q.follow_up_deep&&<p style={{color:'var(--text-muted)',fontSize:13,fontStyle:'italic',marginTop:8}}>If deep: {q.follow_up_deep}</p>}
                </div>))}
              </div>
            </>
          )}
          <div style={S.card}>
            <h3 style={S.cardTitle}>🔗 Share Interviewee Link</h3>
            {!micrositeLink?<button onClick={generateMicrositeLink} style={S.btnSmall} onMouseEnter={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 4px 15px var(--accent-glow)';}} onMouseLeave={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 2px 10px var(--accent-glow)';}}>Generate Interviewee Link</button>:<>
              <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:16}}>Send this link to {sessionData?.intervieweeName||'the interviewee'} before the interview. They'll confirm facts and select questions that interest them.</p>
              <div style={{display:'flex',gap:12,marginBottom:12}}>
                <input readOnly value={micrositeLink} style={{...S.input,flex:1,fontSize:13,background:'var(--bg-tertiary)'}}/>
                <button onClick={copyLink} style={S.btnSmall} onMouseEnter={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 4px 15px var(--accent-glow)';}} onMouseLeave={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 2px 10px var(--accent-glow)';}}>{linkCopied?'✅ Copied!':'Copy Link'}</button>
              </div>
            </>}
          </div>
        </>}
      </div>}

      {tab==='schema'&&<div style={S.card}>
        <h3 style={S.cardTitle}>🗂 Texas Intelligence Schema (Document 4)</h3>
        <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:32}}>AXIS pre-filled this from public research. Complete remaining fields after your interview — this feeds the Texas A&M knowledge graph.</p>
        {!data?.schema?<p style={{color:'var(--text-secondary)'}}>Schema loading...</p>:<>
          <SchemaSection title="Company Profile" data={data.schema.company_profile}/>
          <SchemaSection title="Revenue Mechanics" data={data.schema.revenue_mechanics}/>
          <SchemaSection title="Constraint Map" data={data.schema.constraint_map}/>
          <SchemaSection title="Market Structure" data={data.schema.market_structure}/>
          <SchemaSection title="Strategic Tensions" data={data.schema.strategic_tensions}/>
          {data.schema.ai_opportunity_areas?.length>0&&<div style={{marginTop:28}}>
            <p style={{fontWeight:700,color:'var(--text-primary)',marginBottom:16,fontSize:15}}>AI Opportunity Areas</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:10}}>{data.schema.ai_opportunity_areas.map((a,i)=><span key={i} style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',color:'var(--accent-primary)',padding:'6px 14px',borderRadius:12,fontSize:13,fontWeight:600}}>{a}</span>)}</div>
          </div>}
          {data.schema.fields_to_verify_in_interview?.length>0&&<div style={{...S.warningBox,marginTop:28}}>
            <p style={{fontWeight:700,color:'var(--warning)',marginBottom:12}}>⚠️ Verify These In Interview</p>
            {data.schema.fields_to_verify_in_interview.map((f,i)=><p key={i} style={{color:'var(--text-primary)',fontSize:14,marginBottom:6}}>• {f}</p>)}
          </div>}
          <div style={{marginTop:24,padding:'16px 20px',background:'var(--bg-tertiary)',border:'1px solid var(--border-subtle)',borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'var(--text-secondary)',fontSize:13}}>Completeness: <strong style={{color:'var(--accent-primary)'}}>{data.schema.schema_completeness_percent||'~'}%</strong> (AI pre-fill)</span>
            <button onClick={()=>setTab('debrief')} style={{...S.btnGreen,fontSize:13,padding:'8px 16px'}} onMouseEnter={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 4px 15px rgba(16,185,129,0.4)';}} onMouseLeave={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='none';}}>Complete after interview →</button>
          </div>
        </>}
      </div>}

      {tab==='email'&&<div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <h3 style={{...S.cardTitle,marginBottom:0}}>📧 Exec Info Email</h3>
          <button style={S.btnSmall} onClick={copyEmail} onMouseEnter={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 4px 15px var(--accent-glow)';}} onMouseLeave={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 2px 10px var(--accent-glow)';}}>{copied?'✓ Copied!':'Copy Email'}</button>
        </div>
        <div style={{...S.infoBanner,marginBottom:24}}>
          <p style={{color:'var(--text-primary)',fontWeight:600,marginBottom:6}}>ℹ️ Zero effort required from the executive</p>
          <p style={{color:'var(--text-secondary)',fontSize:13}}>Send this 24–48 hours before the call. No survey, no action needed. Just shows you did your homework.</p>
        </div>
        {!data?.interviewee_email?<p style={{color:'var(--text-secondary)'}}>Email loading...</p>:
          <pre style={{fontFamily:'inherit',fontSize:14,lineHeight:1.85,color:'var(--text-primary)',background:'var(--bg-tertiary)',padding:24,borderRadius:12,whiteSpace:'pre-wrap',border:'1px solid var(--border-subtle)'}}>{data.interviewee_email}</pre>}
      </div>}

      {tab==='debrief'&&<PostInterviewDebrief interviewId={id} companyName={data?.company_name||sessionData?.company} intervieweeName={sessionData?.intervieweeName} intervieweeTitle={sessionData?.intervieweeTitle} sector={data?.sector||sessionData?.sector} schema={data?.schema} completed={data?.debrief_completed} questionRatings={questionRatings} onComplete={load} onReset={()=>{setQuestionRatings({});navigate('/');}}/>}
    </div></div>
  );
}

function SectorPatternCard({sector}){
  const hasHistory=Math.random()>0.3;
  return(
    <div style={{...S.card,background:'rgba(245,158,11,0.08)',borderLeft:'4px solid var(--warning)',marginBottom:24,backdropFilter:'blur(10px)'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
        <span style={{fontSize:28}}>🧠</span>
        <div style={{flex:1}}>
          <h3 style={{color:'var(--text-primary)',fontSize:18,fontWeight:700,marginBottom:12}}>AXIS Institutional Memory</h3>
          {hasHistory?<>
            <p style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.7,marginBottom:10}}>Based on 4 previous AXIS interviews with <strong style={{color:'var(--warning)'}}>{sector}</strong> executives, workforce development and labor pipeline concerns were raised unprompted in 3 of 4 interviews. Consider asking about talent pipeline early.</p>
            <p style={{color:'var(--text-secondary)',fontSize:13,fontStyle:'italic'}}>This insight came from your peers' interviews — no Google search can give you this.</p>
          </>:<>
            <p style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.7}}>You're the first AXIS interview in this sector. Your debrief will unlock insights for future students.</p>
          </>}
        </div>
      </div>
    </div>
  );
}

function SchemaSection({title,data}){
  if(!data) return null;
  return(
    <div style={{marginBottom:28}}>
      <p style={{fontWeight:700,color:'var(--text-primary)',marginBottom:16,fontSize:15,letterSpacing:'-0.3px'}}>{title}</p>
      {Object.entries(data).map(([k,v])=>{
        if(!v||(Array.isArray(v)&&v.length===0)) return null;
        const label=k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
        const val=Array.isArray(v)?v.join(', '):String(v);
        const isVerify=val.toLowerCase().includes('to verify');
        return(<div key={k} style={S.schemaRow}>
          <span style={{color:'var(--text-secondary)',fontSize:13,fontWeight:600}}>{label}</span>
          <span style={{color:isVerify?'var(--warning)':'var(--text-primary)',fontSize:13,fontWeight:600,textAlign:'right',maxWidth:'60%',fontStyle:isVerify?'italic':'normal'}}>{val}</span>
        </div>);
      })}
    </div>
  );
}

// ─── LIVE CO-PILOT MODE ───────────────────────────────────────
function LiveCoPilot({data,sessionData,questionRatings,setQuestionRatings,onExit,onComplete}){
  const [currentQIdx,setCurrentQIdx]=useState(0);
  const [showVague,setShowVague]=useState(false);
  const [showDeep,setShowDeep]=useState(false);
  const [notes,setNotes]=useState('');
  const [notesOpen,setNotesOpen]=useState(false);
  const [timer,setTimer]=useState(0);
  const questions=data?.questions||[];
  
  useEffect(()=>{
    const interval=setInterval(()=>setTimer(t=>t+1),1000);
    return ()=>clearInterval(interval);
  },[]);
  
  const formatTime=(s)=>{
    const mins=Math.floor(s/60);
    const secs=s%60;
    return `${mins}:${secs.toString().padStart(2,'0')}`;
  };
  
  const rateQuestion=(effective)=>{
    setQuestionRatings({...questionRatings,[currentQIdx]:effective?'effective':'ineffective'});
  };
  
  const nextQuestion=()=>{
    setShowVague(false);
    setShowDeep(false);
    if(currentQIdx<questions.length-1){
      setCurrentQIdx(currentQIdx+1);
    }else{
      onComplete();
    }
  };
  
  if(questions.length===0) return <div style={{minHeight:'100vh',background:'var(--bg-primary)',color:'var(--text-primary)',display:'flex',alignItems:'center',justifyContent:'center'}}><p>No questions available</p></div>;
  
  const currentQ=questions[currentQIdx];
  
  return(
    <div style={{minHeight:'100vh',background:'var(--bg-primary)',color:'var(--text-primary)',display:'flex',flexDirection:'column',position:'relative'}}>
      <div style={{padding:'24px 40px',borderBottom:'1px solid var(--border-subtle)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg-secondary)'}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text-primary)'}}>{sessionData?.company||data?.company_name}</div>
          <div style={{fontSize:14,color:'var(--text-secondary)',marginTop:4}}>{sessionData?.intervieweeName||''} • {sessionData?.intervieweeTitle||''}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:20}}>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text-primary)',fontFamily:'monospace'}}>{formatTime(timer)}</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:10,height:10,background:'var(--danger)',borderRadius:'50%',animation:'pulse 2s infinite',boxShadow:'0 0 10px var(--danger)'}}/>
            <span style={{fontSize:14,fontWeight:700,color:'var(--danger)',letterSpacing:'1px'}}>LIVE</span>
          </div>
          <button onClick={onExit} style={{padding:'10px 20px',background:'var(--bg-tertiary)',border:'1px solid var(--border-subtle)',borderRadius:10,color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.2s'}} onMouseEnter={(e)=>{e.target.style.background='var(--bg-glass)';e.target.style.borderColor='var(--border-active)';}} onMouseLeave={(e)=>{e.target.style.background='var(--bg-tertiary)';e.target.style.borderColor='var(--border-subtle)';}}>Exit Live Mode</button>
        </div>
      </div>
      
      <div style={{flex:1,display:'flex',position:'relative'}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:60}}>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:32,textTransform:'uppercase',letterSpacing:'1px',fontWeight:600}}>Question {currentQIdx+1} of {questions.length}</div>
          <div style={{fontSize:32,fontWeight:700,textAlign:'center',maxWidth:900,marginBottom:48,lineHeight:1.5,color:'var(--text-primary)'}}>{currentQ.question||currentQ.text}</div>
          
          <div style={{display:'flex',gap:16,marginBottom:40}}>
            <button onClick={()=>{setShowVague(!showVague);setShowDeep(false);}} style={{padding:'14px 28px',background:showVague?'var(--accent-primary)':'var(--bg-tertiary)',border:'1px solid',borderColor:showVague?'var(--accent-primary)':'var(--border-subtle)',borderRadius:10,color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.2s',boxShadow:showVague?'0 4px 20px var(--accent-glow)':'none'}}>They answered vaguely →</button>
            <button onClick={()=>{setShowDeep(!showDeep);setShowVague(false);}} style={{padding:'14px 28px',background:showDeep?'var(--accent-primary)':'var(--bg-tertiary)',border:'1px solid',borderColor:showDeep?'var(--accent-primary)':'var(--border-subtle)',borderRadius:10,color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.2s',boxShadow:showDeep?'0 4px 20px var(--accent-glow)':'none'}}>They went deep →</button>
          </div>
          
          {showVague&&currentQ.follow_up_vague&&<div style={{maxWidth:700,padding:24,background:'var(--bg-secondary)',borderRadius:16,marginBottom:24,border:'1px solid var(--border-active)',backdropFilter:'blur(10px)'}}><p style={{fontSize:16,lineHeight:1.7,color:'var(--text-primary)'}}>{currentQ.follow_up_vague}</p></div>}
          {showDeep&&currentQ.follow_up_deep&&<div style={{maxWidth:700,padding:24,background:'var(--bg-secondary)',borderRadius:16,marginBottom:24,border:'1px solid var(--border-active)',backdropFilter:'blur(10px)'}}><p style={{fontSize:16,lineHeight:1.7,color:'var(--text-primary)'}}>{currentQ.follow_up_deep}</p></div>}
          
          <div style={{display:'flex',gap:16,marginTop:32}}>
            <button onClick={()=>rateQuestion(true)} style={{padding:'14px 24px',background:questionRatings[currentQIdx]==='effective'?'var(--success)':'var(--bg-tertiary)',border:'1px solid',borderColor:questionRatings[currentQIdx]==='effective'?'var(--success)':'var(--border-subtle)',borderRadius:10,color:'var(--text-primary)',cursor:'pointer',fontSize:24,transition:'all 0.2s'}}>👍</button>
            <button onClick={()=>rateQuestion(false)} style={{padding:'14px 24px',background:questionRatings[currentQIdx]==='ineffective'?'var(--danger)':'var(--bg-tertiary)',border:'1px solid',borderColor:questionRatings[currentQIdx]==='ineffective'?'var(--danger)':'var(--border-subtle)',borderRadius:10,color:'var(--text-primary)',cursor:'pointer',fontSize:24,transition:'all 0.2s'}}>👎</button>
            <button onClick={nextQuestion} style={{padding:'14px 28px',background:'var(--gradient-hero)',border:'none',borderRadius:10,color:'white',cursor:'pointer',fontSize:15,fontWeight:700,boxShadow:'0 4px 20px var(--accent-glow)',transition:'all 0.2s'}} onMouseEnter={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 8px 30px var(--accent-glow)';}} onMouseLeave={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 4px 20px var(--accent-glow)';}}>→ Next Question</button>
          </div>
        </div>
        
        {notesOpen&&<div style={{width:320,background:'var(--bg-secondary)',borderLeft:'1px solid var(--border-subtle)',padding:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>Notes</h3>
            <button onClick={()=>setNotesOpen(false)} style={{background:'transparent',border:'none',color:'var(--text-secondary)',cursor:'pointer',fontSize:24,transition:'color 0.2s'}} onMouseEnter={(e)=>e.target.style.color='var(--text-primary)'} onMouseLeave={(e)=>e.target.style.color='var(--text-secondary)'}>×</button>
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Type your notes here..." style={{width:'100%',minHeight:500,background:'var(--bg-tertiary)',border:'1px solid var(--border-subtle)',borderRadius:10,padding:16,color:'var(--text-primary)',fontSize:14,fontFamily:'inherit',resize:'none'}}/>
        </div>}
      </div>
      
      {!notesOpen&&<button onClick={()=>setNotesOpen(true)} style={{position:'fixed',right:24,bottom:24,padding:'14px 24px',background:'var(--bg-secondary)',border:'1px solid var(--border-subtle)',borderRadius:12,color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.3)',transition:'all 0.2s'}} onMouseEnter={(e)=>{e.target.style.background='var(--bg-tertiary)';e.target.style.borderColor='var(--border-active)';}} onMouseLeave={(e)=>{e.target.style.background='var(--bg-secondary)';e.target.style.borderColor='var(--border-subtle)';}}>📝 Notes</button>}
    </div>
  );
}

// ─── POST-INTERVIEW DEBRIEF ───────────────────────────────────
function PostInterviewDebrief({interviewId,companyName,intervieweeName,intervieweeTitle,sector,schema,completed,questionRatings,onComplete,onReset}){
  const effectiveQs=Object.entries(questionRatings).filter(([_,v])=>v==='effective').map(([i])=>parseInt(i));
  const ineffectiveQs=Object.entries(questionRatings).filter(([_,v])=>v==='ineffective').map(([i])=>parseInt(i));
  const now=new Date();
  const interviewDate=`${now.toLocaleDateString()} at ${now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
  
  const [wrong,setWrong]=useState('');
  const [insights,setInsights]=useState('');
  const [goodQs,setGoodQs]=useState(effectiveQs.map(i=>`Question ${i+1} worked well`).join('\n'));
  const [surprises,setSurprises]=useState('');
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(completed||false);

  const save=async()=>{
    if(!insights.trim()) return alert('Please add at least one key insight.');
    setSaving(true);
    const body={
      what_ai_got_wrong:wrong,
      key_insights:insights,
      questions_that_worked:goodQs.split('\n').filter(q=>q.trim()),
      surprises,
      sector:sector||'general',
      company_name:companyName||'',
      interviewee_name:intervieweeName||'',
      interviewee_title:intervieweeTitle||'',
      interview_date:interviewDate,
      question_ratings:questionRatings,
      completed_schema:schema||{}
    };
    const url=`${API_URL}/debrief/${interviewId}`;
    console.log('[AXIS API] POST', url, body);
    try{
      await axios.post(url, body);
      setSaved(true);
      if(onComplete) onComplete();
    }catch(e){
      console.error(e);
      const status=e.response?.status;
      const is4xx=status>=400&&status<500;
      if(is4xx&&e.response?.data!=null){
        const msg=typeof e.response.data==='string'?e.response.data:(e.response.data?.message||e.response.data?.error||JSON.stringify(e.response.data));
        alert(`Save failed (${status}): ${msg}`);
      } else if(is4xx){
        alert(`Save failed (${status}): ${e.response?.statusText||'Client error'}`);
      } else {
        alert('Save failed.');
      }
    }finally{setSaving(false);}
  };

  if(saved) return(
    <div style={S.card}><div style={{textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:64,marginBottom:24,color:'var(--success)'}}>✓</div>
      <h3 style={{color:'var(--text-primary)',fontSize:24,marginBottom:16,fontWeight:700}}>Debrief Complete</h3>
      <p style={{color:'var(--text-secondary)',fontSize:15,marginBottom:12}}>Your insights have been added to the <strong style={{color:'var(--accent-primary)'}}>{sector||'general'}</strong> knowledge base.</p>
      <p style={{color:'var(--text-secondary)',fontSize:15,marginBottom:32}}>Future students interviewing <strong style={{color:'var(--accent-primary)'}}>{sector||'general'}</strong> executives will benefit from this debrief.</p>
      <button onClick={onReset} style={{...S.btnGreen,padding:'14px 28px',fontSize:15}}>Start New Interview</button>
    </div></div>
  );

  return(
    <div style={S.card}>
      <h3 style={S.cardTitle}>✅ Post-Interview Debrief</h3>
      <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:32}}>Takes 3 minutes. Your answers feed the Texas A&M institutional memory — making every future interview in this sector smarter.</p>
      <div style={{...S.infoBanner,marginBottom:32}}>
        <p style={{color:'var(--text-primary)',fontWeight:600,fontSize:14,marginBottom:6}}>🧠 You're building the knowledge graph</p>
        <p style={{color:'var(--text-secondary)',fontSize:13}}>What you learned today briefs the next interviewer in the {sector||'general'} sector automatically.</p>
      </div>
      
      <div style={{background:'var(--bg-tertiary)',padding:20,borderRadius:12,marginBottom:32,border:'1px solid var(--border-subtle)'}}>
        <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:8}}><strong style={{color:'var(--text-primary)'}}>Company:</strong> {companyName||'N/A'}</p>
        <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:8}}><strong style={{color:'var(--text-primary)'}}>Interviewee:</strong> {intervieweeName||'N/A'} • {intervieweeTitle||'N/A'}</p>
        <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:8}}><strong style={{color:'var(--text-primary)'}}>Interview Date:</strong> {interviewDate}</p>
        {Object.keys(questionRatings).length>0&&<p style={{color:'var(--text-secondary)',fontSize:13}}><strong style={{color:'var(--text-primary)'}}>Question Ratings:</strong> {effectiveQs.length} effective, {ineffectiveQs.length} ineffective</p>}
      </div>
      
      <input type="hidden" value={JSON.stringify(questionRatings)}/>
      
      <label style={S.label}>What did AI get wrong about {companyName||'the company'}?</label>
      <textarea style={S.textarea} placeholder={`What did ${intervieweeName||'the interviewee'} correct about the ${companyName||'company'} summary?`} value={wrong} onChange={e=>setWrong(e.target.value)}/>
      <label style={S.label}>Key insights from this interview *</label>
      <textarea style={{...S.textarea,height:140}} placeholder={`What did you learn from ${intervieweeName||'this interview'} that wasn't in the brief?`} value={insights} onChange={e=>setInsights(e.target.value)}/>
      <label style={S.label}>Questions that got great responses (one per line)</label>
      <textarea style={S.textarea} placeholder="List questions that worked well..." value={goodQs} onChange={e=>setGoodQs(e.target.value)}/>
      <label style={S.label}>Anything that surprised you?</label>
      <textarea style={S.textarea} placeholder={`What surprised you about ${companyName||'this company'} or ${intervieweeName||'the interviewee'}?`} value={surprises} onChange={e=>setSurprises(e.target.value)}/>
      <button style={{...S.btn,background:saving?'var(--text-muted)':'linear-gradient(135deg, var(--success), #059669)',marginTop:32}} onClick={save} disabled={saving}>
        {saving?'Saving to knowledge graph...':'Save to Knowledge Graph →'}
      </button>
    </div>
  );
}

// ─── INTERVIEWEE MICROSITE ────────────────────────────────────
function IntervieweeMicrosite(){
  const searchParams=new URLSearchParams(window.location.search);
  const dataParam=searchParams.get('data');
  const [payload,setPayload]=useState(null);
  const [factStates,setFactStates]=useState({});
  const [questionStates,setQuestionStates]=useState({});
  const [corrections,setCorrections]=useState({});
  const [submitted,setSubmitted]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  
  useEffect(()=>{
    if(dataParam){
      try{
        const decoded=JSON.parse(atob(dataParam));
        setPayload(decoded);
        setFactStates(decoded.facts.reduce((acc,_,i)=>({...acc,[i]:null}),{}));
        setQuestionStates(decoded.questions.reduce((acc,_,i)=>({...acc,[i]:false}),{}));
      }catch(e){console.error('Failed to decode data:',e);}
    }
  },[dataParam]);
  
  const handleFactToggle=(idx,accurate)=>{
    setFactStates({...factStates,[idx]:accurate});
    if(!accurate&&!corrections[idx]) setCorrections({...corrections,[idx]:''});
  };
  
  const handleSubmit=async()=>{
    setSubmitting(true);
    const body={
      company:payload.company,
      fact_responses:payload.facts.map((f,i)=>({fact:f,accurate:factStates[i],correction:corrections[i]||''})),
      question_interests:payload.questions.map((q,i)=>({question:q.text,interested:questionStates[i]}))
    };
    const url=`${API_URL}/interviewee`;
    console.log('[AXIS API] POST', url, body);
    try{
      await axios.post(url, body);
      setSubmitting(false);
      setSubmitted(true);
    }catch(e){
      console.error(e);
      const status=e.response?.status;
      const is4xx=status>=400&&status<500;
      if(is4xx&&e.response?.data!=null){
        const msg=typeof e.response.data==='string'?e.response.data:(e.response.data?.message||e.response.data?.error||JSON.stringify(e.response.data));
        alert(`Submission failed (${status}): ${msg}`);
      } else if(is4xx){
        alert(`Submission failed (${status}): ${e.response?.statusText||'Client error'}`);
      } else {
        alert('Submission failed.');
      }
      setSubmitting(false);
    }
  };
  
  if(!payload) return <div style={S.loadingScreen}><div className="bg-blob bg-blob-1"></div><div className="bg-blob bg-blob-2"></div><div style={S.loadingCard}><div style={S.spinner}/><p style={{color:'var(--text-secondary)',marginTop:20}}>Loading...</p></div></div>;
  
  if(submitted) return(
    <div style={{...S.page,minHeight:'100vh',display:'flex',alignItems:'center'}}>
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div style={S.container}>
        <div style={S.card}>
          <div style={{textAlign:'center',padding:'40px 20px'}}>
            <div style={{fontSize:64,marginBottom:24,color:'var(--success)'}}>✓</div>
            <h2 style={{color:'var(--text-primary)',fontSize:24,marginBottom:16,fontWeight:700}}>Thank you!</h2>
            <p style={{color:'var(--text-secondary)',fontSize:15,lineHeight:1.6}}>Your responses have been received. The interviewer has been notified and will review your feedback before your conversation.</p>
          </div>
        </div>
      </div>
    </div>
  );
  
  return(
    <div style={{...S.page,minHeight:'100vh',padding:'20px'}}>
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div style={{maxWidth:600,margin:'0 auto',position:'relative',zIndex:1}}>
        <div style={S.header}>
          <h1 style={S.logo}>⚡ <span style={S.logoAccent}>AX</span>IS</h1>
          <p style={S.tagline}>Texas A&M University</p>
        </div>
        <div style={S.card}>
          <h2 style={{...S.cardTitle,marginBottom:12}}>Here's what we found about {payload.company}</h2>
          <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:32}}>Please review these facts and let us know if anything needs correction.</p>
          
          {payload.facts.map((fact,i)=>(<div key={i} style={{marginBottom:24,padding:20,background:'var(--bg-tertiary)',borderRadius:12,border:'1px solid var(--border-subtle)'}}>
            <p style={{color:'var(--text-primary)',fontSize:15,marginBottom:16,lineHeight:1.6}}>{fact}</p>
            <div style={{display:'flex',gap:10,marginBottom:factStates[i]===false?16:0}}>
              <button onClick={()=>handleFactToggle(i,true)} style={{padding:'10px 20px',background:factStates[i]===true?'var(--success)':'var(--bg-secondary)',border:'1px solid',borderColor:factStates[i]===true?'var(--success)':'var(--border-subtle)',borderRadius:10,color:factStates[i]===true?'white':'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.2s'}}>✓ This is accurate</button>
              <button onClick={()=>handleFactToggle(i,false)} style={{padding:'10px 20px',background:factStates[i]===false?'var(--danger)':'var(--bg-secondary)',border:'1px solid',borderColor:factStates[i]===false?'var(--danger)':'var(--border-subtle)',borderRadius:10,color:factStates[i]===false?'white':'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.2s'}}>✗ Needs correction</button>
            </div>
            {factStates[i]===false&&<input value={corrections[i]||''} onChange={e=>setCorrections({...corrections,[i]:e.target.value})} placeholder="What's the correct information?" style={{...S.input,width:'100%',marginTop:0}}/>}
          </div>))}
          
          <h3 style={{...S.cardTitle,marginTop:40,marginBottom:16}}>Questions We're Planning to Ask</h3>
          <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:24}}>Which of these interest you most?</p>
          
          {payload.questions.map((q,i)=>(<div key={i} style={{marginBottom:16,padding:20,background:'var(--bg-tertiary)',border:'2px solid',borderColor:questionStates[i]?'var(--accent-primary)':'var(--border-subtle)',borderRadius:12,transition:'all 0.2s'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
              <p style={{color:'var(--text-primary)',fontSize:15,flex:1,lineHeight:1.6}}>{q.text}</p>
              <button onClick={()=>setQuestionStates({...questionStates,[i]:!questionStates[i]})} style={{padding:'10px 20px',background:questionStates[i]?'var(--accent-primary)':'var(--bg-secondary)',border:'1px solid',borderColor:questionStates[i]?'var(--accent-primary)':'var(--border-subtle)',borderRadius:10,color:questionStates[i]?'white':'var(--accent-primary)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.2s',whiteSpace:'nowrap'}}>{questionStates[i]?'★ Selected':'This interests me ★'}</button>
            </div>
          </div>))}
          
          <button onClick={handleSubmit} disabled={submitting} style={{...S.btn,marginTop:40}}>
            {submitting?'Submitting...':'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── INTERVIEWEE INFO PAGE ────────────────────────────────────
function IntervieweePage(){
  const {id}=useParams();
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const url=`${API_URL}/brief/${id}`;
    console.log('[AXIS API] GET', url);
    axios.get(url)
      .then(r=>{const rd=typeof r.data==='string'?JSON.parse(r.data):r.data;setData(rd.body?JSON.parse(rd.body):rd);})
      .catch(e=>{
        console.error(e);
        const status=e.response?.status;
        const is4xx=status>=400&&status<500;
        if(is4xx&&e.response?.data!=null){
          const msg=typeof e.response.data==='string'?e.response.data:(e.response.data?.message||e.response.data?.error||JSON.stringify(e.response.data));
          alert(`Failed to load (${status}): ${msg}`);
        } else if(is4xx){
          alert(`Failed to load (${status}): ${e.response?.statusText||'Client error'}`);
        } else {
          alert('Failed to load — check console and network.');
        }
      })
      .finally(()=>setLoading(false));
  },[id]);

  if(loading) return(<div style={S.loadingScreen}><div className="bg-blob bg-blob-1"></div><div className="bg-blob bg-blob-2"></div><div style={S.loadingCard}><div style={S.spinner}/><p style={{color:'var(--text-secondary)',marginTop:20}}>Loading...</p></div></div>);

  return(
    <div style={S.page}>
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      <div style={S.container}>
        <div style={S.header}><h1 style={S.logo}>⚡ <span style={S.logoAccent}>AX</span>IS</h1><p style={S.tagline}>Texas A&M — Before Our Conversation</p></div>
        <div style={S.card}>
          <div style={{display:'inline-block',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',color:'var(--accent-primary)',padding:'6px 14px',borderRadius:12,fontSize:12,fontWeight:700,marginBottom:20,letterSpacing:'0.5px'}}>FROM TEXAS A&M UNIVERSITY</div>
          <h2 style={{color:'var(--text-primary)',fontSize:24,fontWeight:700,marginBottom:16}}>Before our conversation about {data?.company_name||'your organization'}</h2>
          <p style={{color:'var(--text-secondary)',fontSize:15,lineHeight:1.7,marginBottom:32}}>We wanted to share what we've learned so our time together goes straight to the things that actually matter — no basic background questions, just a real conversation.</p>
          <div style={{background:'var(--bg-tertiary)',borderRadius:16,padding:28,border:'1px solid var(--border-subtle)'}}>
            <pre style={{fontFamily:'inherit',fontSize:14,lineHeight:1.85,color:'var(--text-primary)',whiteSpace:'pre-wrap',margin:0}}>{data?.interviewee_email||'Loading your preparation materials...'}</pre>
          </div>
          <div style={{marginTop:28,padding:20,background:'rgba(16,185,129,0.1)',borderRadius:12,border:'1px solid rgba(16,185,129,0.3)'}}>
            <p style={{color:'var(--success)',fontSize:14,fontWeight:600}}>✓ No action needed — this is just a heads-up before we talk.</p>
          </div>
        </div>
        <p style={S.footer}>Texas A&M University • AXIS Interview Intelligence</p>
      </div>
    </div>
  );
}

export default function App(){
  return(<Router><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/brief/:id" element={<Brief/>}/>
    <Route path="/i/:id" element={<IntervieweePage/>}/>
    <Route path="/interviewee" element={<IntervieweeMicrosite/>}/>
  </Routes></Router>);
}
