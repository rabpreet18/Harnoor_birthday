"use client";
import React, { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import YouTube from "react-youtube";

/**
 * Interactive 3D Birthday Website (single-file demo)
 * - Hard-coded defaults for bg, photos and YouTube (from your query)
 * - Click candle to blow it out (or press Space)
 * - Click the cake to cut a slice
 * - Click the birthday card to open/close
 * - Local file picker still works and can override defaults on your device
 * - Query params still supported and will override hard-coded defaults
 */

// ---- HARD-CODED DEFAULTS (from your message) ----
const GDRIVE = (id: string) => `https://drive.google.com/uc?id=${id}`; // public-readable files only
const HARDCODED = {
  ytId: "B-2BCSxnyHA", // extracted from https://youtu.be/B-2BCSxnyHA?...
  ytStart: 84, // seconds
  bgUrlPrimary: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Toronto_Skyline_at_night_-b.jpg", // NOTE: if this isn't a direct image URL, fallback will kick in
  photos: [
    GDRIVE("1V-7-g4w2gL-4LQjw0Z2F4iyR3hg7PJX3"),
    GDRIVE("1tUfkOGbT-MRMQFYrrM89M2MPD3cnLI3m"),
    GDRIVE("19KqIe21G_pySxTik2WW_m7r9m-ioCbMT"),
    GDRIVE("1gQfAZ_JQ0kXvQiB4wxl0QjQnsGN22uT3"),
  ],
};

// If primary bg fails to load (e.g., Google Photos share pages are not direct images),
// we fall back to the first photo so the scene is never blank.
const FALLBACK_BG = HARDCODED.photos[0];

// Default photos used only as a last resort
const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?q=80&w=600&auto=format&fit=crop",
];

const CHECKER_SVG =
  "data:image/svg+xml;utf8,\
  <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 8 8'>\
    <rect width='4' height='4' fill='%23d2cfc9'/>\
    <rect x='4' width='4' height='4' fill='%23b9b6af'/>\
    <rect y='4' width='4' height='4' fill='%23b9b6af'/>\
    <rect x='4' y='4' width='4' height='4' fill='%23d2cfc9'/>\
  </svg>";

// Extract a YouTube video ID from standard, short, or YT Music links
function getYtIdFromUrl(u: string | null) {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("music.youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
    }
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "");
    }
  } catch (_) {}
  return null;
}

// Convert a File -> Base64 data URL (so it can be used without uploading)
function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Texture loader with graceful fallback
function useTexture(url: string, fallbackUrl?: string) {
  return useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const tex = loader.load(
      url,
      undefined,
      undefined,
      () => {
        if (fallbackUrl) {
          loader.load(fallbackUrl, (t) => {
            tex.image = t.image;
            tex.needsUpdate = true;
          });
        }
      }
    );
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }, [url, fallbackUrl]);
}

