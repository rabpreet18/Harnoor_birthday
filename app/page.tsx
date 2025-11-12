"use client";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Environment } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import YouTube from "react-youtube";

/** ------------------ HARDCODE YOUR ASSETS HERE ------------------ **/

// 3D SKYLINE BACKDROP (your exact link)
const BG_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/d/d1/Toronto_Skyline_at_night_-b.jpg";

// RELIABLE way: put p1.jpg..p4.jpg in /public and use "/p1.jpg" etc.
const PHOTO_URLS_SAME_ORIGIN = ["/p1.jpg", "/p2.jpg", "/p3.jpg", "/p4.jpg"];

// If you insist on Drive, convert to /uc?id=... (may still fail due to CORS):
const PHOTO_URLS_DRIVE = [
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/34f04288-b2c6-4111-8f3c-8e188df538ac.JPG",
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/IMG_1444.PNG",
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/IMG_1752.PNG",
  "https://github.com/rabpreet18/Harnoor_birthday/blob/main/app/IMG_1822.jpg",
];

// Choose which set you want to use:
const PHOTO_URLS = PHOTO_URLS_SAME_ORIGIN; // <- switch to PHOTO_URLS_DRIVE if you must

// YouTube music (hard-coded)
const YT_ID = "B-2BCSxnyHA";
const YT_START_SECONDS = 84;

// Card copy
const CARD_TITLE = "HAPPY BIRTHDAY HUNNY";
const CARD_MESSAGE =
  "This is just me being a part of your non-lowkey birthday this year hehe. Thank you for being my exploring, bakchodi, music, deep talks and random walks partner. Seeing you grow over this last one year has been truly gratifying. Can't wait to see all the success, happiness and masti this next year brings for. I miss you <3";
const CARD_SIGN = "— love, Rabbo";

/** ------------------ HELPERS ------------------ **/

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

// Procedural wood (date table) — canvas-based repeating texture
function useWoodTexture() {
  return useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;

    // base warm tone
    ctx.fillStyle = "#6e4a2e";
    ctx.fillRect(0, 0, size, size);

    // grain bands
    for (let y = 0; y < size; y++) {
      const tone = 30 + Math.sin(y * 0.015) * 18 + Math.sin(y * 0.06) * 6;
      ctx.fillStyle = `rgba(255,255,255,${(tone / 255) * 0.08})`;
      ctx.fillRect(0, y, size, 1);
    }
    // knots
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 28 + Math.random() * 38;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, "rgba(40,25,10,0.35)");
      g.addColorStop(1, "rgba(40,25,10,0.0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const t = new THREE.CanvasTexture(c);
    (t as any).colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.5, 2.5);
    t.anisotropy = 8;
    return t;
  }, []);
}

/** ------------------ SCENE PIECES ------------------ **/

function SkyPanorama() {
  // map skyline to inside of a large open cylinder so there’s no black
  const tex = useImageTexture(BG_IMG);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = 1.2;
  return (
    <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI, 0]}>
      <cylinderGeometry args={[30, 30, 12, 80, 1, true]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function DateTable() {
  const wood = useWoodTexture();
  return (
    <group>
      {/* table top */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[14, 0.18, 10]} />
        <meshPhysicalMaterial
          map={wood}
          metalness={0.05}
          roughness={0.35}
          clearcoat={0.65}
          clearcoatRoughness={0.25}
        />
      </mesh>
      {/* subtle rim/bevel */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[14.2, 0.02, 10.2]} />
        <meshStandardMaterial color="#5a3d26" roughness={0.6} />
      </mesh>
    </group>
  );
}

function PhotoFrame({
  url,
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  size = [1.45, 1.0] as [number, number],
}) {
  const tex = useImageTexture(url);
  const [w, h] = size;
  return (
    <group position={pos as any} rotation={rot as any}>
      {/* wood frame */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.14, h + 0.14, 0.08]} />
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
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, -0.08]}>
        <cylinderGeometry args={[0, 0.18, 0.25, 4]} />
        <meshStandardMaterial color="#6e5a46" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Candle({
  blown,
  onToggle,
}: {
  blown: boolean;
  onToggle: () => void;
}) {
  const flame = useRef<THREE.Sprite>(null!);
  const sparks = useRef<THREE.Points>(null!);

  // sparkle anim
  useFrame(({ clock }) => {
    if (!sparks.current) return;
    const t = clock.getElapsedTime();
    const g = sparks.current.geometry as THREE.BufferGeometry;
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i);
      y += 0.01 + Math.random() * 0.003;
      if (y > 0.18) y = -0.02 - Math.random() * 0.03;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    if (flame.current && !blown) {
      const s = 0.12 + Math.sin(t * 12) * 0.015;
      flame.current.scale.set(s, s * 1.6, 1);
      flame.current.position.x = Math.sin(t * 6) * 0.01;
    }
  });

  // build spark geometry once
  const sparkGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 120;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 0.04;
      arr[i * 3 + 1] = Math.random() * 0.12 - 0.03;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  // flame sprite texture
  const flameTex = useMemo(() => {
    const s = 128;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,230,120,1)");
    g.addColorStop(0.4, "rgba(255,170,40,0.9)");
    g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    (t as any).colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <group position={[0, 0.95, 0]} onClick={onToggle}>
      {/* candle body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.9, 32]} />
        <meshStandardMaterial color="#fff4d6" roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* flame + sparks */}
      {!blown && (
        <>
          <sprite ref={flame} position={[0, 0.56, 0]}>
            <spriteMaterial
              attach="material"
              map={flameTex}
              depthWrite={false}
              transparent
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <points ref={sparks} position={[0, 0.6, 0]}>
            <primitive attach="geometry" object={sparkGeom} />
            <pointsMaterial
              size={0.02}
              sizeAttenuation
              color={"#ffcc66"}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>
        </>
      )}
    </group>
  );
}

