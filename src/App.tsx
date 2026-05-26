import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchFeed, initUser, likeVideo, fetchComments, addComment,
  uploadVideo, fetchUserVideos, deleteVideo,
  VideoMeta, Comment, formatCount, timeAgo, getStreamUrl,
} from "./api";
import { useUserStore } from "./store";
import { VideoPlayer } from "./components/VideoPlayer";
import {
  PlusIcon, UserIcon, HeartIcon, HeartFillIcon, ChatIcon,
  ShareIcon, UpIcon, DownIcon, XIcon, SendIcon, MusicIcon,
  BackIcon, CopyIcon, CheckIcon, TrashIcon, GridIcon,
} from "./components/Icons";
import { glass, actionBtn, navBtn, overlay, modal, sheet, input } from "./styles";

type View = "feed" | "upload" | "comments" | "share" | "profile";

export default function App() {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user, setUser } = useUserStore();
  const [view, setView] = useState<View>("feed");
  const [profId, setProfId] = useState("");
  const [profVids, setProfVids] = useState<VideoMeta[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const isWide = useIsWide();

  useEffect(() => {
    (async () => {
      try {
        const u = await initUser(); setUser(u);
        const d = await fetchFeed(10, 0); setVideos(d.videos); setHasMore(d.hasMore);
      } catch (e) { console.error(e); }
      setReady(true);
    })();
  }, [setUser]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (view !== "feed") return;
      if (e.key === "ArrowUp") { e.preventDefault(); go(idx - 1); }
      if (e.key === "ArrowDown") { e.preventDefault(); go(idx + 1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(videos.length - 1, i));
    setIdx(n);
    feedRef.current?.scrollTo({ top: n * window.innerHeight, behavior: "smooth" });
  }, [videos.length]);

  const onScroll = useCallback(() => {
    const el = feedRef.current; if (!el) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    setIdx(i);
    if (i >= videos.length - 2 && hasMore) {
      fetchFeed(10, videos.length).then(d => {
        setVideos(p => [...p, ...d.videos.filter(v => !p.some(x => x.id === v.id))]);
        setHasMore(d.hasMore);
      });
    }
  }, [videos, hasMore]);

  useEffect(() => {
    const v = videos[idx];
    if (v) { document.title = `${v.title} — Loope`; window.history.replaceState(null, "", `/${v.slug}`); }
  }, [idx, videos]);

  const doLike = useCallback(async (slug: string) => {
    const r = await likeVideo(slug);
    setVideos(p => p.map(v => v.slug === slug ? { ...v, is_liked: r.liked, likes: r.likes } : v));
  }, []);

  const onUploaded = useCallback((v: VideoMeta) => {
    setVideos(p => [v, ...p]); setIdx(0); setView("feed");
    setTimeout(() => feedRef.current?.scrollTo({ top: 0 }), 50);
  }, []);

  const openProfile = useCallback((uid: string) => {
    setProfId(uid); setView("profile");
    fetchUserVideos(uid).then(setProfVids).catch(() => {});
  }, []);

  const doDelete = useCallback(async (slug: string) => {
    await deleteVideo(slug);
    setVideos(p => p.filter(v => v.slug !== slug));
    setProfVids(p => p.filter(v => v.slug !== slug));
  }, []);

  const cur = videos[idx];

  /* loading */
  if (!ready) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f2f7" }}>
      <div style={{ width: 28, height: 28, border: "2.5px solid #e5e5ea", borderTopColor: "#8e8e93", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#f2f2f7" }}>
      {/* ── Top: two buttons centered ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "center", paddingTop: 14, gap: 8, pointerEvents: "none" }}>
        <button onClick={() => setView("upload")} style={{ ...navBtn, pointerEvents: "auto" }}><PlusIcon size={20} /></button>
        <button onClick={() => openProfile(user?.id ?? "")} style={{ ...navBtn, pointerEvents: "auto" }}><UserIcon size={18} /></button>
      </div>

      {/* ── Feed ── */}
      {videos.length === 0 ? (
        <div style={{ height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, ...glass, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlusIcon size={28} style={{ color: "#8e8e93" }} />
          </div>
          <p style={{ color: "#8e8e93", fontSize: 14 }}>No videos yet</p>
          <button onClick={() => setView("upload")} style={{ padding: "10px 24px", borderRadius: 12, ...glass, fontSize: 14, fontWeight: 500, color: "#1c1c1e" }}>Upload</button>
        </div>
      ) : (
        <div ref={feedRef} onScroll={onScroll} style={{ height: "100dvh", overflowY: "scroll", scrollSnapType: "y mandatory", scrollbarWidth: "none" }}>
          {videos.map((v, i) => (
            <div key={v.id} style={{ height: "100dvh", scrollSnapAlign: "start", scrollSnapStop: "always", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
              <div style={{ position: "relative", width: isWide ? "min(390px, 56.25vh)" : "100%", height: "100%", overflow: "hidden" }}>
                {/* edge glow on wide */}
                {isWide && <>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)", zIndex: 5, pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 1, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)", zIndex: 5, pointerEvents: "none" }} />
                </>}

                <VideoPlayer slug={v.slug} fileType={v.file_type} hasAudio={!!v.audio_title} isActive={idx === i} />

                {/* audio badge */}
                {v.audio_title && (
                  <div style={{ position: "absolute", top: 56, right: 10, zIndex: 10, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: 16, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                    <MusicIcon size={11} style={{ color: "rgba(255,255,255,0.8)" }} />
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.audio_title}</span>
                  </div>
                )}

                {/* bottom info */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 14px 76px", pointerEvents: "none", background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }}>
                  <p style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{v.title}</p>
                  {v.description && <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.description}</p>}
                  <button onClick={() => openProfile(v.user_id)} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, color: "rgba(255,255,255,0.4)", fontSize: 11, background: "none", border: "none", cursor: "pointer", pointerEvents: "auto" }}>
                    <UserIcon size={10} style={{ color: "rgba(255,255,255,0.4)" }} /> {v.user_nickname} · {timeAgo(v.created_at)}
                  </button>
                </div>

                {/* right actions */}
                <div style={{ position: "absolute", right: 10, bottom: 84, zIndex: 20, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                  <Btn icon={v.is_liked ? <HeartFillIcon size={20} style={{ color: "#ff6b81" }} /> : <HeartIcon size={20} style={{ color: "#fff" }} />} label={formatCount(v.likes)} onClick={() => doLike(v.slug)} />
                  <Btn icon={<ChatIcon size={20} style={{ color: "#fff" }} />} label={formatCount(Number(v.comment_count))} onClick={() => setView("comments")} />
                  <Btn icon={<ShareIcon size={20} style={{ color: "#fff" }} />} label="" onClick={() => setView("share")} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop arrows ── */}
      {isWide && videos.length > 0 && (
        <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => go(idx - 1)} disabled={idx === 0} style={{ ...navBtn, opacity: idx === 0 ? 0.3 : 1 }}><UpIcon size={20} /></button>
          <button onClick={() => go(idx + 1)} disabled={idx >= videos.length - 1} style={{ ...navBtn, opacity: idx >= videos.length - 1 ? 0.3 : 1 }}><DownIcon size={20} /></button>
        </div>
      )}

      {/* ── Modals ── */}
      {view === "upload" && <UploadSheet onClose={() => setView("feed")} onDone={onUploaded} />}
      {view === "comments" && cur && <CommentsSheet slug={cur.slug} onClose={() => setView("feed")} />}
      {view === "share" && cur && <ShareSheet slug={cur.slug} title={cur.title} onClose={() => setView("feed")} />}
      {view === "profile" && <ProfileModal videos={profVids} isOwn={profId === user?.id} nickname={profId === user?.id ? (user?.nickname ?? "") : (profVids[0]?.user_nickname ?? "Anonymous")} onClose={() => setView("feed")} onDelete={doDelete} />}
    </div>
  );
}

/* ── Small action btn on video ── */
function Btn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
      <div style={actionBtn}>{icon}</div>
      {label && <span style={{ color: "#fff", fontSize: 10, fontWeight: 500 }}>{label}</span>}
    </button>
  );
}

/* ── Upload ── */
function UploadSheet({ onClose, onDone }: { onClose: () => void; onDone: (v: VideoMeta) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [prog, setProg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fRef = useRef<HTMLInputElement>(null);
  const aRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    if (!title && list[0]) setTitle(list[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
  };

  const submit = async () => {
    if (!files.length || !title.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const v = await uploadVideo(files, title.trim(), desc.trim(), audio ?? undefined, setProg);
      onDone(v);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
      setBusy(false); setProg(0);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, animation: "fadeIn 0.2s" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 14px" }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Upload</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}><XIcon size={14} style={{ color: "#8e8e93" }} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {files.length === 0 ? (
            <div onClick={() => fRef.current?.click()} style={{ border: "2px dashed rgba(0,0,0,0.06)", borderRadius: 14, padding: "36px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, ...glass, display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon size={22} style={{ color: "#8e8e93" }} /></div>
              <p style={{ color: "#8e8e93", fontSize: 13 }}>Video or images, max 200MB</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {files.map((f, i) => (
                <div key={i} style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: "#eee" }}>
                  {f.type.startsWith("video/") ? <video src={URL.createObjectURL(f)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /> : <img src={URL.createObjectURL(f)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />}
                </div>
              ))}
              <button onClick={() => { setFiles([]); fRef.current?.click(); }} style={{ width: 64, height: 64, borderRadius: 10, border: "1px dashed rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon size={16} style={{ color: "#ccc" }} /></button>
            </div>
          )}
          <input ref={fRef} type="file" accept="video/*,image/*" multiple hidden onChange={pick} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => aRef.current?.click()} style={{ ...glass, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666" }}>
              <MusicIcon size={14} style={{ color: "#8e8e93" }} /> {audio ? audio.name.slice(0, 18) : "Add audio"}
            </button>
            {audio && <button onClick={() => setAudio(null)}><XIcon size={12} style={{ color: "#ccc" }} /></button>}
          </div>
          <input ref={aRef} type="file" accept="audio/*" hidden onChange={e => e.target.files?.[0] && setAudio(e.target.files[0])} />

          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" maxLength={200} style={input} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" maxLength={1000} rows={2} style={{ ...input, resize: "none" }} />
          {err && <p style={{ color: "#ff3b30", fontSize: 12 }}>{err}</p>}
        </div>

        <div style={{ padding: "10px 18px 18px" }}>
          {busy ? (
            <div>
              <div style={{ height: 3, background: "rgba(0,0,0,0.04)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${prog}%`, background: "#8e8e93", borderRadius: 2, transition: "width 0.15s" }} />
              </div>
              <p style={{ textAlign: "center", color: "#8e8e93", fontSize: 12, marginTop: 6 }}>{prog}%</p>
            </div>
          ) : (
            <button onClick={submit} disabled={!files.length || !title.trim()} style={{ width: "100%", padding: "13px", borderRadius: 12, ...glass, fontWeight: 600, fontSize: 14, color: "#1c1c1e", opacity: !files.length || !title.trim() ? 0.35 : 1 }}>Publish</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Comments ── */
function CommentsSheet({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => { fetchComments(slug).then(setComments).catch(() => {}); }, [slug]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { const c = await addComment(slug, text.trim()); setComments(p => [c, ...p]); setText(""); } catch {}
    setSending(false);
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.15)" }} onClick={onClose} />
      <div style={{ ...sheet, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{comments.length} comments</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}><XIcon size={13} style={{ color: "#8e8e93" }} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
          {comments.length === 0 ? <p style={{ textAlign: "center", color: "#c7c7cc", fontSize: 13, padding: "32px 0" }}>No comments yet</p> :
            comments.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `hsl(${(c.user_nickname.charCodeAt(10) || 0) * 47 % 360}, 40%, 72%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 11, fontWeight: 600 }}>
                  {c.user_nickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#3a3a3c" }}>{c.user_nickname}</span>
                    <span style={{ fontSize: 10, color: "#c7c7cc" }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#636366", marginTop: 2, lineHeight: 1.4 }}>{c.text}</p>
                </div>
              </div>
            ))
          }
        </div>

        <div style={{ padding: "8px 14px 16px", borderTop: "1px solid rgba(0,0,0,0.04)", display: "flex", gap: 6 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Comment..." maxLength={500} onKeyDown={e => e.key === "Enter" && send()} style={{ ...input, flex: 1 }} />
          <button onClick={send} disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: 10, ...glass, display: "flex", alignItems: "center", justifyContent: "center", opacity: text.trim() ? 1 : 0.35 }}>
            <SendIcon size={16} style={{ color: "#1c1c1e" }} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Share ── */
function ShareSheet({ slug, title, onClose }: { slug: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/${slug}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.15)" }} onClick={onClose} />
      <div style={{ ...sheet, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Share</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}><XIcon size={13} style={{ color: "#8e8e93" }} /></button>
        </div>
        <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: "#8e8e93", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          <div style={{ ...glass, borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 12, color: "#636366", fontFamily: "monospace", wordBreak: "break-all" }}>{url}</span>
          </div>
          <button onClick={copy} style={{ width: "100%", padding: "12px", borderRadius: 12, ...glass, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600, fontSize: 13, color: copied ? "#34c759" : "#1c1c1e" }}>
            {copied ? <><CheckIcon size={14} /> Copied</> : <><CopyIcon size={14} /> Copy link</>}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Profile ── */
function ProfileModal({ videos, isOwn, nickname, onClose, onDelete }: { videos: VideoMeta[]; isOwn: boolean; nickname: string; onClose: () => void; onDelete: (s: string) => void }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 460, animation: "fadeIn 0.2s" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 14px" }}>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}><BackIcon size={14} style={{ color: "#8e8e93" }} /></button>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 15 }}>{nickname}</p>
            <p style={{ fontSize: 11, color: "#8e8e93" }}>{videos.length} videos</p>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
          {videos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "#c7c7cc" }}>
              <GridIcon size={28} style={{ color: "#d1d1d6", margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontSize: 13 }}>No videos</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
              {videos.map(v => (
                <div key={v.id} style={{ position: "relative", aspectRatio: "9/16", borderRadius: 8, overflow: "hidden", background: "#111" }}>
                  <video src={getStreamUrl(v.slug)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted preload="metadata" />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 5px 5px", background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontSize: 9 }}>{formatCount(v.views)}</span>
                    {isOwn && <button onClick={() => { if (confirm("Delete?")) onDelete(v.slug); }} style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}><TrashIcon size={10} style={{ color: "#ff6b6b" }} /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function useIsWide() {
  const [w, setW] = useState(window.innerWidth >= 768);
  useEffect(() => { const h = () => setW(window.innerWidth >= 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return w;
}