function PhotoFrame({ url, position = [0, 0, 0], rotation = [0, 0, 0], size = [1.4, 1] }: any) {
  const tex = useTexture(url);
  const [w, h] = size as [number, number];
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.08]} />
        <meshStandardMaterial color="#b48a64" metalness={0.15} roughness={0.6} />
      </mesh>
      <mesh position={[0, h / 2, 0.03]}>
        <boxGeometry args={[w + 0.04, h + 0.04, 0.02]} />
        <meshStandardMaterial color="#f2efe9" />
      </mesh>
      <mesh position={[0, h / 2, 0.05]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.08]}>
        <cylinderGeometry args={[0, 0.18, 0.25, 4]} />
        <meshStandardMaterial color="#6e5a46" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Candle({ blown, onToggle }: any) {
  const flameRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (!flameRef.current || blown) return;
    const s = 1 + Math.sin(performance.now() * 0.01) * 0.1;
    flameRef.current.scale.setScalar(s);
  });
  const flameMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffcc55"), toneMapped: false }), []);
  return (
    <group onClick={onToggle} position={[0, 0.95, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.9, 32]} />
        <meshStandardMaterial color="#fff3d1" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {!blown && (
        <mesh ref={flameRef} position={[0, 0.56, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <primitive object={flameMat} attach="material" />
        </mesh>
      )}
    </group>
  );
}

function Cake({ onCut, cut, blown, setBlown }: any) {
  const checker = useTexture(CHECKER_SVG);
  checker.repeat.set(8, 8);
  const icingColor = new THREE.Color("#ffe6e6");
  const cakeColor = new THREE.Color("#f7c57f");

  const { sliceX, topY } = useSpring({
    sliceX: cut ? 1.2 : 0,
    topY: cut ? 0.02 : 0.08,
    config: { mass: 1, tension: 200, friction: 20 },
  });

  return (
    <group position={[0, 0.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.505, 0]} receiveShadow>
        <circleGeometry args={[1.25, 64]} />
        <meshStandardMaterial color="#f8f8f8" metalness={0.1} roughness={0.6} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial map={checker} />
      </mesh>

      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.8, 0.85, 0.35, 64]} />
        <meshStandardMaterial color={cakeColor} roughness={0.7} />
      </mesh>

      <mesh castShadow position={[0, 0.25, 0]}>
        <torusGeometry args={[0.8, 0.08, 24, 100]} />
        <meshStandardMaterial color="#ff6b6b" metalness={0.05} roughness={0.3} />
      </mesh>

      <animated.group position-y={topY}>
        <mesh castShadow position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.24, 64]} />
          <meshStandardMaterial color={icingColor} roughness={0.5} />
        </mesh>

        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const r = 0.7;
          return (
            <mesh key={i} position={[Math.cos(angle) * r, 0.51, Math.sin(angle) * r]} castShadow>
              <torusGeometry args={[0.07, 0.03, 12, 24]} />
              <meshStandardMaterial color="#fff" roughness={0.2} metalness={0.05} />
            </mesh>
          );
        })}

        {[[-0.2, 0.4, 0.2, 0.25], [0.15, 0.42, -0.12, -0.15]].map((p, i) => (
          <mesh key={i} position={[p[0], 0.55, p[2]]} rotation={[p[3], 0, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 16]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
          </mesh>
        ))}

        {[[-0.25, 0.58, 0.22], [0.2, 0.58, -0.15]].map((p, i) => (
          <mesh key={i} position={p} castShadow>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color="#e74c3c" roughness={0.4} />
          </mesh>
        ))}

        <Candle blown={blown} onToggle={() => setBlown((b: boolean) => !b)} />
      </animated.group>

      <animated.group position-x={sliceX}>
        <mesh castShadow position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.24, 64, 1, false, 0, Math.PI / 5]} />
          <meshStandardMaterial color={icingColor} roughness={0.5} />
        </mesh>
      </animated.group>

      <Html center position={[0, -0.95, 0]} style={{ pointerEvents: "none" }}>
        <div className="hint">Click candle to blow, cake to cut, card to open</div>
      </Html>

      <mesh onClick={onCut} position={[0, 0.42, 0]} visible={false}>
        <cylinderGeometry args={[0.8, 0.8, 0.3, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

function BirthdayCard({ open, onToggle, title, message, signature }: any) {
  const { rot } = useSpring({ rot: open ? 0 : Math.PI / 2.2, config: { mass: 1, tension: 220, friction: 18 } });
  return (
    <group position={[1.6, 0, -0.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[1.3, 0.9]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
      <animated.group rotation-x={rot} position={[0, 0.001, 0]} onClick={onToggle}>
        <Html transform position={[0, 0, 0]} distanceFactor={1.2} occlude>
          <div
            style={{
              width: 520,
              height: 360,
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 18px 35px rgba(0,0,0,0.25)",
              padding: 24,
              cursor: "pointer",
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ fontSize: 42 }}>🎉</div>
              <h2 style={{ margin: 0, fontSize: 28, letterSpacing: 1 }}>{title}</h2>
            </div>
            <p style={{ marginTop: 16, fontSize: 18, lineHeight: 1.5, color: "#444" }}>{message}</p>
            <div style={{ marginTop: 24, fontWeight: 600 }}>— {signature}</div>
            <div style={{ marginTop: 12, opacity: 0.6, fontSize: 14 }}>(Click to {open ? "close" : "open"})</div>
          </div>
        </Html>
      </animated.group>
    </group>
  );
}

function Background({ url, fallbackUrl }: any) {
  const tex = useTexture(url, fallbackUrl);
  (tex as any).colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={[0, 1.2, -4]}>
      <planeGeometry args={[12, 5]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Scene({ state }: any) {
  const { photos, bgUrl, card, cut, setCut, blown, setBlown } = state;

  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[4, 6, 2]} angle={0.6} penumbra={0.7} intensity={1.2} castShadow />
      <Suspense fallback={null}>
        <Background url={bgUrl} fallbackUrl={FALLBACK_BG} />
        <Cake onCut={() => setCut((c: boolean) => !c)} cut={cut} blown={blown} setBlown={setBlown} />
        <PhotoFrame url={photos[0]} position={[-2.2, 0, 0.1]} rotation={[0, THREE.MathUtils.degToRad(20), 0]} />
        <PhotoFrame url={photos[1]} position={[-1.1, 0, -1.4]} rotation={[0, THREE.MathUtils.degToRad(45), 0]} />
        <PhotoFrame url={photos[2]} position={[1.3, 0, -1.5]} rotation={[0, THREE.MathUtils.degToRad(-40), 0]} />
        <PhotoFrame url={photos[3]} position={[2.4, 0, 0.2]} rotation={[0, THREE.MathUtils.degToRad(-18), 0]} />
        <BirthdayCard open={state.cardOpen} onToggle={() => state.setCardOpen((o: boolean) => !o)} title={card.title} message={card.message} signature={card.signature} />
        <Environment preset="city" />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={8} target={[0, 0.4, 0]} />
    </>
  );
}

export default function BirthdayShowcase() {
  const [photos, setPhotos] = useState<string[]>(HARDCODED.photos.length ? HARDCODED.photos : DEFAULT_PHOTOS);
  const [bgUrl, setBgUrl] = useState<string>(HARDCODED.bgUrlPrimary || FALLBACK_BG);
  const [cut, setCut] = useState(false);
  const [blown, setBlown] = useState(false);
  const [cardOpen, setCardOpen] = useState(true);
  const [card, setCard] = useState({
    title: "HAPPY BIRTHDAY HUNNY",
    message:
      "This is just me being a part of your non-lowkey birthday this year hehe. Thank you for being my exploring, bakehold, music, deep talks and everything partner. — Rabbo",
    signature: "love, Rabbo",
  });

  // Private persistence toggle (kept for your local overrides)
  const [persistLocal, setPersistLocal] = useState(true);

  // --- Audio / YouTube state ---
  const [ytId, setYtId] = useState<string | null>(HARDCODED.ytId);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGate, setShowGate] = useState(!!HARDCODED.ytId); // show Start overlay immediately if a default song exists
  const playerRef = useRef<any>(null);

  // keyboard: Space = blow candle
  const rootRef = useRef<HTMLDivElement>(null!);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") setBlown((b) => !b); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // URL params can override hard-coded defaults (optional)
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("t"), m = params.get("m"), s = params.get("s");
      const bg = params.get("bg");
      const p = [params.get("p1"), params.get("p2"), params.get("p3"), params.get("p4")].filter(Boolean) as string[];
      const yt = params.get("yt");
      const start = Number(params.get("start")) || Number(params.get("t")) || HARDCODED.ytStart;
      if (t || m || s) setCard((c) => ({ title: t || c.title, message: m || c.message, signature: s || c.signature }));
      if (bg) setBgUrl(bg);
      if (p.length) setPhotos((prev) => prev.map((x, i) => p[i] || x));
      if (yt) {
        const id = getYtIdFromUrl(yt) || yt; // allow raw ID
        setYtId(id);
        (window as any).__YT_START__ = start;
        setShowGate(true);
      } else {
        (window as any).__YT_START__ = HARDCODED.ytStart;
      }
    } catch {}
  }, []);

  const state = { photos, bgUrl, card, cut, setCut, blown, setBlown, cardOpen, setCardOpen };

  const onPhotoChange = async (i: number, file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const next = [...photos];
      next[i] = dataUrl;
      setPhotos(next);
      if (persistLocal) localStorage.setItem("bday_p" + i, dataUrl);
    } catch (e) { console.error("Failed to load photo", e); }
  };

  const onBgChange = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setBgUrl(dataUrl);
      if (persistLocal) localStorage.setItem("bday_bg", dataUrl);
    } catch (e) { console.error("Failed to load background", e); }
  };

  const clearSaved = () => {
    try { ["bday_bg", "bday_p0", "bday_p1", "bday_p2", "bday_p3"].forEach((k) => localStorage.removeItem(k)); } catch {}
  };

  return (
    <div ref={rootRef} className="w-full h-screen" style={{ background: "#0b0b0b", color: "#eee" }}>
      {/* Start gate overlay for audio policies */}
      {showGate && (
        <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "grid", placeItems: "center", background: "rgba(0,0,0,.7)" }}>
          <div style={{ background: "#111", border: "1px solid #333", padding: 20, borderRadius: 12, width: 360, textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Ready?</div>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>Tap Start to enable audio & begin the celebration.</div>
            <button
              style={btnStyle}
              onClick={() => {
                setShowGate(false);
                setIsPlaying(true);
                if (playerRef.current) playerRef.current.playVideo();
              }}
            >Start</button>
          </div>
        </div>
      )}

      {/* Controls Panel */}
      <div
        style={{ position: "absolute", zIndex: 20, top: 16, left: 16, right: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, pointerEvents: "auto" }}
      >
        <div style={{ background: "rgba(20,20,20,0.6)", backdropFilter: "blur(8px)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Content (defaults pre-filled)</div>
          <label className="block" style={{ display: "block", marginBottom: 8 }}>
            Background image: <input type="file" accept="image/*" onChange={(e) => onBgChange(e.target.files?.[0])} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <label key={i} style={{ fontSize: 12 }}>
                Photo {i + 1}
                <input type="file" accept="image/*" onChange={(e) => onPhotoChange(i, e.target.files?.[0])} />
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              <input type="checkbox" checked={persistLocal} onChange={(e) => setPersistLocal(e.target.checked)} />
              Save images in this browser (private)
            </label>
            <button style={{ ...btnStyle, background: "#e63946" }} onClick={clearSaved}>Clear saved</button>
          </div>
        </div>
        <div style={{ background: "rgba(20,20,20,0.6)", backdropFilter: "blur(8px)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Card & Audio</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input style={inputStyle} value={card.title} onChange={(e) => setCard({ ...card, title: e.target.value })} placeholder="Card title" />
            <input style={inputStyle} value={card.signature} onChange={(e) => setCard({ ...card, signature: e.target.value })} placeholder="Signature" />
          </div>
          <textarea style={{ ...inputStyle, marginTop: 8, height: 72 }} value={card.message} onChange={(e) => setCard({ ...card, message: e.target.value })} placeholder="Your message" />
          <input
            style={{ ...inputStyle, marginTop: 8 }}
            placeholder="YouTube / YouTube Music link or ID"
            onBlur={(e) => {
              const id = getYtIdFromUrl(e.target.value) || e.target.value || null;
              setYtId(id);
              if (id) setShowGate(true);
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button style={btnStyle} onClick={() => setCardOpen((o) => !o)}>{cardOpen ? "Close" : "Open"} card</button>
            <button style={btnStyle} onClick={() => setBlown((b) => !b)}>{blown ? "Relight" : "Blow"} candle</button>
            <button style={btnStyle} onClick={() => setCut((c) => !c)}>{cut ? "Reset" : "Cut"} cake</button>
            {ytId && (
              <>
                <button style={btnStyle} onClick={() => { setIsMuted((m) => !m); if (playerRef.current) (isMuted ? playerRef.current.unMute() : playerRef.current.mute()); }}>{isMuted ? "Unmute" : "Mute"}</button>
                <button style={btnStyle} onClick={() => { if (!playerRef.current) return; if (isPlaying) playerRef.current.pauseVideo(); else playerRef.current.playVideo(); setIsPlaying((p) => !p); }}>{isPlaying ? "Pause audio" : "Play audio"}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <Canvas shadows dpr={[1, 2]} camera={{ position: [3.5, 2.6, 5.4], fov: 45 }}>
        <Scene state={state} />
      </Canvas>

      {/* Hidden YT player */}
      {ytId && (
        <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
          <YouTube
            videoId={ytId}
            opts={{
              height: "0",
              width: "0",
              playerVars: {
                autoplay: 1,
                mute: isMuted ? 1 : 0,
                loop: 1,
                playlist: ytId,
                start: (window as any).__YT_START__ ?? HARDCODED.ytStart || 0,
              },
            }}
            onReady={(e) => {
              playerRef.current = e.target;
              if (showGate) e.target.pauseVideo(); else setIsPlaying(true);
            }}
            onEnd={(e) => { e.target.seekTo((window as any).__YT_START__ ?? HARDCODED.ytStart || 0); e.target.playVideo(); }}
          />
        </div>
      )}

      <style>{`
        .hint{font: 500 14px system-ui, -apple-system, Segoe UI, Roboto; opacity:.8; padding:6px 10px; background:rgba(255,255,255,.75); color:#111; border-radius:8px}
        input,textarea{color:#eee}
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "8px 10px",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "#3a86ff",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
};
