import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ⚠️ CHANGE THIS to your API Gateway URL after deploying
const API_URL = 'YOUR_API_GATEWAY_URL_HERE';

// Add spinner CSS
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  * { box-sizing: border-box; }
`;
document.head.appendChild(spinnerStyle);

// ============================================================
// STYLES
// ============================================================
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  container: { maxWidth: 720, margin: '0 auto' },
  wideContainer: { maxWidth: 960, margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: 32 },
  logo: { color: 'white', fontSize: 40, fontWeight: 900, letterSpacing: -2, margin: 0 },
  tagline: { color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '6px 0 0' },
  card: {
    background: 'white', borderRadius: 20, padding: 32, marginBottom: 20,
    boxShadow: '0 25px 60px rgba(0,0,0,0.35)'
  },
  cardTitle: { color: '#1a1a2e', fontSize: 20, fontWeight: 800, marginTop: 0, marginBottom: 16 },
  label: { display: 'block', color: '#374151', fontWeight: 700, fontSize: 14, marginBottom: 6, marginTop: 20 },
  input: {
    width: '100%', padding: '13px 16px', border: '2px solid #e5e7eb',
    borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  },
  textarea: {
    width: '100%', padding: '13px 16px', border: '2px solid #e5e7eb',
    borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'inherit',
    height: 100, resize: 'vertical'
  },
  btn: {
    width: '100%', padding: '15px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none', borderRadius: 12,
    fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 24,
    letterSpacing: 0.3
  },
  btnSecondary: {
    padding: '10px 20px', background: 'rgba(255,255,255,0.15)',
    color: 'white', border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer'
  },
  tabRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: {
    padding: '9px 18px', border: '2px solid rgba(255,255,255,0.25)',
    borderRadius: 10, background: 'transparent',
    color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: 14, fontWeight: 600
  },
  activeTab: { background: 'white', color: '#1a1a2e', border: '2px solid white' },
  briefText: {
    whiteSpace: 'pre-wrap', fontFamily: 'inherit',
    fontSize: 14, lineHeight: 1.85, color: '#333', margin: 0
  },
  badge: {
    display: 'inline-block', background: 'rgba(255,255,255,0.15)',
    color: 'white', padding: '4px 14px', borderRadius: 20, fontSize: 13, marginLeft: 10
  },
  successBanner: {
    background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white',
    padding: '16px 24px', borderRadius: 14, marginBottom: 20,
    fontWeight: 700, fontSize: 15, boxShadow: '0 4px 20px rgba(34,197,94,0.4)'
  },
  warningBanner: {
    background: 'rgba(255,255,255,0.1)', borderRadius: 14,
    padding: 20, marginBottom: 20, border: '1px solid rgba(255,255,255,0.2)'
  },
  linkBox: {
    flex: 1, background: 'rgba(0,0,0,0.4)', color: '#93c5fd',
    padding: '10px 14px', borderRadius: 10, fontSize: 13,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: 'monospace'
  },
  copyBtn: {
    padding: '10px 18px', background: '#3b82f6', color: 'white',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700
  },
  factCard: {
    border: '2px solid #e5e7eb', borderRadius: 14, padding: 18, marginBottom: 14
  },
  questionCard: {
    border: '2px solid #e5e7eb', borderRadius: 14, padding: 18,
    marginBottom: 12, cursor: 'pointer', display: 'flex',
    alignItems: 'flex-start', transition: 'all 0.15s', userSelect: 'none'
  },
  checkbox: {
    width: 26, height: 26, borderRadius: 8, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 16, marginRight: 14, flexShrink: 0, fontWeight: 800
  },
  spinner: {
    width: 52, height: 52, margin: '0 auto',
    border: '5px solid #e5e7eb', borderTop: '5px solid #667eea',
    borderRadius: '50%', animation: 'spin 1s linear infinite'
  },
  loadingScreen: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  loadingCard: {
    background: 'white', borderRadius: 24, padding: 52,
    textAlign: 'center', maxWidth: 420, width: '90%',
    boxShadow: '0 40px 80px rgba(0,0,0,0.5)'
  },
  step: { color: '#667eea', fontSize: 15, fontWeight: 600, marginTop: 16 },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 24 }
};

// ============================================================
// HOME PAGE — Interviewer starts here
// ============================================================
function Home() {
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [tamuNotes, setTamuNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();

  const steps = [
    '🔍 Researching company from public sources...',
    '🤠 Analyzing Texas business ecosystem...',
    '💬 Generating interview questions with coaching...',
    '🔎 Identifying knowledge gaps and blind spots...',
    '📄 Assembling your complete brief...'
  ];

  const generate = async () => {
    if (!companyName.trim()) return alert('Please enter a company name');
    setLoading(true);
    setStepIndex(0);
    setLoadingStep(steps[0]);

    // Animate steps
    steps.forEach((step, i) => {
      setTimeout(() => {
        setLoadingStep(step);
        setStepIndex(i);
      }, i * 12000);
    });

    try {
      // Step 1: Scrape
      const scrapeRes = await axios.post(`${API_URL}/scrape`, {
        company_name: companyName,
        company_url: companyUrl
      });
      const scrapeData = typeof scrapeRes.data === 'string' 
        ? JSON.parse(scrapeRes.data) 
        : scrapeRes.data;
      const scraped = scrapeData.body 
        ? JSON.parse(scrapeData.body).scraped_content 
        : scrapeData.scraped_content;

      // Step 2: Generate brief
      const res = await axios.post(`${API_URL}/generate`, {
        company_name: companyName,
        scraped_content: scraped || `Company: ${companyName}`,
        tamu_notes: tamuNotes
      });
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      const result = data.body ? JSON.parse(data.body) : data;

      navigate(`/brief/${result.interview_id}`);
    } catch (err) {
      console.error('Generation error:', err);
      alert('Something went wrong. Check the browser console and Lambda logs.');
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={S.loadingScreen}>
      <div style={S.loadingCard}>
        <div style={S.spinner} />
        <h2 style={{ color: '#1a1a2e', marginTop: 24, marginBottom: 8 }}>
          AXIS is working...
        </h2>
        <p style={S.step}>{loadingStep}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              background: i <= stepIndex ? '#667eea' : '#e5e7eb',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 16 }}>
          Usually takes 60–90 seconds
        </p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <h1 style={S.logo}>⚡ AXIS</h1>
          <p style={S.tagline}>Adaptive Interview Intelligence • Texas A&M</p>
        </div>

        <div style={S.card}>
          <h2 style={S.cardTitle}>Prepare Your Interview</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: -8 }}>
            From zero to interview-ready in under 90 seconds.
          </p>

          <label style={S.label}>Company Name *</label>
          <input
            style={S.input}
            placeholder="e.g. H-E-B, Texas Instruments, Kinder Morgan"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
          />

          <label style={S.label}>Company Website <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional but recommended)</span></label>
          <input
            style={S.input}
            placeholder="https://www.example.com"
            value={companyUrl}
            onChange={e => setCompanyUrl(e.target.value)}
          />

          <label style={S.label}>Internal Texas A&M Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
          <textarea
            style={S.textarea}
            placeholder="Any prior research, alumni connections, faculty knowledge, or context about this company or sector..."
            value={tamuNotes}
            onChange={e => setTamuNotes(e.target.value)}
          />

          <button style={S.btn} onClick={generate}>
            Generate Interview Brief →
          </button>
        </div>

        <p style={S.footer}>
          Powered by Amazon Bedrock (Claude) • Texas A&M Interview Intelligence Program
        </p>
      </div>
    </div>
  );
}

// ============================================================
// BRIEF PAGE — Interviewer's dashboard
// ============================================================
function Brief() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('brief');
  const [copied, setCopied] = useState(false);

  const intervieweeLink = `${window.location.origin}/i/${id}`;

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/brief/${id}`);
      const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      const d = result.body ? JSON.parse(result.body) : result;
      setData(d);
    } catch (err) {
      console.error('Load error:', err);
    }
  }, [id]);

  useEffect(() => {
    load();
    // Poll every 15 seconds for interviewee response
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const copyLink = () => {
    navigator.clipboard.writeText(intervieweeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'brief', label: '📄 Full Brief' },
    { id: 'questions', label: '💬 Questions' },
    { id: 'packet', label: '📧 Interviewee Packet' },
    { id: 'response', label: '✓ Their Response' }
  ];

  const responded = data?.status === 'interviewee_responded';

  return (
    <div style={S.page}>
      <div style={S.wideContainer}>
        <div style={S.header}>
          <h1 style={S.logo}>
            ⚡ AXIS
            <span style={S.badge}>#{id}</span>
          </h1>
          <p style={S.tagline}>{data?.company_name || 'Loading...'}</p>
        </div>

        {responded && (
          <div style={S.successBanner}>
            ✓ Interviewee responded! They flagged {data.interviewee_corrections?.length || 0} corrections
            and selected {data.interviewee_selected_questions?.length || 0} questions.
            {data.interviewee_wildcard && ' They also shared an unprompted insight.'}
          </div>
        )}

        {/* Send to interviewee */}
        <div style={S.warningBanner}>
          <p style={{ color: 'white', fontWeight: 700, margin: '0 0 6px' }}>
            📧 Send this link to your interviewee
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 12px' }}>
            They'll review what AI found, flag corrections, and select which questions interest them.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <code style={S.linkBox}>{intervieweeLink}</code>
            <button style={S.copyBtn} onClick={copyLink}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          {!responded && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '10px 0 0' }}>
              ⏳ Waiting for interviewee response... (auto-refreshes every 15 seconds)
            </p>
          )}
        </div>

        {/* Tabs */}
        <div style={S.tabRow}>
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...S.tab, ...(activeTab === t.id ? S.activeTab : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={S.card}>
          {!data ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>
              Loading your brief...
            </p>
          ) : activeTab === 'brief' ? (
            <pre style={S.briefText}>{data.brief || 'Brief not yet available'}</pre>
          ) : activeTab === 'questions' ? (
            <div>
              <h3 style={S.cardTitle}>Interview Questions with Coaching</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                Each question includes rationale and follow-up guidance to help you probe deeper.
              </p>
              <pre style={S.briefText}>{data.brief || ''}</pre>
            </div>
          ) : activeTab === 'packet' ? (
            <div>
              <h3 style={S.cardTitle}>What the Interviewee Received</h3>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
                This is the personalized microsite your interviewee can access at their link.
              </p>
              {data.facts?.length > 0 && (
                <div>
                  <p style={{ fontWeight: 700, color: '#374151' }}>Facts we shared:</p>
                  {data.facts.map((f, i) => (
                    <div key={i} style={{ ...S.factCard, marginBottom: 8 }}>
                      <p style={{ margin: 0, color: '#333', fontSize: 14 }}>{f}</p>
                    </div>
                  ))}
                </div>
              )}
              {data.interviewee_questions?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontWeight: 700, color: '#374151' }}>Questions we shared:</p>
                  {data.interviewee_questions.map((q, i) => (
                    <div key={i} style={{ ...S.factCard, marginBottom: 8 }}>
                      <p style={{ margin: 0, color: '#333', fontSize: 14 }}>
                        {i + 1}. {q}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'response' ? (
            <div>
              <h3 style={S.cardTitle}>
                {responded ? '✓ Interviewee Response' : '⏳ Waiting for Response'}
              </h3>
              {!responded ? (
                <p style={{ color: '#6b7280' }}>
                  Send the link above to your interviewee. Their response will appear here automatically.
                </p>
              ) : (
                <div>
                  {data.interviewee_corrections?.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <p style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>
                        🔴 They corrected these ({data.interviewee_corrections.length}):
                      </p>
                      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
                        💡 <strong>Use these as your warm opening:</strong> "Our AI got a few things wrong — can you help us understand..."
                      </p>
                      {data.interviewee_corrections.map((c, i) => (
                        <div key={i} style={{ ...S.factCard, borderColor: '#fca5a5', background: '#fff5f5' }}>
                          <p style={{ margin: 0, color: '#991b1b', fontSize: 14 }}>
                            {c.correction || JSON.stringify(c)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.interviewee_selected_questions?.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <p style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>
                        ✅ They want to discuss these questions:
                      </p>
                      {data.interviewee_selected_questions.map((q, i) => (
                        <div key={i} style={{ ...S.factCard, borderColor: '#86efac', background: '#f0fdf4' }}>
                          <p style={{ margin: 0, color: '#166534', fontSize: 14 }}>{q}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.interviewee_wildcard && (
                    <div>
                      <p style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>
                        🎯 What they wish interviewers would ask:
                      </p>
                      <div style={{ ...S.factCard, borderColor: '#c4b5fd', background: '#f5f3ff' }}>
                        <p style={{ margin: 0, color: '#5b21b6', fontSize: 15, fontStyle: 'italic' }}>
                          "{data.interviewee_wildcard}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INTERVIEWEE MICROSITE — What the business leader sees
// ============================================================
function IntervieweePage() {
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('Your Organization');
  const [facts, setFacts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [wildcard, setWildcard] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/brief/${id}`);
        const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        const d = result.body ? JSON.parse(result.body) : result;

        setCompanyName(d.company_name || 'Your Organization');

        // Set facts
        const rawFacts = d.facts || [];
        setFacts(rawFacts.map((text, i) => ({
          id: i + 1, text, accurate: null, correction: ''
        })));

        // Set questions
        const rawQs = d.interviewee_questions || [];
        setQuestions(rawQs.map((text, i) => ({
          id: i + 1, text, selected: false
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const toggleFact = (factId, accurate) => {
    setFacts(facts.map(f => f.id === factId ? { ...f, accurate } : f));
  };

  const updateCorrection = (factId, text) => {
    setFacts(facts.map(f => f.id === factId ? { ...f, correction: text } : f));
  };

  const toggleQuestion = (qId) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, selected: !q.selected } : q));
  };

  const submit = async () => {
    try {
      await axios.post(`${API_URL}/interviewee/${id}`, {
        corrections: facts.filter(f => f.accurate === false).map(f => ({
          original: f.text, correction: f.correction
        })),
        selected_questions: questions.filter(q => q.selected).map(q => q.text),
        wildcard
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Error submitting. Please try again.');
    }
  };

  if (loading) return (
    <div style={S.loadingScreen}>
      <div style={S.loadingCard}>
        <div style={S.spinner} />
        <p style={{ color: '#6b7280', marginTop: 20 }}>Loading your packet...</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ ...S.card, textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 72 }}>✓</div>
          <h2 style={{ color: '#1a1a2e', fontSize: 26 }}>Thank you!</h2>
          <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.7 }}>
            Your responses have been sent to the Texas A&M team.
            They'll use your input to make your conversation much more focused and valuable.
          </p>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>
            You can close this page.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <h1 style={S.logo}>⚡ AXIS</h1>
          <p style={S.tagline}>Texas A&M Interview Preparation</p>
        </div>

        <div style={S.card}>
          <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
            Thank you for making time to speak with the Texas A&M team. Before your 
            conversation, we used AI to research <strong>{companyName}</strong>. 
            We'd love your help making sure we got it right — and understanding 
            which topics interest you most.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? '#667eea' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {step === 1 && (
          <div style={S.card}>
            <h3 style={S.cardTitle}>📋 Here's What We Found About {companyName}</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Please review each point. Let us know if anything is off — that's 
              actually one of the most valuable parts of our conversation.
            </p>

            {facts.length === 0 && (
              <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                Loading research findings...
              </p>
            )}

            {facts.map(fact => (
              <div key={fact.id} style={S.factCard}>
                <p style={{ margin: '0 0 12px', color: '#1a1a2e', fontSize: 15, lineHeight: 1.6 }}>
                  {fact.text}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{
                      flex: 1, padding: '9px 12px', border: 'none', borderRadius: 8,
                      cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.15s',
                      background: fact.accurate === true ? '#22c55e' : '#f0fdf4',
                      color: fact.accurate === true ? 'white' : '#166534'
                    }}
                    onClick={() => toggleFact(fact.id, true)}
                  >
                    ✓ Accurate
                  </button>
                  <button
                    style={{
                      flex: 1, padding: '9px 12px', border: 'none', borderRadius: 8,
                      cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.15s',
                      background: fact.accurate === false ? '#ef4444' : '#fef2f2',
                      color: fact.accurate === false ? 'white' : '#991b1b'
                    }}
                    onClick={() => toggleFact(fact.id, false)}
                  >
                    ✗ Needs correction
                  </button>
                </div>
                {fact.accurate === false && (
                  <input
                    style={{ ...S.input, marginTop: 12, fontSize: 14 }}
                    placeholder="What's actually true? (optional but very helpful)"
                    value={fact.correction}
                    onChange={e => updateCorrection(fact.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            <button style={S.btn} onClick={() => setStep(2)}>
              Continue to Questions →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={S.card}>
            <h3 style={S.cardTitle}>💬 Questions We'd Love to Explore</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Select 1–3 topics that interest you most. We'll make sure to prioritize 
              these in our conversation.
            </p>

            {questions.map(q => (
              <div
                key={q.id}
                style={{
                  ...S.questionCard,
                  background: q.selected ? '#eff6ff' : 'white',
                  borderColor: q.selected ? '#3b82f6' : '#e5e7eb'
                }}
                onClick={() => toggleQuestion(q.id)}
              >
                <span style={{
                  ...S.checkbox,
                  background: q.selected ? '#3b82f6' : '#f3f4f6',
                  color: q.selected ? 'white' : '#9ca3af'
                }}>
                  {q.selected ? '✓' : ''}
                </span>
                <span style={{ color: '#1a1a2e', fontSize: 15, lineHeight: 1.6 }}>
                  {q.text}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 28, padding: 20, background: '#f8fafc', borderRadius: 14 }}>
              <label style={{ ...S.label, marginTop: 0, color: '#1a1a2e', fontSize: 15 }}>
                🎯 One more thing
              </label>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>
                What's something you wish interviewers understood about your industry 
                that they never think to ask?
              </p>
              <textarea
                style={{ ...S.textarea, height: 90 }}
                placeholder="Share anything you'd like us to know before we talk..."
                value={wildcard}
                onChange={e => setWildcard(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                style={{ ...S.btn, background: '#6b7280', flex: 1, marginTop: 0 }}
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                style={{ ...S.btn, flex: 2, marginTop: 0 }}
                onClick={submit}
              >
                Submit & Finish ✓
              </button>
            </div>
          </div>
        )}

        <p style={S.footer}>
          Texas A&M University • AXIS Interview Intelligence
        </p>
      </div>
    </div>
  );
}

// ============================================================
// APP ROUTER
// ============================================================
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/brief/:id" element={<Brief />} />
        <Route path="/i/:id" element={<IntervieweePage />} />
      </Routes>
    </Router>
  );
}
