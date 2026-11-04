'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCw,
  Sun,
  Sunset,
  Layers,
  Info,
  Compass,
  ShieldCheck,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export default function Monument3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [lightingMode, setLightingMode] = useState<'daylight' | 'twilight'>('daylight');
  const [activeHotspot, setActiveHotspot] = useState<number>(1);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const monumentGroupRef = useRef<THREE.Group | null>(null);

  // Cinematic camera transition refs
  const isTransitioningRef = useRef<boolean>(false);
  const transitionProgressRef = useRef<number>(1);
  const startCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const endCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const startTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const endTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const hotspots = [
    {
      id: 1,
      title: 'Entrance Portico & Jagati',
      level: 'Ground Level (0.0 m)',
      documentedDepth: 'Surface Datum · Level 0',
      description: 'Monumental Solanki entrance pavilion with square pillared chhatri, torana arch, and stepped jagati initiating the downward axial subterranean descent.',
      cameraPos: { x: 0, y: 8, z: 24 },
      target: { x: 0, y: 1.5, z: 14.5 },
    },
    {
      id: 2,
      title: 'Storey 1 Pavilion & Descent Flight',
      level: 'Tier 1 (-2.2 m)',
      documentedDepth: '-2.2 meters below surface',
      description: 'First subterranean landing platform flanked by ashlar retaining masonry, stringcourse friezes, and carved niche shrines for earthen lamps.',
      cameraPos: { x: 8, y: 4, z: 12 },
      target: { x: 0, y: -2.0, z: 8.5 },
    },
    {
      id: 3,
      title: 'Storey 2 Double Hypostyle Hall',
      level: 'Tier 2 (-4.4 m)',
      documentedDepth: '-4.4 meters below surface',
      description: 'Two-storey colonnade featuring carved Solanki pillars with pot-and-foliage capitals (ghata-pallava) and intermediate gallery balustrades.',
      cameraPos: { x: -10, y: 1, z: 6 },
      target: { x: 0, y: -4.0, z: 2.5 },
    },
    {
      id: 4,
      title: 'Grand Octagonal Mandapa Atrium',
      level: 'Tier 3 (-6.6 m)',
      documentedDepth: '-6.6 meters below surface',
      description: 'Eight-pillared octagonal light well allowing atmospheric sunlight to cascade down onto multi-tiered gallery balconies and carved sandstone friezes.',
      cameraPos: { x: 11, y: -1, z: -1 },
      target: { x: 0, y: -5.5, z: -4.5 },
    },
    {
      id: 5,
      title: 'Deep Terraces & Gallery',
      level: 'Tier 4 (-8.8 m)',
      documentedDepth: '-8.8 meters below surface',
      description: 'Deep subterranean terrace cooled by geothermal earth buffering, featuring hypostyle bays, lateral retaining buttresses, and axial stairs.',
      cameraPos: { x: -8, y: -3, z: -8 },
      target: { x: 0, y: -8.0, z: -11.0 },
    },
    {
      id: 6,
      title: 'Basal Water Table & Wellhead (Kupa)',
      level: 'Tier 5 (-11.0 m)',
      documentedDepth: '-11.0 meters below surface',
      description: 'Deep circular masonry well shaft catching groundwater aquifer, equipped with stone pulley pylons, stepped water basin, and shimmering reservoir.',
      cameraPos: { x: 4, y: -2, z: -23 },
      target: { x: 0, y: -9.5, z: -16.5 },
    },
  ];

  const triggerTransition = (targetCam: { x: number; y: number; z: number }, targetLook: { x: number; y: number; z: number }) => {
    if (!cameraRef.current || !controlsRef.current) return;
    startCamPosRef.current.copy(cameraRef.current.position);
    endCamPosRef.current.set(targetCam.x, targetCam.y, targetCam.z);
    startTargetRef.current.copy(controlsRef.current.target);
    endTargetRef.current.set(targetLook.x, targetLook.y, targetLook.z);
    transitionProgressRef.current = 0;
    isTransitioningRef.current = true;
  };

  const handleSelectHotspot = (hotspot: (typeof hotspots)[0]) => {
    setActiveHotspot(hotspot.id);
    triggerTransition(hotspot.cameraPos, hotspot.target);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      setTimeout(() => {
        if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }, 120);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleResetCamera = () => {
    setActiveHotspot(1);
    triggerTransition({ x: 24, y: 22, z: 30 }, { x: 0, y: -4.5, z: 0 });
  };

  // Sync auto-rotation dynamically without remounting the entire scene
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDaylight = lightingMode === 'daylight';
    const bgColor = isDaylight ? 0xF2EBE1 : 0x1A1614;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, isDaylight ? 0.009 : 0.015);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(24, 22, 30);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDaylight ? 1.08 : 1.25;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. OrbitControls Integration
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 0.65;
    controls.minDistance = 6;
    controls.maxDistance = 65;
    // Clamped so camera never goes beneath subterranean bedrock plinth
    controls.maxPolarAngle = Math.PI / 2 + 0.10;
    controls.target.set(0, -4.5, 0);
    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
    });
    controlsRef.current = controls;

    // 5. Procedural Texture Generators
    // A. Warm Gujarat Dhrangadhra Ashlar Sandstone Texture
    const createSandstoneTexture = (twilight: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Base warm sandstone fill
      ctx.fillStyle = twilight ? '#b88258' : '#d9c5a7';
      ctx.fillRect(0, 0, 512, 512);

      // Micro-grain noise
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const noise = (Math.random() - 0.5) * 26;
        d[i] = Math.min(255, Math.max(0, d[i] + noise));
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise * 0.9));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise * 0.72));
      }
      ctx.putImageData(imgData, 0, 0);

      // Ashlar masonry course lines
      ctx.strokeStyle = twilight ? 'rgba(70, 42, 28, 0.4)' : 'rgba(130, 110, 90, 0.35)';
      ctx.lineWidth = 2.5;
      const rows = 8;
      const rowH = 512 / rows;
      for (let r = 0; r <= rows; r++) {
        const y = r * rowH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        if (r < rows) {
          const cols = 4;
          const colW = 512 / cols;
          const offset = (r % 2) * (colW / 2);
          for (let c = 0; c <= cols + 1; c++) {
            const x = c * colW + offset;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + rowH);
            ctx.stroke();
          }
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      return tex;
    };

    // B. Sandstone Bump / Normal Map
    const createSandstoneBump = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 512, 512);

      const imgData = ctx.getImageData(0, 0, 512, 512);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 40;
        const val = Math.min(255, Math.max(0, 128 + n));
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 3;
      const rows = 8;
      const rowH = 512 / rows;
      for (let r = 0; r <= rows; r++) {
        const y = r * rowH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        if (r < rows) {
          const cols = 4;
          const colW = 512 / cols;
          const offset = (r % 2) * (colW / 2);
          for (let c = 0; c <= cols + 1; c++) {
            const x = c * colW + offset;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + rowH);
            ctx.stroke();
          }
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      return tex;
    };

    // C. Archaeological Stratigraphic Earth Cutaway Texture
    const createStratifiedEarthTexture = (twilight: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      if (twilight) {
        grad.addColorStop(0.00, '#442a1b'); // Humic topsoil
        grad.addColorStop(0.20, '#5e3c26'); // Upper alluvium
        grad.addColorStop(0.45, '#7a4f33'); // Caliche / kankar limestone band
        grad.addColorStop(0.70, '#96623d'); // Weathered alluvial sand
        grad.addColorStop(1.00, '#3b2214'); // Geological bedrock plinth
      } else {
        grad.addColorStop(0.00, '#6d523d'); // Humic topsoil
        grad.addColorStop(0.20, '#8c6f52'); // Alluvial silt
        grad.addColorStop(0.45, '#ab8f72'); // Caliche limestone bed
        grad.addColorStop(0.70, '#bda285'); // Weathered sandstone
        grad.addColorStop(1.00, '#7c5e44'); // Consolidated bedrock
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Horizontal sediment striations
      for (let y = 0; y < 512; y += 4) {
        const alpha = 0.08 + Math.sin(y * 0.18) * 0.06;
        ctx.fillStyle = (y % 16 < 8) ? `rgba(255, 245, 220, ${alpha})` : `rgba(35, 20, 10, ${alpha})`;
        ctx.fillRect(0, y, 512, 2.5);
      }

      // Small pebble inclusions
      for (let i = 0; i < 90; i++) {
        const px = Math.random() * 512;
        const py = 50 + Math.random() * 410;
        const pr = 1 + Math.random() * 2.5;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(235, 220, 195, 0.4)' : 'rgba(50, 32, 20, 0.35)';
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    };

    // D. Solanki Architectural Carved Frieze Relief Texture
    const createReliefTexture = (twilight: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = twilight ? '#c48655' : '#e3ceb2';
      ctx.fillRect(0, 0, 512, 128);

      // Carved diamond lozenge frieze (ratna moulding)
      ctx.fillStyle = twilight ? '#8e5933' : '#b59a7a';
      ctx.strokeStyle = twilight ? '#61371a' : '#7d6346';
      ctx.lineWidth = 2;

      const diamonds = 8;
      const step = 512 / diamonds;
      for (let i = 0; i < diamonds; i++) {
        const cx = i * step + step / 2;
        const cy = 64;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 36);
        ctx.lineTo(cx + 24, cy);
        ctx.lineTo(cx, cy + 36);
        ctx.lineTo(cx - 24, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Central rosette dot
        ctx.fillStyle = twilight ? '#ffcc88' : '#fff0d4';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = twilight ? '#8e5933' : '#b59a7a';
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(4, 1);
      return tex;
    };

    // Instantiate textures
    const sandstoneDiff = createSandstoneTexture(lightingMode === 'twilight');
    const sandstoneBump = createSandstoneBump();
    const earthDiff = createStratifiedEarthTexture(lightingMode === 'twilight');
    const reliefDiff = createReliefTexture(lightingMode === 'twilight');

    // 6. Materials
    const stoneColor = lightingMode === 'twilight' ? 0xb88258 : 0xd8c3a5;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      map: sandstoneDiff,
      bumpMap: sandstoneBump,
      bumpScale: 0.035,
      roughness: 0.82,
      metalness: 0.03,
      wireframe: wireframe,
    });

    const darkStoneColor = lightingMode === 'twilight' ? 0x6e4e36 : 0x8A7765;
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: darkStoneColor,
      map: sandstoneDiff,
      bumpMap: sandstoneBump,
      bumpScale: 0.045,
      roughness: 0.88,
      metalness: 0.04,
      wireframe: wireframe,
    });

    const ornateStoneMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0xcfa075 : 0xead9c2,
      map: reliefDiff,
      bumpMap: sandstoneBump,
      bumpScale: 0.05,
      roughness: 0.74,
      metalness: 0.02,
      wireframe: wireframe,
    });

    const retainingWallMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x8a6247 : 0xb8a287,
      map: sandstoneDiff,
      bumpMap: sandstoneBump,
      bumpScale: 0.04,
      roughness: 0.86,
      wireframe: wireframe,
    });

    const cutawayBaseMat = new THREE.MeshStandardMaterial({
      map: earthDiff,
      roughness: 0.94,
      metalness: 0.01,
      wireframe: wireframe,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x165c52,
      roughness: 0.08,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
    });

    const woodRopeMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x5a3d28 : 0x7a583e,
      roughness: 0.92,
      metalness: 0.05,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xb58e45,
      roughness: 0.35,
      metalness: 0.75,
    });

    // 7. Lighting Configuration
    if (lightingMode === 'twilight') {
      const ambient = new THREE.AmbientLight(0x2d1f18, 1.8);
      scene.add(ambient);

      // Deep sunset directional rim light
      const duskSun = new THREE.DirectionalLight(0xdc783c, 2.5);
      duskSun.position.set(-22, 18, 14);
      duskSun.castShadow = true;
      duskSun.shadow.mapSize.width = 2048;
      duskSun.shadow.mapSize.height = 2048;
      scene.add(duskSun);

      // Warm glowing earthen oil lamps (diyas) in subterranean pavilions
      const lamps = [
        { x: 0, y: 1.8, z: 15.5, color: 0xffaa44, dist: 16, intensity: 2.4 }, // Entrance Chhatri
        { x: -3.5, y: -1.0, z: 8.8, color: 0xff9933, dist: 12, intensity: 1.8 }, // Tier 1 Niche
        { x: 3.5, y: -1.0, z: 8.8, color: 0xff9933, dist: 12, intensity: 1.8 },  // Tier 1 Niche
        { x: 0, y: -4.2, z: 2.5, color: 0xff9933, dist: 18, intensity: 2.2 },   // Tier 2 Pavilion
        { x: 0, y: -5.0, z: -4.5, color: 0xffa044, dist: 22, intensity: 2.8 },  // Octagonal Mandapa Center
        { x: 0, y: -7.5, z: -11.0, color: 0xff8833, dist: 16, intensity: 2.0 }, // Tier 4 Landing
        { x: 0, y: -9.5, z: -16.5, color: 0x44ddbb, dist: 20, intensity: 2.0 }, // Water Well Glow
      ];

      for (const l of lamps) {
        const pl = new THREE.PointLight(l.color, l.intensity, l.dist);
        pl.position.set(l.x, l.y, l.z);
        scene.add(pl);

        // Small glowing diya mesh
        const diya = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.08, 0.06, 12),
          new THREE.MeshBasicMaterial({ color: 0xff8822 })
        );
        diya.position.set(l.x, l.y - 0.2, l.z);
        scene.add(diya);
      }
    } else {
      // Golden architectural morning sunlight
      const ambient = new THREE.AmbientLight(0xfff5eb, 2.3);
      scene.add(ambient);

      const sunlight = new THREE.DirectionalLight(0xffeedd, 3.0);
      sunlight.position.set(26, 34, 24);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.width = 2048;
      sunlight.shadow.mapSize.height = 2048;
      sunlight.shadow.bias = -0.0004;
      scene.add(sunlight);

      // Soft ambient sky bounce
      const skyFill = new THREE.DirectionalLight(0xdbe6f2, 1.2);
      skyFill.position.set(-20, 18, -20);
      scene.add(skyFill);

      // Subtle ground sandstone bounce
      const groundBounce = new THREE.DirectionalLight(0xd4be9e, 0.6);
      groundBounce.position.set(0, -15, 0);
      scene.add(groundBounce);
    }

    // 8. Procedural Stepwell Construction Group
    const monumentGroup = new THREE.Group();
    monumentGroupRef.current = monumentGroup;
    scene.add(monumentGroup);

    // Architectural Helper Functions:
    // A. Solanki Column Order (Plinth Base, Octagonal Shaft, Pot-and-Foliage Capital, 4-way Cross Brackets)
    const createSolankiPillar = (x: number, yBottom: number, height: number, z: number) => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(x, yBottom, z);

      // 1. Two-tiered Plinth Base (Upapitha + Padma Inverted Lotus Moulding)
      const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 0.56), darkStoneMat);
      plinthBase.position.y = 0.1;
      plinthBase.castShadow = true;
      plinthBase.receiveShadow = true;
      pillarGroup.add(plinthBase);

      const plinthCushion = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 8), darkStoneMat);
      plinthCushion.position.y = 0.27;
      plinthCushion.castShadow = true;
      pillarGroup.add(plinthCushion);

      // 2. Main Column Shaft (Octagonal lower section + cylindrical fluted upper shaft)
      const shaftHeight = Math.max(0.3, height - 0.7);
      const lowerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, shaftHeight * 0.45, 8), stoneMat);
      lowerShaft.position.y = 0.34 + (shaftHeight * 0.45) / 2;
      lowerShaft.castShadow = true;
      lowerShaft.receiveShadow = true;
      pillarGroup.add(lowerShaft);

      // Decorative Belt / Girdle Ring (Bandha)
      const bandha = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 8), ornateStoneMat);
      bandha.position.y = 0.34 + shaftHeight * 0.45;
      bandha.castShadow = true;
      pillarGroup.add(bandha);

      // Fluted cylindrical upper shaft
      const upperShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, shaftHeight * 0.55, 12), stoneMat);
      upperShaft.position.y = 0.34 + shaftHeight * 0.45 + (shaftHeight * 0.55) / 2;
      upperShaft.castShadow = true;
      upperShaft.receiveShadow = true;
      pillarGroup.add(upperShaft);

      // 3. Pot-and-Foliage Capital Block (Ghata-Pallava)
      const capitalY = 0.34 + shaftHeight;
      const ghata = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.16, 8), ornateStoneMat);
      ghata.position.y = capitalY + 0.08;
      ghata.castShadow = true;
      pillarGroup.add(ghata);

      const abacus = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.68), ornateStoneMat);
      abacus.position.y = capitalY + 0.2;
      abacus.castShadow = true;
      pillarGroup.add(abacus);

      // 4. Four-way Cross-Bracket Arms (Kichaka Brackets)
      const armX = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.36), ornateStoneMat);
      armX.position.y = capitalY + 0.26;
      armX.castShadow = true;
      pillarGroup.add(armX);

      const armZ = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.88), ornateStoneMat);
      armZ.position.y = capitalY + 0.26;
      armZ.castShadow = true;
      pillarGroup.add(armZ);

      return pillarGroup;
    };

    // B. Lintel Architrave Beam
    const createArchitrave = (x: number, y: number, z: number, w: number, h: number, d: number) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ornateStoneMat);
      beam.position.set(x, y, z);
      beam.castShadow = true;
      beam.receiveShadow = true;
      return beam;
    };

    // C. Flight of Stone Steps with Flanking Balustrade Cheek-Walls (Kaksasana)
    const createStairFlight = (
      startY: number,
      endY: number,
      startZ: number,
      endZ: number,
      width: number,
      stepsCount: number
    ) => {
      const flightGroup = new THREE.Group();
      const dy = (endY - startY) / stepsCount;
      const dz = (endZ - startZ) / stepsCount;
      const stepDepth = Math.abs(dz) * 1.05;
      const stepHeight = Math.abs(dy);

      for (let i = 0; i < stepsCount; i++) {
        const stepY = startY + i * dy - stepHeight / 2;
        const stepZ = startZ + i * dz + dz / 2;
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(width, stepHeight, stepDepth),
          stoneMat
        );
        stepMesh.position.set(0, stepY, stepZ);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        flightGroup.add(stepMesh);
      }

      // Flanking Sloping Balustrade Cheek-Walls (Kaksasana)
      const totalLen = Math.hypot(endY - startY, endZ - startZ);
      const angle = Math.atan2(endY - startY, endZ - startZ);
      const midY = (startY + endY) / 2 + 0.35;
      const midZ = (startZ + endZ) / 2;
      const balustradeThickness = 0.32;
      const balustradeHeight = 0.7;

      for (const side of [-width / 2 - balustradeThickness / 2, width / 2 + balustradeThickness / 2]) {
        const balustrade = new THREE.Mesh(
          new THREE.BoxGeometry(balustradeThickness, balustradeHeight, totalLen),
          darkStoneMat
        );
        balustrade.position.set(side, midY, midZ);
        balustrade.rotation.x = -angle;
        balustrade.castShadow = true;
        balustrade.receiveShadow = true;
        flightGroup.add(balustrade);
      }

      return flightGroup;
    };

    // --- 1. Foundational Geological Bedrock Plinth (Cutaway Base) ---
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(22, 1.4, 44), cutawayBaseMat);
    plinth.position.set(0, -12.2, 0);
    plinth.receiveShadow = true;
    monumentGroup.add(plinth);

    // --- 2. Lateral Masonry Retaining Walls with Stringcourses & Recessed Niches ---
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 12.5, 36), retainingWallMat);
    leftWall.position.set(-4.4, -5.5, 0.5);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    monumentGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 12.5, 36), retainingWallMat);
    rightWall.position.set(4.4, -5.5, 0.5);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    monumentGroup.add(rightWall);

    // Horizontal architectural stringcourse frieze bands along trench walls
    for (const h of [-2.2, -4.4, -6.6, -8.8]) {
      const leftCornice = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 35.6), ornateStoneMat);
      leftCornice.position.set(-4.0, h, 0.5);
      leftCornice.castShadow = true;
      monumentGroup.add(leftCornice);

      const rightCornice = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 35.6), ornateStoneMat);
      rightCornice.position.set(4.0, h, 0.5);
      rightCornice.castShadow = true;
      monumentGroup.add(rightCornice);
    }

    // Sculptural Wall Niches (recessed shrines for oil lamps / deity reliefs)
    const nichePositions = [
      { y: -1.2, z: 9.0 },
      { y: -3.4, z: 3.0 },
      { y: -5.6, z: -3.0 },
      { y: -7.8, z: -9.0 },
    ];
    for (const pos of nichePositions) {
      const leftNiche = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.2, 0.8), darkStoneMat);
      leftNiche.position.set(-4.02, pos.y, pos.z);
      monumentGroup.add(leftNiche);

      const rightNiche = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.2, 0.8), darkStoneMat);
      rightNiche.position.set(4.02, pos.y, pos.z);
      monumentGroup.add(rightNiche);
    }

    // --- 3. Ground Level Entrance Chhatri & Jagati (Z = +16.0, Y = 0.0) ---
    const jagati = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 5.8), darkStoneMat);
    jagati.position.set(0, 0.3, 16.0);
    jagati.receiveShadow = true;
    monumentGroup.add(jagati);

    // Flagstone pavement border
    const pavement = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.1, 7.2), stoneMat);
    pavement.position.set(0, 0.05, 16.0);
    pavement.receiveShadow = true;
    monumentGroup.add(pavement);

    // 4 Corner Solanki Columns for Entrance Portico
    const porticoPillars = [
      { x: -2.2, z: 14.5 },
      { x: 2.2, z: 14.5 },
      { x: -2.2, z: 17.5 },
      { x: 2.2, z: 17.5 },
    ];
    for (const p of porticoPillars) {
      monumentGroup.add(createSolankiPillar(p.x, 0.6, 2.9, p.z));
    }

    // Portico Roof Beam Structure
    monumentGroup.add(createArchitrave(0, 3.5, 14.5, 4.8, 0.26, 0.45));
    monumentGroup.add(createArchitrave(0, 3.5, 17.5, 4.8, 0.26, 0.45));
    monumentGroup.add(createArchitrave(-2.2, 3.5, 16.0, 0.45, 0.26, 3.5));
    monumentGroup.add(createArchitrave(2.2, 3.5, 16.0, 0.45, 0.26, 3.5));

    // Scalloped Torana Entrance Arch between front columns
    const torana = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 8, 16, Math.PI), ornateStoneMat);
    torana.position.set(0, 2.8, 17.5);
    torana.castShadow = true;
    monumentGroup.add(torana);

    // Overhanging Chhajja Eaves
    const chhajja = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 4.8), ornateStoneMat);
    chhajja.position.set(0, 3.68, 16.0);
    chhajja.castShadow = true;
    monumentGroup.add(chhajja);

    // Classical 3-tier stepped pyramidal shikhara roof
    const roofTier1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.38, 3.8), stoneMat);
    roofTier1.position.set(0, 3.95, 16.0);
    roofTier1.castShadow = true;
    monumentGroup.add(roofTier1);

    const roofTier2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.38, 2.8), stoneMat);
    roofTier2.position.set(0, 4.33, 16.0);
    roofTier2.castShadow = true;
    monumentGroup.add(roofTier2);

    const roofTier3 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.38, 1.8), stoneMat);
    roofTier3.position.set(0, 4.71, 16.0);
    roofTier3.castShadow = true;
    monumentGroup.add(roofTier3);

    // Turned Amalaka stone disc & Kalasha finial at apex
    const amalaka = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.18, 16), ornateStoneMat);
    amalaka.position.set(0, 5.0, 16.0);
    amalaka.castShadow = true;
    monumentGroup.add(amalaka);

    const kalasha = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.28, 0.7, 12), ornateStoneMat);
    kalasha.position.set(0, 5.44, 16.0);
    kalasha.castShadow = true;
    monumentGroup.add(kalasha);

    // --- 4. TIER 1 (Y = -2.2m): Descent Flight 1 & First Pavilion ---
    monumentGroup.add(createStairFlight(0.0, -2.2, 13.5, 10.2, 4.8, 8));

    // Tier 1 Landing Platform
    const landing1 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.35, 3.2), darkStoneMat);
    landing1.position.set(0, -2.35, 8.6);
    landing1.receiveShadow = true;
    monumentGroup.add(landing1);

    // Tier 1 Pavilion Pillars
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 9.6));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 9.6));
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 7.6));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 7.6));

    // Tier 1 Overhead Cross-beams
    monumentGroup.add(createArchitrave(0, 0.05, 9.6, 4.4, 0.25, 0.4));
    monumentGroup.add(createArchitrave(0, 0.05, 7.6, 4.4, 0.25, 0.4));
    monumentGroup.add(createArchitrave(-2.0, 0.05, 8.6, 0.4, 0.25, 2.4));
    monumentGroup.add(createArchitrave(2.0, 0.05, 8.6, 0.4, 0.25, 2.4));

    // --- 5. TIER 2 (Y = -4.4m): Descent Flight 2 & Two-Storey Pavilion ---
    monumentGroup.add(createStairFlight(-2.2, -4.4, 7.0, 3.8, 4.8, 8));

    // Tier 2 Landing Platform
    const landing2 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.35, 3.2), darkStoneMat);
    landing2.position.set(0, -4.55, 2.2);
    landing2.receiveShadow = true;
    monumentGroup.add(landing2);

    // Multi-storey Columns rising from -4.4m
    monumentGroup.add(createSolankiPillar(-2.0, -4.4, 2.2, 3.2));
    monumentGroup.add(createSolankiPillar(2.0, -4.4, 2.2, 3.2));
    monumentGroup.add(createSolankiPillar(-2.0, -4.4, 2.2, 1.2));
    monumentGroup.add(createSolankiPillar(2.0, -4.4, 2.2, 1.2));

    // Upper level columns continuing up to surface
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 3.2));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 3.2));
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 1.2));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 1.2));

    // Intermediate and Top Cross-beams for Pavilion 2
    for (const beamY of [-2.15, 0.05]) {
      monumentGroup.add(createArchitrave(0, beamY, 3.2, 4.4, 0.24, 0.38));
      monumentGroup.add(createArchitrave(0, beamY, 1.2, 4.4, 0.24, 0.38));
      monumentGroup.add(createArchitrave(-2.0, beamY, 2.2, 0.38, 0.24, 2.4));
      monumentGroup.add(createArchitrave(2.0, beamY, 2.2, 0.38, 0.24, 2.4));
    }

    // Carved Balustrade (Vedika) on Storey 2 Balcony
    const vedika2 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.5, 0.16), ornateStoneMat);
    vedika2.position.set(0, -1.9, 0.6);
    monumentGroup.add(vedika2);

    // --- 6. TIER 3 (Y = -6.6m): Grand Octagonal Mandapa & Light Well Atrium ---
    monumentGroup.add(createStairFlight(-4.4, -6.6, 0.6, -2.5, 4.8, 8));

    // Octagonal Mandapa Base Platform
    const octFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.5, 0.35, 8),
      darkStoneMat
    );
    octFloor.position.set(0, -6.75, -5.2);
    octFloor.receiveShadow = true;
    monumentGroup.add(octFloor);

    // 8 Grand Colonnade Pillars arranged in an octagon around open atrium (radius = 3.2m)
    const octRadius = 3.2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const px = Math.cos(angle) * octRadius;
      const pz = -5.2 + Math.sin(angle) * octRadius;

      // Lower tier pillar (-6.6m to -4.4m)
      monumentGroup.add(createSolankiPillar(px, -6.6, 2.2, pz));

      // Middle tier pillar (-4.4m to -2.2m)
      monumentGroup.add(createSolankiPillar(px, -4.4, 2.2, pz));

      // Upper tier pillar (-2.2m to 0.0m)
      monumentGroup.add(createSolankiPillar(px, -2.2, 2.2, pz));
    }

    // Multi-storey Octagonal Balcony Gallery Beam Rings at -4.4m, -2.2m, and 0.0m
    for (const ringY of [-4.35, -2.15, 0.05]) {
      for (let i = 0; i < 8; i++) {
        const a1 = (i * Math.PI) / 4 + Math.PI / 8;
        const a2 = ((i + 1) * Math.PI) / 4 + Math.PI / 8;
        const x1 = Math.cos(a1) * octRadius;
        const z1 = -5.2 + Math.sin(a1) * octRadius;
        const x2 = Math.cos(a2) * octRadius;
        const z2 = -5.2 + Math.sin(a2) * octRadius;

        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const beamLen = Math.hypot(x2 - x1, z2 - z1);
        const rotY = Math.atan2(x2 - x1, z2 - z1);

        const octBeam = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, beamLen), ornateStoneMat);
        octBeam.position.set(mx, ringY, mz);
        octBeam.rotation.y = rotY;
        octBeam.castShadow = true;
        monumentGroup.add(octBeam);

        // Protective gallery parapet railings
        const octRailing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, beamLen * 0.95), darkStoneMat);
        octRailing.position.set(mx * 1.05, ringY + 0.35, mz * 1.05);
        octRailing.rotation.y = rotY;
        monumentGroup.add(octRailing);
      }
    }

    // --- 7. TIER 4 (Y = -8.8m): Descent Flight 4 & Deep Subterranean Terraces ---
    monumentGroup.add(createStairFlight(-6.6, -8.8, -7.8, -11.0, 4.4, 8));

    // Deep Landing Platform
    const landing4 = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.35, 2.8), darkStoneMat);
    landing4.position.set(0, -8.95, -12.4);
    landing4.receiveShadow = true;
    monumentGroup.add(landing4);

    // Deep Tier Hypostyle Pillars
    monumentGroup.add(createSolankiPillar(-1.8, -8.8, 2.2, -11.6));
    monumentGroup.add(createSolankiPillar(1.8, -8.8, 2.2, -11.6));
    monumentGroup.add(createSolankiPillar(-1.8, -8.8, 2.2, -13.2));
    monumentGroup.add(createSolankiPillar(1.8, -8.8, 2.2, -13.2));

    // --- 8. TIER 5 (Y = -11.0m): Basal Water Pool & Authentic Wellhead Structure (Kupa) ---
    monumentGroup.add(createStairFlight(-8.8, -10.8, -13.8, -15.0, 4.0, 6));

    // Submerged stone steps extending into the water table
    const subSteps = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 1.2), darkStoneMat);
    subSteps.position.set(0, -11.2, -15.6);
    monumentGroup.add(subSteps);

    // Deep Circular Masonry Well (Kupa) centered at (0, y, -17.5)
    const wellShaftOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.0, 12.5, 32, 1, true),
      retainingWallMat
    );
    wellShaftOuter.position.set(0, -5.5, -17.5);
    wellShaftOuter.receiveShadow = true;
    wellShaftOuter.castShadow = true;
    monumentGroup.add(wellShaftOuter);

    // Concentric stone torus rings reinforcing the well cylinder
    for (const ty of [-2.5, -5.5, -8.5]) {
      const torusRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.02, 0.16, 8, 32),
        ornateStoneMat
      );
      torusRing.position.set(0, ty, -17.5);
      torusRing.rotation.x = Math.PI / 2;
      monumentGroup.add(torusRing);
    }

    // Wellhead Parapet at Ground Level
    const wellParapet = new THREE.Mesh(
      new THREE.CylinderGeometry(4.15, 4.15, 0.9, 32, 1, true),
      stoneMat
    );
    wellParapet.position.set(0, 0.45, -17.5);
    wellParapet.castShadow = true;
    monumentGroup.add(wellParapet);

    // Sculpted Coping Rim
    const wellCoping = new THREE.Mesh(
      new THREE.TorusGeometry(4.18, 0.18, 8, 32),
      ornateStoneMat
    );
    wellCoping.position.set(0, 0.9, -17.5);
    wellCoping.rotation.x = Math.PI / 2;
    monumentGroup.add(wellCoping);

    // Authentic Water-Drawing Superstructure: Two Solid Solanki Pylons & Pulley (Charkhi)
    // Left Pylon
    const pylonLeft = new THREE.Group();
    pylonLeft.position.set(-2.6, 0.0, -17.5);
    const plBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), darkStoneMat);
    plBase.position.y = 0.2;
    pylonLeft.add(plBase);
    const plShaft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 0.5), stoneMat);
    plShaft.position.y = 1.6;
    plShaft.castShadow = true;
    pylonLeft.add(plShaft);
    const plBracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), ornateStoneMat);
    plBracket.position.y = 2.9;
    pylonLeft.add(plBracket);
    monumentGroup.add(pylonLeft);

    // Right Pylon
    const pylonRight = new THREE.Group();
    pylonRight.position.set(2.6, 0.0, -17.5);
    const prBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), darkStoneMat);
    prBase.position.y = 0.2;
    pylonRight.add(prBase);
    const prShaft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 0.5), stoneMat);
    prShaft.position.y = 1.6;
    prShaft.castShadow = true;
    pylonRight.add(prShaft);
    const prBracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), ornateStoneMat);
    prBracket.position.y = 2.9;
    pylonRight.add(prBracket);
    monumentGroup.add(pylonRight);

    // Cross Lintel Beam
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.35, 0.5), ornateStoneMat);
    lintel.position.set(0, 3.1, -17.5);
    lintel.castShadow = true;
    monumentGroup.add(lintel);

    // Turned Pulley Wheel (Charkhi) & Axle
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 12), brassMat);
    axle.position.set(0, 2.8, -17.5);
    axle.rotation.z = Math.PI / 2;
    monumentGroup.add(axle);

    const pulleyWheel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16), woodRopeMat);
    pulleyWheel1.position.set(-0.8, 2.8, -17.5);
    pulleyWheel1.rotation.z = Math.PI / 2;
    monumentGroup.add(pulleyWheel1);

    const pulleyWheel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16), woodRopeMat);
    pulleyWheel2.position.set(0.8, 2.8, -17.5);
    pulleyWheel2.rotation.z = Math.PI / 2;
    monumentGroup.add(pulleyWheel2);

    // Draw Ropes descending into the well
    const rope1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 13.5, 6), woodRopeMat);
    rope1.position.set(-0.8, -3.9, -17.5);
    monumentGroup.add(rope1);

    const rope2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 13.5, 6), woodRopeMat);
    rope2.position.set(0.8, -3.9, -17.5);
    monumentGroup.add(rope2);

    // Shimmering Subterranean Water Disc Pool
    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.95, 3.95, 0.5, 32),
      waterMat
    );
    waterPool.position.set(0, -10.9, -17.5);
    monumentGroup.add(waterPool);

    // 9. Animation & Render Loop with Smooth Camera Flight
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (isTransitioningRef.current) {
        transitionProgressRef.current += 0.024;
        const t = Math.min(1, transitionProgressRef.current);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        camera.position.lerpVectors(startCamPosRef.current, endCamPosRef.current, ease);
        controls.target.lerpVectors(startTargetRef.current, endTargetRef.current, ease);
        controls.update();

        if (t >= 1) {
          isTransitioningRef.current = false;
        }
      } else {
        controls.update();
      }

      // Subtle water shimmer pulsation
      waterPool.position.y = -10.9 + Math.sin(elapsed * 1.6) * 0.035;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      sandstoneDiff.dispose();
      sandstoneBump.dispose();
      earthDiff.dispose();
      reliefDiff.dispose();
    };
  }, [wireframe, lightingMode]);

  const activeHotspotData = hotspots.find((h) => h.id === activeHotspot) || hotspots[0];

  return (
    <div
      ref={containerRef}
      className={`max-w-full transition-all duration-200 ${
        isFullscreen
          ? lightingMode === 'twilight'
            ? 'fixed inset-0 z-50 bg-[#1A1614] text-[#EFE8DC] pt-14 pb-5 px-6 h-screen w-screen overflow-hidden flex flex-col justify-between'
            : 'fixed inset-0 z-50 bg-[#F6F1E7] text-[#393331] pt-14 pb-5 px-6 h-screen w-screen overflow-hidden flex flex-col justify-between'
          : 'space-y-4'
      }`}
    >
      {/* 1. Scholarly Header & Stratigraphic Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#DED3C2]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-sans font-semibold tracking-wider uppercase text-[#814B52] bg-[#814B52]/10 px-2.5 py-0.5 rounded-full border border-[#814B52]/20">
              Subterranean Hydraulic Architecture
            </span>
            <span className="text-xs text-[#756D66] font-sans">1498 CE · Solanki-Vaghela</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#642F38] tracking-tight">
            Adalaj Stepwell (Rudabai ni Vav) Digital Twin
          </h1>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5">
            Volumetric structural model of the five-storey subterranean hydraulic monument in Gandhinagar, Gujarat
          </p>
        </div>

        {/* Stratigraphy Badges & Fullscreen Controls */}
        <div className="hidden sm:flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-sans shadow-2xs ${
            isFullscreen && lightingMode === 'twilight'
              ? 'border-[#4A3D36] bg-[#221D1A] text-[#EFE8DC]'
              : 'border-[#DED3C2] bg-[#FFFCF5] text-[#393331]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-[#52745E]" />
            <span className="font-medium">5 Subterranean Storeys</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-sans shadow-2xs ${
            isFullscreen && lightingMode === 'twilight'
              ? 'border-[#4A3D36] bg-[#221D1A] text-[#A77C54]'
              : 'border-[#DED3C2] bg-[#FFFCF5] text-[#642F38]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-[#A77C54]" />
            <span className="font-medium">Octagonal Mandapa Atrium</span>
          </div>
          {isFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] hover:bg-[#EFE8DC] text-xs font-sans text-[#642F38] font-medium shadow-xs cursor-pointer transition-colors"
              title="Exit Fullscreen (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Fullscreen</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Studio Workspace: 3D Canvas + Architectural Inspector */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-5 ${
          isFullscreen
            ? 'flex-1 min-h-0 h-full'
            : 'min-h-[580px] lg:h-[calc(100vh-14rem)]'
        }`}
      >
        {/* 3D WebGL Canvas */}
        <div className="lg:col-span-7 xl:col-span-8 relative rounded-2xl border border-[#DED3C2] bg-[#FAF6EE] overflow-hidden shadow-sm cursor-grab active:cursor-grabbing min-h-[460px] h-full">
          {/* Mount Three.js Renderer */}
          <div ref={mountRef} className="w-full h-full" />

          {/* Floating Top-Left Model Stamp */}
          <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFFCF5]/92 backdrop-blur-md border border-[#DED3C2] shadow-xs text-xs">
              <span className="w-2 h-2 rounded-full bg-[#A77C54] animate-pulse" />
              <span className="font-serif font-bold text-[#642F38]">Rudabai ni Vav</span>
              <span className="text-[10px] font-sans text-[#756D66] border-l border-[#DED3C2] pl-2 font-medium">
                ASI Monument GJR-14
              </span>
            </div>
          </div>

          {/* Floating Top-Right Studio Toolbar */}
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#FFFCF5]/92 backdrop-blur-md border border-[#DED3C2] shadow-md">
            {/* Daylight / Twilight Toggle */}
            <button
              type="button"
              onClick={() => setLightingMode(lightingMode === 'daylight' ? 'twilight' : 'daylight')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans font-medium rounded-lg hover:bg-[#EFE8DC] transition-all text-[#393331] cursor-pointer"
              title="Toggle architectural lighting environment"
            >
              {lightingMode === 'daylight' ? (
                <Sun className="w-3.5 h-3.5 text-[#A77C54]" />
              ) : (
                <Sunset className="w-3.5 h-3.5 text-[#642F38]" />
              )}
              <span className="capitalize">{lightingMode}</span>
            </button>

            <div className="w-px h-4 bg-[#DED3C2]" />

            {/* Solid / Wireframe Toggle */}
            <button
              type="button"
              onClick={() => setWireframe(!wireframe)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                wireframe
                  ? 'bg-[#642F38] text-[#FFFCF5]'
                  : 'text-[#756D66] hover:text-[#642F38] hover:bg-[#EFE8DC]'
              }`}
              title={wireframe ? 'Show textured masonry' : 'Show structural wireframe'}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            {/* Auto-Rotation Toggle */}
            <button
              type="button"
              onClick={() => setIsRotating(!isRotating)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isRotating
                  ? 'bg-[#EFE8DC] text-[#642F38]'
                  : 'text-[#756D66] hover:text-[#642F38] hover:bg-[#EFE8DC]'
              }`}
              title={isRotating ? 'Pause orbital turntable rotation' : 'Start turntable auto-rotation'}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            </button>

            {/* Reset Camera Viewport */}
            <button
              type="button"
              onClick={handleResetCamera}
              className="p-1.5 rounded-lg text-[#756D66] hover:text-[#642F38] hover:bg-[#EFE8DC] transition-colors cursor-pointer"
              title="Reset camera to default isometric overview"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-[#DED3C2]" />

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-[#756D66] hover:text-[#642F38] hover:bg-[#EFE8DC] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Bottom Interactive Navigation Prompt */}
          <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFFCF5]/90 backdrop-blur-md border border-[#DED3C2] text-xs font-sans text-[#756D66] shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-[#A77C54]" />
              <span>Click &amp; drag mouse to orbit 360° · Scroll to zoom into storeys</span>
            </div>
          </div>
        </div>

        {/* Right Subterranean Architectural Inspector Panel */}
        <div
          className={`lg:col-span-5 xl:col-span-4 rounded-2xl border p-5 shadow-xs flex flex-col justify-between overflow-y-auto ${
            isFullscreen
              ? lightingMode === 'twilight'
                ? 'border-[#3D3029] bg-[#241E1A] text-[#EFE8DC] h-full min-h-0'
                : 'border-[#DED3C2] bg-[#FFFCF5] text-[#393331] h-full min-h-0'
              : 'border-[#DED3C2] bg-[#FFFCF5] text-[#393331]'
          }`}
        >
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-[#814B52]">
                Stratified Architecture
              </span>
              <h2 className="text-base font-serif font-bold text-[#393331] mt-0.5">
                Subterranean Tiers &amp; Hotspots
              </h2>
              <p className="text-xs text-[#59524E] font-serif mt-0.5">
                Select a depth tier to glide camera and inspect structural details
              </p>
            </div>

            {/* Hotspots Tier Selector Cards */}
            <div className="space-y-2">
              {hotspots.map((h) => {
                const isSelected = activeHotspot === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelectHotspot(h)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-l-4 border-l-[#642F38] border-y border-r border-[#DED3C2] bg-[#FAF4EC] shadow-xs'
                        : 'border-[#DED3C2]/70 bg-[#FFFCF5] hover:bg-[#F6F1E7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`font-serif text-xs leading-snug ${
                            isSelected ? 'text-[#642F38] font-bold' : 'text-[#393331] font-medium'
                          }`}
                        >
                          {h.title}
                        </span>
                        <span className="text-[11px] text-[#756D66] font-sans mt-0.5">
                          {h.documentedDepth}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-sans px-2.5 py-0.5 rounded-full border whitespace-nowrap font-medium ${
                          isSelected
                            ? 'bg-[#642F38] text-[#FFFCF5] border-[#642F38]'
                            : 'bg-[#F6F1E7] text-[#814B52] border-[#DED3C2]'
                        }`}
                      >
                        {h.level}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Hotspot Deep Dive Card */}
            <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#F9F4EB] space-y-1.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-sans font-semibold text-[#814B52] tracking-wider">
                  Tier Analysis
                </span>
                <span className="font-sans font-medium text-[10px] px-2 py-0.5 rounded-full bg-[#FFFCF5] border border-[#DED3C2] text-[#642F38]">
                  {activeHotspotData.level}
                </span>
              </div>
              <h3 className="font-serif font-bold text-[#642F38] text-sm">
                {activeHotspotData.title}
              </h3>
              <p className="text-[#59524E] leading-relaxed font-serif text-xs">
                {activeHotspotData.description}
              </p>
            </div>
          </div>

          {/* Subterranean Engineering Note & Provenance Notice */}
          <div className="space-y-2.5 pt-3 border-t border-[#EBE4D8] mt-3">
            {/* Heritage Geothermal Cooling Callout */}
            <div className="p-3 rounded-xl bg-[#FAF4EC] border border-[#DFD3C2] text-xs text-[#393331] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#A77C54] font-serif">
                <Info className="w-3.5 h-3.5" />
                <span>Hydraulic &amp; Microclimate Engineering</span>
              </div>
              <p className="text-[11px] text-[#59524E] leading-normal font-serif">
                Stepwells in arid Gujarat operated as passive geothermal cooling sanctuaries, decreasing air temperature by 5–7°C relative to ambient surface terrain.
              </p>
            </div>

            {/* Institutional Provenance Notice */}
            <div className="p-2.5 rounded-xl bg-[#F6F1E7] border border-[#DED3C2] text-[10px] text-[#756D66] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#A77C54] shrink-0" />
              <span className="font-serif leading-tight">
                Procedural 3D cutaway representation based on published Archaeological Survey of India (ASI) field survey plans.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
