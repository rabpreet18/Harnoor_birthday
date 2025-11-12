"use client";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Environment } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import YouTube from "react-youtube";

/**
 * EXACT BUILD (hard‑coded visuals + audio) matching the Instagram reference:
 * - City night skyline background (Toronto)
 * - Checkered tablecloth
 * - 3D cake with strawberries, drizzle, sticks, whipped swirls
 * - Candle that flickers, toggle by SPACE or click ("blow out")
 * - Photo frames around the cake (hard‑coded Google Drive /uc?id=... links)
 * - Birthday card on the table
 * - Autoplay YouTube audio after Start tap (hard‑coded ID + start time)
 *
 * Drop this file in Next.js at app/page.tsx. No UI panels, just the scene.
 */

// ---------- HARD-CODED ASSETS (YOUR CUSTOMS) ----------
const BG_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/d/d1/Toronto_Skyline_at_night_-b.jpg"; // Toronto skyline

// Google Drive file IDs converted to direct image URLs (files must be public: Anyone with link → Viewer)
const PHOTO_URLS = [
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/34f04288-b2c6-4111-8f3c-8e188df538ac.JPG",
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/IMG_1444.PNG",
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/IMG_1752.PNG",
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/IMG_1822.jpg",
];

// YouTube song (hard‑coded) — ID from https://youtu.be/B-2BCSxnyHA?si=...&t=84
const YT_ID = "B-2BCSxnyHA";
const YT_START_SECONDS = 84; // start offset

// Card text
const CARD_TITLE = "HAPPY BIRTHDAY HUNNY";
const CARD_MESSAGE =
  "This is just me being a part of your non-lowkey birthday this year hehe. Thank you for being my exploring, bakchodi, music, deep talks and random walks partner. Seeing you grow over this last one year has been truly gratifying. Can't wait to see all the success, happiness and masti this next year brings for. I miss you <3";
const CARD_SIGN = "love, Rabbo";

// ---------- UTILS ----------
function useImageTexture(url: string) {
  return useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const t = loader.load(url);
    (t as any).colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [url]);
}

function CheckerTexture() {
  // small canvas checker (cloth look)
  const tex = useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const colors = ["#cfc9c2", "#b7b1a9"]; // two tones
    const n = 8;
    const s = size / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = colors[(x + y) % 2];
        ctx.fillRect(x * s, y * s, s, s);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    (t as any).colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return tex;
}

// ---------- PIECES ----------
function PhotoFrame({ url, pos = [0, 0, 0], rot = [0, 0, 0], size = [1.35, 0.95] as [number, number] }) {
  const tex = useImageTexture(url);
  const [w, h] = size;
  return (
    <group position={pos as any} rotation={rot as any}>
      {/* wood frame */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.06]} />
        <meshStandardMaterial color="#b48a64" metalness={0.15} roughness={0.6} />
      </mesh>
      {/* mat */}
      <mesh position={[0, h / 2, 0.03]}>
        <boxGeometry args={[w + 0.04, h + 0.04, 0.02]} />
        <meshStandardMaterial color="#f3efe8" />
      </mesh>
      {/* photo */}
      <mesh position={[0, h / 2, 0.05]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* stand */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, -0.07]}>
        <cylinderGeometry args={[0, 0.16, 0.22, 4]} />
        <meshStandardMaterial color="#6e5a46" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Candle({ blown, onToggle }: { blown: boolean; onToggle: () => void }) {
  const flame = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!flame.current || blown) return;
    const s = 1 + Math.sin(clock.elapsedTime * 10) * 0.08;
    flame.current.scale.setScalar(s);
    flame.current.position.x = Math.sin(clock.elapsedTime * 6) * 0.01;
  });
  return (
    <group position={[0, 0.9, 0]} onClick={onToggle}>
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 24]} />
        <meshStandardMaterial color="#fff4d6" roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {!blown && (
        <mesh ref={flame} position={[0, 0.52, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#ffcc55" />
        </mesh>
      )}
    </group>
  );
}