function Knife({ active }: { active: boolean }) {
  // swoop animation around cake when cutting
  const { rotY, posX } = useSpring({
    rotY: active ? -Math.PI / 3 : -Math.PI / 12,
    posX: active ? 0.9 : 1.4,
    config: { mass: 1, tension: 220, friction: 18 },
  });

  return (
    <animated.group position-z={0.2} position-y={0.82} position-x={posX} rotation-y={rotY}>
      {/* blade */}
      <mesh castShadow>
        <boxGeometry args={[0.9, 0.04, 0.06]} />
        <meshPhysicalMaterial
          color="#cccccc"
          metalness={1}
          roughness={0.2}
          reflectivity={1}
          clearcoat={0.6}
        />
      </mesh>
      {/* tip */}
      <mesh position={[0.45, 0, 0]}>
        <coneGeometry args={[0.06, 0.14, 12]} />
        <meshPhysicalMaterial color="#d0d0d0" metalness={1} roughness={0.2} />
      </mesh>
      {/* handle */}
      <mesh position={[-0.55, 0, 0]}>
        <boxGeometry args={[0.28, 0.08, 0.1]} />
        <meshStandardMaterial color="#4b2e1e" roughness={0.6} />
      </mesh>
    </animated.group>
  );
}

function Cake({
  cut,
  onCut,
  blown,
  setBlown,
}: {
  cut: boolean;
  onCut: () => void;
  blown: boolean;
  setBlown: (v: boolean | ((b: boolean) => boolean)) => void;
}) {
  const icing = new THREE.Color("#ffe6e6");
  const cake = new THREE.Color("#f7c57f");

  const { sliceX, topY } = useSpring({
    sliceX: cut ? 1.18 : 0,
    topY: cut ? 0.02 : 0.08,
    config: { mass: 1, tension: 220, friction: 18 },
  });

  return (
    <group position={[0, 0.5, 0]}>
      {/* plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.505, 0]} receiveShadow>
        <circleGeometry args={[1.25, 64]} />
        <meshStandardMaterial color="#f7f7f7" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* lower cake */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.8, 0.86, 0.34, 64]} />
        <meshStandardMaterial color={cake} roughness={0.7} />
      </mesh>
      {/* drizzle */}
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
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const r = 0.68;
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.47, Math.sin(a) * r]} castShadow>
              <torusGeometry args={[0.07, 0.03, 12, 24]} />
              <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.05} />
            </mesh>
          );
        })}
        {/* biscuit sticks */}
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
        <Candle blown={blown} onToggle={() => setBlown((b) => !b)} />
      </animated.group>

      {/* cut slice */}
      <animated.group position-x={sliceX}>
        <mesh castShadow position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.22, 64, 1, false, 0, Math.PI / 5]} />
          <meshStandardMaterial color={icing} roughness={0.5} />
        </mesh>
      </animated.group>

      {/* click area for cutting */}
      <mesh onClick={onCut} position={[0, 0.38, 0]} visible={false}>
        <cylinderGeometry args={[0.8, 0.8, 0.28, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

function BirthdayCard({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { rot } = useSpring({
    rot: open ? 0 : Math.PI / 2.0,
    config: { mass: 1, tension: 220, friction: 18 },
  });
  return (
    <group position={[1.8, 0, -0.2]}>
      {/* board under card */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[1.45, 0.95]} />
        <meshStandardMaterial color="#f3efe6" />
      </mesh>
      <animated.group rotation-x={rot} position={[0, 0.001, 0]} onClick={onToggle}>
        <Html transform position={[0, 0, 0]} distanceFactor={1.1} occlude>
          <div
            style={{
              width: 640,
              height: 410,
              borderRadius: 20,
              background: "#ffffff",
              boxShadow: "0 22px 40px rgba(0,0,0,0.28)",
              padding: 28,
              cursor: "pointer",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ fontSize: 46 }}>🧸</div>
              <h2 style={{ margin: 0, fontSize: 32, letterSpacing: 1 }}>{CARD_TITLE}</h2>
            </div>
            <p style={{ marginTop: 18, fontSize: 20, lineHeight: 1.6, color: "#333" }}>
              {CARD_MESSAGE}
            </p>
            <div style={{ marginTop: 24, fontWeight: 700, fontSize: 18 }}>{CARD_SIGN}</div>
            <div style={{ marginTop: 12, opacity: 0.6, fontSize: 15 }}>
              (Click to {open ? "close" : "open"})
            </div>
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") setBlown((b) => !b);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <spotLight
        position={[4, 6, 2]}
        angle={0.6}
        penumbra={0.7}
        intensity={1.3}
        castShadow
      />
      <Suspense fallback={null}>
        <SkyPanorama />
        <DateTable />
        <Cake cut={cut} onCut={() => setCut((c) => !c)} blown={blown} setBlown={setBlown} />
        {/* Frames arranged around cake */}
        <PhotoFrame
          url={PHOTO_URLS[0]}
          pos={[-2.2, 0.09, 0.1]}
          rot={[0, THREE.MathUtils.degToRad(20), 0]}
        />
        <PhotoFrame
          url={PHOTO_URLS[1]}
          pos={[-1.1, 0.09, -1.35]}
          rot={[0, THREE.MathUtils.degToRad(42), 0]}
        />
        <PhotoFrame
          url={PHOTO_URLS[2]}
          pos={[1.25, 0.09, -1.45]}
          rot={[0, THREE.MathUtils.degToRad(-38), 0]}
        />
        <PhotoFrame
          url={PHOTO_URLS[3]}
          pos={[2.35, 0.09, 0.15]}
          rot={[0, THREE.MathUtils.degToRad(-16), 0]}
        />
        <BirthdayCard open={cardOpen} onToggle={() => setCardOpen((o) => !o)} />
        <Environment preset="city" />
      </Suspense>

      {/* big, obvious knife that swoops when cutting */}
      <Knife active={cut} />

      {/* full camera freedom: rotate, zoom, and pan */}
      <OrbitControls
        enablePan
        enableZoom
        minDistance={3.5}
        maxDistance={12}
        target={[0, 0.45, 0]}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={0.05}
      />
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
      {/* Start overlay to satisfy autoplay policies */}
      {showGate && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,.72)",
            zIndex: 20,
            color: "#eee",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #333",
              padding: 22,
              borderRadius: 14,
              width: 380,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>Ready?</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 16 }}>
              Tap Start to enable audio & begin the celebration.
            </div>
            <button
              style={{
                padding: "10px 14px",
                background: "#3a86ff",
                border: 0,
                borderRadius: 12,
                color: "#fff",
                cursor: "pointer",
                fontSize: 16,
              }}
              onClick={() => {
                setShowGate(false);
                setPlaying(true);
                if (playerRef.current) playerRef.current.playVideo();
              }}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* clear instructions like the reel */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          width: "100%",
          textAlign: "center",
          color: "#fff",
          opacity: 0.92,
          font: "600 15px system-ui",
          textShadow: "0 2px 4px rgba(0,0,0,0.6)",
          pointerEvents: "none",
        }}
      >
        Press <b>Space</b> to blow candle • Click <b>cake</b> to cut • Click <b>card</b> to
        open/close • Drag to look around, scroll to zoom, drag+right/shift to pan
      </div>

      {/* big control buttons */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 15,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={() => {
            setMuted((m) => !m);
            if (playerRef.current)
              isMuted ? playerRef.current.unMute() : playerRef.current.mute();
          }}
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,.18)",
            color: "#fff",
            border: 0,
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 15,
            backdropFilter: "blur(6px)",
          }}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={() => {
            if (!playerRef.current) return;
            if (isPlaying) playerRef.current.pauseVideo();
            else playerRef.current.playVideo();
            setPlaying((p) => !p);
          }}
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,.18)",
            color: "#fff",
            border: 0,
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 15,
            backdropFilter: "blur(6px)",
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      <Canvas shadows dpr={[1, 2]} camera={{ position: [3.8, 2.6, 5.4], fov: 45 }}>
        <Scene />
      </Canvas>

      {/* hidden YouTube player for audio */}
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <YouTube
          videoId={YT_ID}
          opts={{
            height: "0",
            width: "0",
            playerVars: {
              autoplay: 1,
              mute: isMuted ? 1 : 0,
              loop: 1,
              playlist: YT_ID,
              start: YT_START_SECONDS,
            },
          }}
          onReady={(e) => {
            playerRef.current = e.target;
            if (showGate) e.target.pauseVideo();
            else setPlaying(true);
          }}
          onEnd={(e) => {
            e.target.seekTo(YT_START_SECONDS);
            e.target.playVideo();
          }}
        />
      </div>
    </div>
  );
}
