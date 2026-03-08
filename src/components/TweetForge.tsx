import { useState, useRef } from "react";
import { Zap, Flame, BookOpen, BarChart3, ListOrdered, Anchor, HelpCircle, AlertTriangle, ArrowLeft, RefreshCw, ChevronRight, Check, Copy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ReactNode> = {
  "⚡": <Zap size={15} />,
  "🔥": <Flame size={15} />,
  "📖": <BookOpen size={15} />,
  "📊": <BarChart3 size={15} />,
  "📋": <ListOrdered size={15} />,
  "🪝": <Anchor size={15} />,
  "❓": <HelpCircle size={15} />,
  "😬": <AlertTriangle size={15} />,
};

const ICON_MAP_LG: Record<string, React.ReactNode> = {
  "⚡": <Zap size={22} />,
  "🔥": <Flame size={22} />,
  "📖": <BookOpen size={22} />,
  "📊": <BarChart3 size={22} />,
  "📋": <ListOrdered size={22} />,
  "🪝": <Anchor size={22} />,
  "❓": <HelpCircle size={22} />,
  "😬": <AlertTriangle size={22} />,
};

const FRAMEWORKS = [
  { id: "hook-value-cta", name: "Hook → Value → CTA", emoji: "⚡", color: "#F5A623", why: "The backbone of viral content. Grabs attention, delivers value, then drives action. Retweets are 20x more valuable than likes in X's algorithm.", bestFor: "Educational content, tips, insights", engagementTarget: "Retweets + Bookmarks", formula: "Bold opener → Specific insight or lesson → Clear call-to-action" },
  { id: "contrarian", name: "Hot Take / Contrarian", emoji: "🔥", color: "#E74C3C", why: "Challenges common beliefs. Triggers psychological tension — readers NEED to see if you can back it up. Drives replies (13.5x algorithm weight).", bestFor: "Building authority, thought leadership", engagementTarget: "Replies + Quote Tweets", formula: "[Common belief] is wrong. Here's what actually works: [your truth]" },
  { id: "storytime", name: "Storytime (Narrative)", emoji: "📖", color: "#9B59B6", why: "Vulnerability builds massive trust. 'When I was broke...' always outperforms 'Here's money advice.' High-arousal emotions spread faster.", bestFor: "Building connection, trust, follower loyalty", engagementTarget: "Likes + Replies", formula: "Moment in time → Struggle → Transformation → Lesson" },
  { id: "specific-data", name: "Specific Data / Results", emoji: "📊", color: "#2ECC71", why: "Precise numbers get 300% more engagement than vague claims. '12,847 followers in 63 days' feels real. Round numbers feel fabricated.", bestFor: "Credibility building, showing proof", engagementTarget: "Retweets + Profile Clicks", formula: "Exact number + Exact timeframe → The system → CTA" },
  { id: "listicle", name: "Listicle Thread", emoji: "📋", color: "#3498DB", why: "Lists get bookmarked — and bookmarks carry 10x algorithm weight. '10 things I wish I knew at 25' style content generates saves and shares.", bestFor: "Evergreen value, saves, shareability", engagementTarget: "Bookmarks + Retweets", formula: "Bold promise → Numbered insights (each self-contained) → Strong closer" },
  { id: "curiosity-gap", name: "Curiosity Gap", emoji: "🪝", color: "#1ABC9C", why: "Opens a loop the brain must close. 94% of threads fail because they don't hook readers in the first 3 seconds. This format stops the scroll.", bestFor: "Thread openers, growing impressions", engagementTarget: "Thread Clicks + Follows", formula: "Tease result → 'Here's how' / 'Thread 🧵' → Deliver in thread" },
  { id: "question", name: "Question / Poll", emoji: "❓", color: "#E67E22", why: "Questions generate replies (13.5x weight). Polls are algorithmically prioritized. Asking the right question triggers hundreds of responses from your niche.", bestFor: "Engagement spikes, reply farming", engagementTarget: "Replies + Poll Votes", formula: "Relatable setup → Thought-provoking question → Engage in replies" },
  { id: "failure", name: "Failure / Mistake Story", emoji: "😬", color: "#E91E8C", why: "Vulnerability is the most underused growth tool. When you share a real failure, people share it because they've felt the same. Trust compounds like interest.", bestFor: "Deep trust, follower loyalty, virality", engagementTarget: "Replies + Retweets", formula: "The mistake → The cost → What you'd do differently → The lesson" },
];

const NICHES = ["Business & Entrepreneurship","Personal Finance & Investing","Tech & AI","Fitness & Health","Marketing & Growth Hacking","Self-Improvement & Mindset","Career Advice","Productivity & Systems","Relationships & Dating","Crypto & Web3","Parenting","Food & Lifestyle","Education & Learning","Real Estate","Freelancing & Consulting"];
const TONES = [{ id: "bold", label: "Bold & Direct" },{ id: "educational", label: "Educational" },{ id: "witty", label: "Witty & Sharp" },{ id: "inspiring", label: "Inspiring" },{ id: "casual", label: "Conversational" },{ id: "controversial", label: "Controversial" }];
const FORMATS = [{ id: "single", label: "Single Tweet", desc: "Punchy standalone post" },{ id: "thread_hook", label: "Thread Hook", desc: "First tweet to start a thread" },{ id: "full_thread", label: "Full Thread (5–7 tweets)", desc: "Complete thread ready to post" }];
const ALG_STATS = [{ label: "Retweet", value: "×20" },{ label: "Reply", value: "×13.5" },{ label: "Bookmark", value: "×10" },{ label: "Like", value: "×1" }];

export default function TweetForge() {
  const [step, setStep] = useState("configure");
  const [framework, setFramework] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [tone, setTone] = useState("bold");
  const [format, setFormat] = useState("single");
  const [topic, setTopic] = useState("");
  const [tweets, setTweets] = useState<Array<{tweet: string; tip: string; engagementFocus: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("generator");
  const resultRef = useRef<HTMLDivElement>(null);

  const selectedFw = FRAMEWORKS.find(f => f.id === framework);

  async function generateTweets() {
    if (!framework || !niche || !topic.trim()) { setError("Please select a framework, niche, and enter a topic."); return; }
    setError(""); setLoading(true); setStep("generating");
    const fw = FRAMEWORKS.find(f => f.id === framework);
    const toneLabel = TONES.find(t => t.id === tone)?.label;
    const formatLabel = FORMATS.find(f => f.id === format)?.label;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-tweets', {
        body: {
          framework: { name: fw?.name, formula: fw?.formula, why: fw?.why, engagementTarget: fw?.engagementTarget },
          niche,
          topic,
          tone: toneLabel,
          format: formatLabel,
        },
      });

      if (fnError) throw new Error(fnError.message || "Generation failed");
      if (data?.error) throw new Error(data.error);

      setTweets(data.tweets);
      setStep("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e: any) {
      const msg = e?.message || "Generation failed. Please try again.";
      setError(msg);
      toast.error(msg);
      setStep("configure");
    } finally {
      setLoading(false);
    }
  }

  function copyTweet(text: string, idx: number) { navigator.clipboard.writeText(text); setCopied(idx); setTimeout(() => setCopied(null), 2000); }
  function reset() { setStep("configure"); setTweets([]); setTopic(""); }

  return (
    <div style={{ minHeight:"100vh", background:"#08090A", fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#F0EDE8", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .fw-card{cursor:pointer;transition:all 0.18s ease;border:1px solid #1E2025;background:#0D0E10;padding:14px 16px}
        .fw-card:hover{border-color:#2a2d34;background:#111315;transform:translateY(-1px)}
        .fw-card.sel{border-color:var(--c);background:#111315;box-shadow:0 0 24px color-mix(in srgb,var(--c) 12%,transparent)}
        .btn-main{background:#F5A623;color:#08090A;border:none;padding:14px 32px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:15px;cursor:pointer;transition:all 0.2s;letter-spacing:0.01em}
        .btn-main:hover:not(:disabled){background:#f7b84b;transform:translateY(-1px);box-shadow:0 8px 25px rgba(245,166,35,0.28)}
        .btn-main:disabled{opacity:0.45;cursor:not-allowed}
        .btn-ghost{background:transparent;color:#666;border:1px solid #222;padding:10px 20px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:6px}
        .btn-ghost:hover{border-color:#444;color:#bbb}
        .sel-wrap select{background:#0D0E10;border:1px solid #1E2025;color:#F0EDE8;padding:12px 16px;font-family:'DM Sans',sans-serif;font-size:14px;width:100%;outline:none;transition:border-color 0.2s;appearance:none;cursor:pointer}
        .sel-wrap select:focus{border-color:#F5A623}
        textarea.ti{background:#0D0E10;border:1px solid #1E2025;color:#F0EDE8;padding:14px 16px;font-family:'DM Mono',monospace;font-size:13px;width:100%;outline:none;resize:vertical;transition:border-color 0.2s;line-height:1.6}
        textarea.ti:focus{border-color:#F5A623}
        textarea.ti::placeholder{color:#333}
        .tone-chip{padding:8px 16px;border:1px solid #1E2025;background:#0D0E10;color:#666;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all 0.2s;font-weight:500}
        .tone-chip:hover{border-color:#333;color:#aaa}
        .tone-chip.sel{border-color:#F5A623;color:#F5A623;background:rgba(245,166,35,0.05)}
        .fmt-chip{padding:12px 14px;border:1px solid #1E2025;background:#0D0E10;color:#666;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all 0.2s;text-align:left;flex:1}
        .fmt-chip:hover{border-color:#2a2d34}
        .fmt-chip.sel{border-color:#F5A623;color:#F0EDE8}
        .tw-card{border:1px solid #1E2025;background:#0D0E10;padding:24px;animation:fadeUp 0.35s ease both;transition:border-color 0.2s}
        .tw-card:hover{border-color:#2a2d34}
        .cp-btn{background:transparent;border:1px solid #252830;color:#666;padding:6px 14px;font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;transition:all 0.2s;letter-spacing:0.05em;display:inline-flex;align-items:center;gap:5px}
        .cp-btn:hover{border-color:#F5A623;color:#F5A623}
        .cp-btn.ok{border-color:#2ECC71;color:#2ECC71}
        .tab-btn{background:transparent;border:none;color:#444;padding:10px 20px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;font-weight:500;border-bottom:2px solid transparent;transition:all 0.2s;letter-spacing:0.02em}
        .tab-btn.active{color:#F0EDE8;border-bottom-color:#F5A623}
        .tab-btn:hover:not(.active){color:#888}
        .stat-box{background:#0D0E10;border:1px solid #1A1C20;padding:18px 12px;text-align:center;flex:1}
        .info-card{border:1px solid #1A1C20;background:#0D0E10;padding:20px}
        .grid-bg{position:fixed;inset:0;background-image:linear-gradient(#1A1C2010 1px,transparent 1px),linear-gradient(90deg,#1A1C2010 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
        .glow{position:fixed;top:-200px;right:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(245,166,35,0.05) 0%,transparent 70%);pointer-events:none;z-index:0}
        @media(max-width:768px){
          .tf-header{flex-direction:column;height:auto!important;padding:10px 14px!important;gap:8px}
          .tf-header-left{justify-content:center}
          .tf-header-tabs{justify-content:center;width:100%}
          .tf-header-right{display:none}
          .tf-main{padding:20px 14px 60px!important}
          .tf-alg-bar{flex-direction:row;flex-wrap:wrap}
          .tf-alg-bar .stat-box{min-width:45%;flex:1 1 45%}
          .tf-config-grid{grid-template-columns:1fr!important}
          .tf-fw-grid{grid-template-columns:1fr!important}
          .tf-fmt-row{flex-direction:column!important}
          .tf-result-header{flex-direction:column!important;gap:14px!important;align-items:flex-start!important}
          .tf-result-btns{width:100%}
          .tf-result-btns .btn-main,.tf-result-btns .btn-ghost{flex:1;justify-content:center}
          .tf-after-grid{grid-template-columns:1fr!important}
          .tf-playbook-grid{grid-template-columns:1fr!important}
          .tf-schedule-grid{grid-template-columns:repeat(4,1fr)!important}
          .tf-time-grid{grid-template-columns:1fr!important}
          .tf-earn-grid{grid-template-columns:1fr!important}
          .tf-req-grid{grid-template-columns:1fr!important}
          .tf-rev-row{grid-template-columns:36px 1fr!important;grid-template-rows:auto auto}
          .tf-rev-meta{display:flex;gap:20px;grid-column:1/-1;padding-top:6px}
          .tf-sidebar{position:static!important}
          .tf-footer{flex-direction:column;gap:6px;text-align:center;padding:14px!important}
        }
      `}</style>

      <div className="grid-bg" />
      <div className="glow" />

      {/* HEADER */}
      <header className="tf-header" style={{ position:"relative",zIndex:10,borderBottom:"1px solid #1A1C20",background:"rgba(8,9,10,0.85)",backdropFilter:"blur(12px)",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56 }}>
        <div className="tf-header-left" style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:30,height:30,background:"#F5A623",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#08090A",fontFamily:"serif" }}>𝕏</div>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:"0.08em" }}>TWEETFORGE</span>
          <span style={{ background:"#111",color:"#444",padding:"2px 8px",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em" }}>BETA</span>
        </div>
        <div style={{ display:"flex",gap:0 }}>
          {["generator","playbook","monetize"].map(t => (
            <button key={t} className={`tab-btn ${activeTab===t?"active":""}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#2ECC71",animation:"pulse 2s ease infinite" }} />
          <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",letterSpacing:"0.06em" }}>RESEARCH-BACKED</span>
        </div>
      </header>

      <main style={{ position:"relative",zIndex:1,maxWidth:1100,margin:"0 auto",padding:"40px 28px 80px" }}>

        {/* ══ GENERATOR TAB ══════════════════════════════════════════ */}
        {activeTab === "generator" && (
          <div style={{ animation:"fadeUp 0.35s ease" }}>

            {/* Hero */}
            <div style={{ marginBottom:44 }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623",letterSpacing:"0.15em",marginBottom:10 }}>DATA-DRIVEN CONTENT ENGINE</div>
              <h1 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(46px,7vw,74px)",lineHeight:0.92,letterSpacing:"0.02em",marginBottom:14 }}>
                TWEETS THAT<br/>
                <span style={{ color:"#F5A623" }}>ACTUALLY GROW</span><br/>
                YOUR ACCOUNT
              </h1>
              <p style={{ color:"#555",fontSize:14,lineHeight:1.7,maxWidth:460 }}>
                Built on X's open-sourced algorithm data and frameworks from creators who grew 0 → 100K+. Every tweet engineered for the signals that matter most.
              </p>
            </div>

            {/* Algorithm bar */}
            <div style={{ display:"flex",gap:1,marginBottom:48,background:"#1A1C20" }}>
              {ALG_STATS.map(s => (
                <div key={s.label} className="stat-box">
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:"#F5A623",lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:12,fontWeight:600,color:"#F0EDE8",marginTop:4 }}>{s.label}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",marginTop:2 }}>algorithm weight</div>
                </div>
              ))}
            </div>

            {step !== "result" ? (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 330px",gap:24,alignItems:"start" }}>

                {/* LEFT */}
                <div style={{ display:"flex",flexDirection:"column",gap:32 }}>

                  {/* Step 1: Framework */}
                  <div>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
                      <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623" }}>01</span>
                      <h2 style={{ fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#888" }}>Choose Your Framework</h2>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                      {FRAMEWORKS.map(fw => (
                        <div key={fw.id} className={`fw-card ${framework===fw.id?"sel":""}`} style={{"--c":fw.color} as React.CSSProperties} onClick={() => setFramework(fw.id)}>
                          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                            <span style={{ color: framework===fw.id ? fw.color : "#777" }}>{ICON_MAP[fw.emoji]}</span>
                            <span style={{ fontSize:12,fontWeight:600,color:framework===fw.id?fw.color:"#777" }}>{fw.name}</span>
                          </div>
                          <div style={{ fontSize:11,color:"#333",lineHeight:1.4 }}>{fw.bestFor}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
                      <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623" }}>02</span>
                      <h2 style={{ fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#888" }}>Configure Your Voice</h2>
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                      <div>
                        <label style={{ fontSize:11,color:"#444",letterSpacing:"0.08em",display:"block",marginBottom:7 }}>YOUR NICHE</label>
                        <div className="sel-wrap" style={{ position:"relative" }}>
                          <select value={niche} onChange={e => setNiche(e.target.value)}>
                            <option value="">Select your niche...</option>
                            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                          <span style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:"#333",pointerEvents:"none" }}>▾</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11,color:"#444",letterSpacing:"0.08em",display:"block",marginBottom:7 }}>TONE</label>
                        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                          {TONES.map(t => <button key={t.id} className={`tone-chip ${tone===t.id?"sel":""}`} onClick={() => setTone(t.id)}>{t.label}</button>)}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11,color:"#444",letterSpacing:"0.08em",display:"block",marginBottom:7 }}>FORMAT</label>
                        <div style={{ display:"flex",gap:8 }}>
                          {FORMATS.map(f => (
                            <button key={f.id} className={`fmt-chip ${format===f.id?"sel":""}`} onClick={() => setFormat(f.id)}>
                              <div style={{ fontWeight:600,marginBottom:2,fontSize:12 }}>{f.label}</div>
                              <div style={{ color:"#444",fontSize:10 }}>{f.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
                      <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623" }}>03</span>
                      <h2 style={{ fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#888" }}>Your Topic / Idea</h2>
                    </div>
                    <textarea className="ti" rows={4} placeholder={"e.g. \"I wasted 6 months posting daily with zero growth until I realized most creators make this one mistake...\"\n\nor just: \"morning routines are overrated\""} value={topic} onChange={e => setTopic(e.target.value)} />
                    <div style={{ fontSize:11,color:"#2a2d34",marginTop:6 }}>Raw thoughts welcome. The more specific, the better the output.</div>
                  </div>

                  {error && <div style={{ background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.25)",padding:"12px 16px",fontSize:13,color:"#E74C3C" }}>{error}</div>}
                  <button className="btn-main" onClick={generateTweets} disabled={loading} style={{ alignSelf:"flex-start",display:"inline-flex",alignItems:"center",gap:8 }}>
                    {loading ? "GENERATING..." : <>GENERATE TWEETS <ArrowRight size={16} /></>}
                  </button>
                </div>

                {/* RIGHT: sidebar */}
                <div style={{ position:"sticky",top:24,display:"flex",flexDirection:"column",gap:12 }}>
                  {selectedFw ? (
                    <div style={{ border:`1px solid ${selectedFw.color}22`,background:"#0D0E10",padding:22,animation:"fadeUp 0.25s ease" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                        <span style={{ color: selectedFw.color }}>{ICON_MAP_LG[selectedFw.emoji]}</span>
                        <div>
                          <div style={{ fontWeight:700,fontSize:13,color:selectedFw.color }}>{selectedFw.name}</div>
                          <div style={{ fontSize:11,color:"#333",marginTop:1 }}>Selected Framework</div>
                        </div>
                      </div>
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:10,color:"#444",letterSpacing:"0.08em",marginBottom:6 }}>WHY IT WORKS</div>
                        <div style={{ fontSize:12,color:"#666",lineHeight:1.7 }}>{selectedFw.why}</div>
                      </div>
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:10,color:"#444",letterSpacing:"0.08em",marginBottom:6 }}>THE FORMULA</div>
                        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:selectedFw.color,lineHeight:1.7,background:`${selectedFw.color}0D`,padding:10 }}>{selectedFw.formula}</div>
                      </div>
                      <div style={{ display:"flex",justifyContent:"space-between",borderTop:"1px solid #1A1C20",paddingTop:14 }}>
                        <div>
                          <div style={{ fontSize:10,color:"#2a2d34",letterSpacing:"0.06em",marginBottom:3 }}>TARGET</div>
                          <div style={{ fontSize:12,color:"#F0EDE8",fontWeight:600 }}>{selectedFw.engagementTarget}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ border:"1px solid #1A1C20",background:"#0D0E10",padding:28,textAlign:"center" }}>
                      <div style={{ marginBottom:10,opacity:0.3 }}><ArrowLeft size={28} /></div>
                      <div style={{ fontSize:12,color:"#333",lineHeight:1.6 }}>Pick a framework to see how it works</div>
                    </div>
                  )}

                  <div style={{ border:"1px solid #1A1C20",background:"#0D0E10",padding:18 }}>
                    <div style={{ fontSize:10,color:"#444",letterSpacing:"0.08em",marginBottom:10 }}>PRO TIPS</div>
                    {["Links kill reach 30–50%. Put them in first reply.","Post Tue–Thu, 9AM–12PM in your timezone.","Engage with replies for 60 min after posting.","Repost your best tweet again 3 days later."].map((tip,i) => (
                      <div key={i} style={{ display:"flex",gap:8,marginBottom:8,fontSize:11,color:"#444",lineHeight:1.5 }}>
                        <ChevronRight size={12} style={{ color:"#F5A623",flexShrink:0,marginTop:2 }} /><span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* RESULTS */
              <div ref={resultRef} style={{ animation:"fadeUp 0.35s ease" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28 }}>
                  <div>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623",letterSpacing:"0.1em",marginBottom:5,display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ color: selectedFw?.color }}>{selectedFw && ICON_MAP[selectedFw.emoji]}</span> {selectedFw?.name} · {niche}
                    </div>
                    <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:"0.05em" }}>{tweets.length} TWEETS GENERATED</h2>
                  </div>
                  <div style={{ display:"flex",gap:10 }}>
                    <button className="btn-ghost" onClick={generateTweets}><RefreshCw size={14} /> Regenerate</button>
                    <button className="btn-main" onClick={reset} style={{ display:"inline-flex",alignItems:"center",gap:6 }}><ArrowLeft size={14} /> New Tweet</button>
                  </div>
                </div>

                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  {tweets.map((t, i) => {
                    const isThread = format === "full_thread";
                    const parts = isThread ? t.tweet.split("|||").map(s => s.trim()).filter(Boolean) : [t.tweet];
                    const engColor = t.engagementFocus==="Retweets"?"#E74C3C":t.engagementFocus==="Replies"?"#3498DB":t.engagementFocus==="Bookmarks"?"#9B59B6":"#2ECC71";
                    return (
                      <div key={i} className="tw-card" style={{ animationDelay:`${i*0.08}s` }}>
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#2a2d34" }}>VARIANT {i+1}</span>
                            <span style={{ background:`${engColor}12`,color:engColor,border:`1px solid ${engColor}30`,padding:"2px 10px",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.05em" }}>↑ {t.engagementFocus}</span>
                          </div>
                          <button className={`cp-btn ${copied===i?"ok":""}`} onClick={() => copyTweet(t.tweet, i)}>
                            {copied===i ? <><Check size={12} /> COPIED</> : <><Copy size={12} /> COPY</>}
                          </button>
                        </div>

                        {isThread ? (
                          <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
                            {parts.map((part, pi) => (
                              <div key={pi} style={{ display:"flex",gap:12 }}>
                                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0 }}>
                                  <div style={{ width:30,height:30,borderRadius:"50%",background:"#1A1C20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#444",fontFamily:"'DM Mono',monospace" }}>{pi+1}</div>
                                  {pi<parts.length-1 && <div style={{ width:1,flex:1,background:"#1A1C20",minHeight:12 }} />}
                                </div>
                                <div style={{ paddingBottom:pi<parts.length-1?14:0,flex:1 }}>
                                  <div style={{ fontSize:15,color:"#E8E5DF",lineHeight:1.75,whiteSpace:"pre-wrap" }}>{part}</div>
                                  {pi===0 && <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#2a2d34",marginTop:4 }}>{part.length}/280</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize:16,color:"#E8E5DF",lineHeight:1.8,whiteSpace:"pre-wrap",marginBottom:10 }}>{t.tweet}</div>
                            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#2a2d34" }}>{t.tweet.length}/280 chars</div>
                          </div>
                        )}

                        <div style={{ marginTop:14,borderTop:"1px solid #1A1C20",paddingTop:14 }}>
                          <div style={{ fontSize:10,color:"#444",letterSpacing:"0.06em",marginBottom:5 }}>WHY THIS WORKS</div>
                          <div style={{ fontSize:12,color:"#555",lineHeight:1.6,display:"flex",gap:6 }}><ChevronRight size={12} style={{ flexShrink:0,marginTop:3 }} /> {t.tip}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop:28,border:"1px solid #1A1C20",background:"#0D0E10",padding:22 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623",letterSpacing:"0.1em",marginBottom:14 }}>AFTER YOU POST — DO THIS</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    {[
                      { time:"0–5 min", action:"Engage with 5 accounts in your niche right before posting to warm up the algorithm." },
                      { time:"0–30 min", action:"Reply to every comment immediately. Replying to your own tweet adds massive visibility." },
                      { time:"1–2 hrs", action:"Put your link in the first reply (not the tweet) to avoid the 30–50% reach penalty." },
                      { time:"2–3 days", action:"Repost the same tweet at a different time. Most followers missed it the first time." },
                    ].map((s,i) => (
                      <div key={i} style={{ display:"flex",gap:10 }}>
                        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#F5A623",whiteSpace:"nowrap",paddingTop:1 }}>{s.time}</div>
                        <div style={{ fontSize:12,color:"#555",lineHeight:1.6 }}>{s.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div style={{ position:"fixed",inset:0,background:"rgba(8,9,10,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)" }}>
                <div style={{ width:38,height:38,border:"2px solid #1A1C20",borderTopColor:"#F5A623",borderRadius:"50%",animation:"spin 0.75s linear infinite",marginBottom:22 }} />
                <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:"0.1em",marginBottom:6 }}>ENGINEERING YOUR TWEET</div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:"#333" }}>Applying {selectedFw?.name} framework...</div>
              </div>
            )}
          </div>
        )}

        {/* ══ PLAYBOOK TAB ══════════════════════════════════════════ */}
        {activeTab === "playbook" && (
          <div style={{ animation:"fadeUp 0.35s ease" }}>
            <div style={{ marginBottom:40 }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623",letterSpacing:"0.15em",marginBottom:10 }}>VERIFIED GROWTH SYSTEMS</div>
              <h1 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(40px,6vw,64px)",letterSpacing:"0.02em",marginBottom:10 }}>THE GROWTH PLAYBOOK</h1>
              <p style={{ color:"#444",fontSize:13,maxWidth:500 }}>Every strategy here is backed by X's open-source algorithm data, platform analytics, or verified creator case studies.</p>
            </div>

            <section style={{ marginBottom:44 }}>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:"0.05em",marginBottom:3,color:"#F5A623" }}>THE ALGORITHM — DECODED</h2>
              <div style={{ width:36,height:2,background:"#F5A623",marginBottom:20 }} />
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[
                  { title:"Retweet = 20 Likes", detail:"X's open-sourced code confirmed: one retweet is worth 20 likes algorithmically. Design every tweet to be shareable first." },
                  { title:"First 2 Hours = Everything", detail:"The algorithm runs a micro-test on your content. Strong early engagement gets it pushed to For You. Weak early = it dies." },
                  { title:"Premium = 2–4× Boost", detail:"X Premium gives 2–4× more reach. Replies from Premium users appear at the top of threads. It's now near-required for serious growth." },
                  { title:"Links = 30–50% Penalty", detail:"X penalizes posts that send users off-platform. Always put your link in the first reply, never the main tweet." },
                  { title:"Small Account Boost", detail:"New: accounts with 500 engaged followers can outperform 50,000 disengaged ones. Quality engagement beats size." },
                  { title:"Engagement Rate > Volume", detail:"100 engagements on 1,000 impressions (10%) beats 5,000 engagements on 1M impressions (0.5%). Rate is what triggers the boost." },
                ].map((item,i) => (
                  <div key={i} className="info-card">
                    <div style={{ fontWeight:700,fontSize:13,color:"#F0EDE8",marginBottom:8 }}>{item.title}</div>
                    <div style={{ fontSize:12,color:"#555",lineHeight:1.7 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom:44 }}>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:"0.05em",marginBottom:3,color:"#F5A623" }}>PROVEN HOOK FORMULAS</h2>
              <div style={{ width:36,height:2,background:"#F5A623",marginBottom:10 }} />
              <p style={{ fontSize:12,color:"#444",marginBottom:18,maxWidth:520 }}>94% of threads fail because the first line doesn't hook. These formulas come from analyzing thousands of viral posts.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {[
                  { hook:"I [achieved X result] in [Y days] without [Z]. Here's the exact system:", why:"Specificity + curiosity gap. Precise numbers get 300% more engagement than vague claims." },
                  { hook:"[Common belief everyone holds] is wrong. Here's what actually works:", why:"Contrarian tension. Readers need to see if you can back it up. Drives replies massively." },
                  { hook:"Nobody talks about this, but [uncomfortable truth in your niche]:", why:"Insider exclusivity trigger. Creates FOMO and signals unique perspective." },
                  { hook:"When I was [relatable struggle], I never thought I'd [transformation]. Here's what changed:", why:"Vulnerability + transformation arc. High-arousal emotions spread faster." },
                  { hook:"[Specific number] things I wish I knew before [relatable milestone]:", why:"List promise. Gets bookmarked heavily. Bookmarks = 10x algorithm weight." },
                  { hook:"I analyzed [specific number] [things in your niche]. Here's what I found:", why:"Research authority + curiosity. Signals data-backed content, not just opinion." },
                  { hook:"Stop [common behavior in your niche]. Do this instead:", why:"Pattern interrupt + contrarian. Short, punchy, commands attention immediately." },
                  { hook:"Unpopular opinion: [belief most people in your niche avoid saying]", why:"Triggers both agreement shares and debate replies — the highest-value engagement combo." },
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex",gap:14,border:"1px solid #1A1C20",background:"#0D0E10",padding:18 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#2a2d34",flexShrink:0,paddingTop:2 }}>0{i+1}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:"#F5A623",marginBottom:6,lineHeight:1.5 }}>"{item.hook}"</div>
                      <div style={{ fontSize:12,color:"#444",lineHeight:1.6,display:"flex",gap:6 }}><ChevronRight size={12} style={{ flexShrink:0,marginTop:3 }} /> {item.why}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:"0.05em",marginBottom:3,color:"#F5A623" }}>OPTIMAL POSTING SCHEDULE</h2>
              <div style={{ width:36,height:2,background:"#F5A623",marginBottom:20 }} />
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:20 }}>
                {["MON","TUE","WED","THU","FRI","SAT","SUN"].map((day,i) => {
                  const peak=[1,2,3].includes(i), good=[0,4].includes(i);
                  return (
                    <div key={day} style={{ border:`1px solid ${peak?"#F5A623":good?"#2ECC7144":"#1A1C20"}`,background:peak?"rgba(245,166,35,0.04)":"#0D0E10",padding:"14px 6px",textAlign:"center" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:peak?"#F5A623":good?"#2ECC71":"#2a2d34",marginBottom:6 }}>{day}</div>
                      <div style={{ fontSize:9,color:peak?"#888":"#2a2d34" }}>{peak?"🔥 Best":good?"✓ Good":"Slow"}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
                {[{time:"9AM–12PM",note:"Algorithm rewards early velocity. Maximum audience online."},{time:"1PM–3PM",note:"Lunch browsing peak. Less competitive than morning."},{time:"7PM–9PM",note:"Evening engagement. Strong for consumer-focused niches."}].map((t,i) => (
                  <div key={i} className="info-card">
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:i===0?"#F5A623":"#F0EDE8",marginBottom:6 }}>{t.time}</div>
                    <div style={{ fontSize:12,color:"#444",lineHeight:1.5 }}>{t.note}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ══ MONETIZE TAB ══════════════════════════════════════════ */}
        {activeTab === "monetize" && (
          <div style={{ animation:"fadeUp 0.35s ease" }}>
            <div style={{ marginBottom:40 }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#F5A623",letterSpacing:"0.15em",marginBottom:10 }}>REAL NUMBERS, NO HYPE</div>
              <h1 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(40px,6vw,64px)",letterSpacing:"0.02em",marginBottom:10 }}>HOW TO GET PAID</h1>
              <p style={{ color:"#444",fontSize:13,maxWidth:500 }}>X monetization data sourced from platform documentation, verified creator reports, and researcher analysis.</p>
            </div>

            <section style={{ marginBottom:44 }}>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:"0.05em",marginBottom:3,color:"#F5A623" }}>WHAT CREATORS ACTUALLY EARN</h2>
              <div style={{ width:36,height:2,background:"#F5A623",marginBottom:20 }} />
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,background:"#1A1C20" }}>
                {[
                  { tier:"Small Creator",followers:"1K–10K",monthly:"$10–$100/mo",focus:"Tips + Affiliate links. Start building the habit now. Monetize as you grow." },
                  { tier:"Mid-Tier",followers:"10K–100K",monthly:"$300–$2,000/mo",focus:"Brand deals (~$100/10K impressions), Subscriptions, Affiliate + Rev Share." },
                  { tier:"Top Creator",followers:"100K+",monthly:"$10,000+/mo",focus:"Ad Revenue Sharing + Subscriptions + Brand deals + Digital products + Consulting." },
                ].map((t,i) => (
                  <div key={i} style={{ background:"#0D0E10",padding:24 }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#333",marginBottom:8 }}>{t.tier.toUpperCase()}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:38,color:"#F5A623",marginBottom:3 }}>{t.monthly}</div>
                    <div style={{ fontSize:12,color:"#666",marginBottom:12 }}>{t.followers} followers</div>
                    <div style={{ fontSize:12,color:"#444",lineHeight:1.7 }}>{t.focus}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom:44 }}>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:"0.05em",marginBottom:3,color:"#F5A623" }}>AD REVENUE SHARING — REQUIREMENTS</h2>
              <div style={{ width:36,height:2,background:"#F5A623",marginBottom:20 }} />
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
                {[
                  { req:"X Premium Subscription", detail:"Must be on Premium or Premium+ plan. Basic plan doesn't qualify." },
                  { req:"500+ Verified Followers", detail:"Followers with blue/gold badges. Premium users count as verified." },
                  { req:"5M+ Organic Impressions", detail:"In the past 3 months (rolling). Paid impressions don't count." },
                  { req:"Stripe-Supported Country", detail:"Must be in an eligible country. Minimum payout: $10." },
                ].map((r,i) => (
                  <div key={i} className="info-card" style={{ display:"flex",gap:14 }}>
                    <Check size={14} style={{ color:"#2ECC71",flexShrink:0,marginTop:2 }} />
                    <div>
                      <div style={{ fontWeight:600,fontSize:13,color:"#F0EDE8",marginBottom:5 }}>{r.req}</div>
                      <div style={{ fontSize:12,color:"#444",lineHeight:1.5 }}>{r.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ border:"1px solid rgba(245,166,35,0.18)",background:"rgba(245,166,35,0.03)",padding:18 }}>
                <div style={{ fontSize:13,color:"#F5A623",fontWeight:600,marginBottom:5 }}>The Real Reality of Ad Revenue</div>
                <div style={{ fontSize:13,color:"#666",lineHeight:1.7 }}>X pays ~$85 per million impressions from Premium users. A creator with 10K engaged Premium fans can out-earn someone with 200K casual followers. It's not about raw numbers — it's about sparking conversations Premium users care about enough to reply to. Replies from Premium users carry the highest monetization weight.</div>
              </div>
            </section>

            <section>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:"0.05em",marginBottom:3,color:"#F5A623" }}>5 REVENUE STREAMS — LAYERED BY STAGE</h2>
              <div style={{ width:36,height:2,background:"#F5A623",marginBottom:20 }} />
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {[
                  { rank:1,stream:"Affiliate Marketing",when:"Day 1 — no requirements",potential:"3–30% per sale",note:"Fastest path to income for small accounts. Find products your niche already buys." },
                  { rank:2,stream:"Digital Products",when:"Any size",potential:"100% margin, unlimited scale",note:"Courses, templates, ebooks, consulting. Highest long-term ceiling of all streams." },
                  { rank:3,stream:"Brand Sponsorships",when:"~10K followers",potential:"~$100 / 10K impressions",note:"Rates spike with engagement rate. 1K truly engaged followers can beat 10K passive." },
                  { rank:4,stream:"Creator Subscriptions",when:"Consistent content + clean account",potential:"$3–$9/mo per subscriber",note:"Most predictable income. 800 subs at $5 = $4K/month recurring." },
                  { rank:5,stream:"Ad Revenue Sharing",when:"5M impressions / 3 months",potential:"~$85 / 1M impressions",note:"Baseline passive income. Hard to reach alone but compounds over time." },
                ].map(s => (
                  <div key={s.rank} style={{ display:"grid",gridTemplateColumns:"36px 1fr 150px 160px",gap:16,border:"1px solid #1A1C20",background:"#0D0E10",padding:"16px 20px",alignItems:"center" }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:"#1A1C20" }}>{s.rank}</div>
                    <div>
                      <div style={{ fontWeight:600,fontSize:13,color:"#F0EDE8",marginBottom:4 }}>{s.stream}</div>
                      <div style={{ fontSize:12,color:"#444",lineHeight:1.5 }}>{s.note}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10,color:"#2a2d34",letterSpacing:"0.06em",marginBottom:3 }}>WHEN</div>
                      <div style={{ fontSize:11,color:"#666" }}>{s.when}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10,color:"#2a2d34",letterSpacing:"0.06em",marginBottom:3 }}>POTENTIAL</div>
                      <div style={{ fontSize:12,color:"#F5A623",fontWeight:600 }}>{s.potential}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer style={{ position:"relative",zIndex:1,borderTop:"1px solid #1A1C20",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(8,9,10,0.8)" }}>
        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#1E2025" }}>TWEETFORGE — BUILT ON X OPEN-SOURCE ALGORITHM DATA + VERIFIED CREATOR RESEARCH</span>
        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#1E2025" }}>2026</span>
      </footer>
    </div>
  );
}