function Cake({ cut, onCut, blown, setBlown }: any) {
  const cloth = CheckerTexture();
  const icing = new THREE.Color("#ffe6e6");
  const cake = new THREE.Color("#f7c57f");

  const { sliceX, topY } = useSpring({
    sliceX: cut ? 1.15 : 0,
    topY: cut ? 0.02 : 0.08,
    config: { mass: 1, tension: 220, friction: 18 },
  });

  return (
    <group position={[0, 0.5, 0]}>
      {/* plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.505, 0]} receiveShadow>
        <circleGeometry args={[1.22, 64]} />
        <meshStandardMaterial color="#f7f7f7" roughness={0.65} metalness={0.08} />
      </mesh>
      {/* table cloth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial map={cloth} />
      </mesh>

      {/* lower cake */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.8, 0.86, 0.34, 64]} />
        <meshStandardMaterial color={cake} roughness={0.7} />
      </mesh>
      {/* drip */}
      <mesh castShadow position={[0, 0.23, 0]}>
        <torusGeometry args={[0.79, 0.08, 24, 100]} />
        <meshStandardMaterial color="#ff615f" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* top layer */}
      <animated.group position-y={topY}>
        <mesh castShadow position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.22, 64]} />
          <meshStandardMaterial color={icing} roughness={0.5} />
        </mesh>
        {/* swirls */}
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          const r = 0.68;
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.48, Math.sin(a) * r]} castShadow>
              <torusGeometry args={[0.07, 0.03, 12, 24]} />
              <meshStandardMaterial color="#fff" roughness={0.2} metalness={0.05} />
            </mesh>
          );
        })}
        {/* chocolate sticks */}
        {[[-0.2, 0.38, 0.18, 0.28], [0.16, 0.4, -0.12, -0.18]].map((p, i) => (
          <mesh key={i} position={[p[0], 0.5, p[2]]} rotation={[p[3], 0, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.55, 16]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.75} />
          </mesh>
        ))}
        {/* strawberries */}
        {[[-0.25, 0.53, 0.2], [0.2, 0.53, -0.12]].map((p, i) => (
          <mesh key={i} position={p as any} castShadow>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color="#e74c3c" roughness={0.45} />
          </mesh>
        ))}
        <Candle blown={blown} onToggle={() => setBlown((b: boolean) => !b)} />
      </animated.group>

      {/* slice */}
      <animated.group position-x={sliceX}>
        <mesh castShadow position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.22, 64, 1, false, 0, Math.PI / 5]} />
          <meshStandardMaterial color={icing} roughness={0.5} />
        </mesh>
      </animated.group>

      {/* invisible hit area for cutting */}
      <mesh onClick={onCut} position={[0, 0.38, 0]} visible={false}>
        <cylinderGeometry args={[0.8, 0.8, 0.28, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

function Background() {
  const tex = useImageTexture(BG_IMG);
  return (
    <group>
      <mesh position={[0, 1.2, -4]}>
        <planeGeometry args={[12, 5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

function BirthdayCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { rot } = useSpring({ rot: open ? 0 : Math.PI / 2.2, config: { mass: 1, tension: 220, friction: 18 } });
  return (
    <group position={[1.6, 0, -0.15]}>
      {/* base board */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[1.25, 0.85]} />
        <meshStandardMaterial color="#f3efe6" />
      </mesh>
      <animated.group rotation-x={rot} position={[0, 0.001, 0]} onClick={onToggle}>
        <Html transform position={[0, 0, 0]} distanceFactor={1.2} occlude>
          <div
            style={{
              width: 520,
              height: 340,
              borderRadius: 16,
              background: "#ffffff",
              boxShadow: "0 18px 35px rgba(0,0,0,0.28)",
              padding: 24,
              cursor: "pointer",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ fontSize: 42 }}>🧸</div>
              <h2 style={{ margin: 0, fontSize: 28, letterSpacing: 1 }}>{CARD_TITLE}</h2>
            </div>
            <p style={{ marginTop: 16, fontSize: 18, lineHeight: 1.5, color: "#444" }}>{CARD_MESSAGE}</p>
            <div style={{ marginTop: 24, fontWeight: 600 }}>— {CARD_SIGN}</div>
            <div style={{ marginTop: 10, opacity: 0.6, fontSize: 14 }}>(Click to {open ? "close" : "open"})</div>
          </div>
        </Html>
      </animated.group>
    </group>
  );
}

function Scene() {
  const [cut, setCut] = useState(false);
  const [blown, setBlown] = useState(false);
  const [cardOpen, setCardOpen] = useState(true);

  // keyboard: SPACE toggles candle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") setBlown((b) => !b);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <ambientLight intensity={0.55} />
      <spotLight position={[4, 6, 2]} angle={0.6} penumbra={0.7} intensity={1.2} castShadow />

      <Suspense fallback={null}>
        <Background />
        <Cake cut={cut} onCut={() => setCut((c: boolean) => !c)} blown={blown} setBlown={setBlown} />
        <PhotoFrame url={PHOTO_URLS[0]} pos={[-2.2, 0, 0.1]} rot={[0, THREE.MathUtils.degToRad(20), 0]} />
        <PhotoFrame url={PHOTO_URLS[1]} pos={[-1.1, 0, -1.35]} rot={[0, THREE.MathUtils.degToRad(45), 0]} />
        <PhotoFrame url={PHOTO_URLS[2]} pos={[1.3, 0, -1.45]} rot={[0, THREE.MathUtils.degToRad(-40), 0]} />
        <PhotoFrame url={PHOTO_URLS[3]} pos={[2.35, 0, 0.15]} rot={[0, THREE.MathUtils.degToRad(-18), 0]} />
        <BirthdayCard open={cardOpen} onToggle={() => setCardOpen((o) => !o)} />
        <Environment preset="city" />
      </Suspense>

      <OrbitControls enablePan={false} minDistance={4} maxDistance={8} target={[0, 0.4, 0]} />
    </>
  );
}

export default function Page() {
  const [showGate, setShowGate] = useState(true);
  const [isMuted, setMuted] = useState(true);
  const [isPlaying, setPlaying] = useState(false);
  const playerRef = useRef<any>(null);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0b0b0b" }}>
      {showGate && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.72)", zIndex: 20 }}>
          <div style={{ background: "#111", border: "1px solid #333", padding: 20, borderRadius: 12, width: 360, textAlign: "center", color: "#eee" }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Ready?</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 16 }}>Tap Start to enable audio & begin the celebration.</div>
            <button
              style={{ padding: "8px 12px", background: "#3a86ff", border: 0, borderRadius: 10, color: "#fff", cursor: "pointer" }}
              onClick={() => {
                setShowGate(false);
                setPlaying(true);
                if (playerRef.current) playerRef.current.playVideo();
              }}
            >Start</button>
          </div>
        </div>
      )}

      {/* bottom hint like the reel */}
      <div style={{ position: "absolute", bottom: 18, width: "100%", textAlign: "center", color: "#fff", opacity: 0.85, font: "500 14px system-ui" }}>
        Press <b>Space</b> to blow out the candle
      </div>

      {/* small controls top-right */}
      <div style={{ position: "absolute", top: 14, right: 14, zIndex: 15, display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            setMuted((m) => !m);
            if (playerRef.current) (isMuted ? playerRef.current.unMute() : playerRef.current.mute());
          }}
          style={{ padding: "6px 10px", background: "rgba(255,255,255,.15)", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}
        >{isMuted ? "Unmute" : "Mute"}</button>
        <button
          onClick={() => {
            if (!playerRef.current) return;
            if (isPlaying) playerRef.current.pauseVideo(); else playerRef.current.playVideo();
            setPlaying((p) => !p);
          }}
          style={{ padding: "6px 10px", background: "rgba(255,255,255,.15)", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}
        >{isPlaying ? "Pause" : "Play"}</button>
      </div>

      <Canvas shadows dpr={[1, 2]} camera={{ position: [3.6, 2.6, 5.4], fov: 45 }}>
        <Scene />
      </Canvas>

      {/* Hidden YouTube player for audio */}
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <YouTube
          videoId={YT_ID}
          opts={{
            height: "0",
            width: "0",
            playerVars: { autoplay: 1, mute: isMuted ? 1 : 0, loop: 1, playlist: YT_ID, start: YT_START_SECONDS },
          }}
          onReady={(e) => {
            playerRef.current = e.target;
            if (showGate) e.target.pauseVideo(); else setPlaying(true);
          }}
          onEnd={(e) => { e.target.seekTo(YT_START_SECONDS); e.target.playVideo(); }}
        />
      </div>
    </div>
  );
}
