'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Eye,
  Sun,
  Layers,
  Image as ImageIcon,
  Compass,
  Sparkles,
  Info,
  Maximize2,
} from 'lucide-react';

interface HeroHeritageCanvasProps {
  onExploreArchive?: () => void;
  onOpenAssistant?: () => void;
  onInspect3DStudio?: () => void;
}

export default function HeroHeritageCanvas({
  onExploreArchive,
  onOpenAssistant,
  onInspect3DStudio,
}: HeroHeritageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI & Camera Controls
  const [is2DFallback, setIs2DFallback] = useState<boolean>(false);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [lightingMode, setLightingMode] = useState<'dawn' | 'noon' | 'twilight'>('dawn');
  const [cameraPreset, setCameraPreset] = useState<'panoramic' | 'pillar' | 'sanctum' | 'aerial'>('panoramic');
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // References for animation & interaction
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsState = useRef({
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    targetRotationY: 0.25,
    targetRotationX: 0.15,
    currentRotationY: 0.25,
    currentRotationX: 0.15,
    targetDistance: 14,
    currentDistance: 14,
    autoRotate: true,
  });

  const materialsRef = useRef<THREE.Material[]>([]);
  const lightsRef = useRef<{
    dirLight: THREE.DirectionalLight | null;
    ambientLight: THREE.AmbientLight | null;
    pointLight: THREE.PointLight | null;
  }>({ dirLight: null, ambientLight: null, pointLight: null });

  // 1. Procedural Stone Texture Generator
  const createStoneTexture = useCallback((): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Stone base tone: Dark Deccan basalt / weathered sandstone
    ctx.fillStyle = '#26231f';
    ctx.fillRect(0, 0, 512, 512);

    // Natural stone grain & flecks
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = Math.floor(Math.random() * 50) + 20;
      ctx.fillStyle = `rgba(${brightness + 10}, ${brightness + 5}, ${brightness}, ${Math.random() * 0.35 + 0.1})`;
      ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }

    // Horizontal rock stratigraphy striations
    for (let j = 0; j < 30; j++) {
      const y = Math.random() * 512;
      ctx.strokeStyle = `rgba(180, 160, 130, ${Math.random() * 0.08 + 0.02})`;
      ctx.lineWidth = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + (Math.random() * 8 - 4), 340, y + (Math.random() * 8 - 4), 512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }, []);

  // 2. Initialize Three.js Scene
  useEffect(() => {
    if (is2DFallback) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // Create Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0908);
    scene.fog = new THREE.FogExp2(0x0a0908, 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 3, 14);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setTimeout(() => {
        setWebglAvailable(false);
        setIs2DFallback(true);
      }, 0);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Materials
    materialsRef.current = [];
    const stoneTexture = createStoneTexture();

    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x3d3731,
      roughness: 0.88,
      metalness: 0.12,
      bumpMap: stoneTexture,
      bumpScale: 0.04,
    });
    materialsRef.current.push(basaltMat);

    const darkBasaltMat = new THREE.MeshStandardMaterial({
      color: 0x24201c,
      roughness: 0.92,
      metalness: 0.08,
      bumpMap: stoneTexture,
      bumpScale: 0.05,
    });
    materialsRef.current.push(darkBasaltMat);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.38,
      metalness: 0.85,
    });
    materialsRef.current.push(goldMat);

    // -------------------------------------------------------------------------
    // Architectural Composition: Ancient Indian Monolithic Rock-Cut Sanctuary
    // -------------------------------------------------------------------------
    const heritageGroup = new THREE.Group();

    // A. Multi-tiered Excavated Courtyard Plinth
    const plinthGeo1 = new THREE.BoxGeometry(16, 0.6, 12);
    const plinth1 = new THREE.Mesh(plinthGeo1, darkBasaltMat);
    plinth1.position.y = -2;
    plinth1.receiveShadow = true;
    heritageGroup.add(plinth1);

    const plinthGeo2 = new THREE.BoxGeometry(13, 0.5, 9);
    const plinth2 = new THREE.Mesh(plinthGeo2, basaltMat);
    plinth2.position.y = -1.5;
    plinth2.receiveShadow = true;
    heritageGroup.add(plinth2);

    // B. Monolithic Chaitya / Sanctuary Facade (Center Back)
    const facadeWidth = 6.8;
    const facadeHeight = 5.2;
    const facadeDepth = 3.4;

    const facadeGeo = new THREE.BoxGeometry(facadeWidth, facadeHeight, facadeDepth);
    const facade = new THREE.Mesh(facadeGeo, basaltMat);
    facade.position.set(0, 1.2, -1.8);
    facade.castShadow = true;
    facade.receiveShadow = true;
    heritageGroup.add(facade);

    // Sanctuary Cave Entrance Portal (Recessed Dark Basalt Cave Interior)
    const portalGeo = new THREE.BoxGeometry(2.4, 3.2, 1.2);
    const portal = new THREE.Mesh(portalGeo, darkBasaltMat);
    portal.position.set(0, 0.3, -0.3);
    heritageGroup.add(portal);

    // Horseshoe Arch (Chaitya Gavaksha) over Portal
    const archRadius = 1.35;
    const archGeo = new THREE.TorusGeometry(archRadius, 0.18, 16, 32, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, basaltMat);
    archMesh.position.set(0, 2.1, -0.1);
    archMesh.rotation.z = 0;
    archMesh.castShadow = true;
    heritageGroup.add(archMesh);

    // Arch Sun Crest (Gold Finial Motif)
    const crestGeo = new THREE.ConeGeometry(0.35, 0.7, 8);
    const crest = new THREE.Mesh(crestGeo, goldMat);
    crest.position.set(0, 3.6, -0.1);
    heritageGroup.add(crest);

    // C. Free-standing Monolithic Pillar (Dhwajastambha - Right Forecourt)
    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(3.6, -1.2, 1.5);

    // Octagonal Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(0.75, 0.9, 0.8, 8);
    const pillarBase = new THREE.Mesh(baseGeo, basaltMat);
    pillarBase.castShadow = true;
    pillarGroup.add(pillarBase);

    // Fluted Column Shaft (16-sided)
    const shaftGeo = new THREE.CylinderGeometry(0.42, 0.48, 5.2, 16);
    const shaft = new THREE.Mesh(shaftGeo, basaltMat);
    shaft.position.y = 2.9;
    shaft.castShadow = true;
    pillarGroup.add(shaft);

    // Capital Necking Bands
    const bandGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.25, 16);
    const band = new THREE.Mesh(bandGeo, basaltMat);
    band.position.y = 5.2;
    pillarGroup.add(band);

    // Bell Capital (Inverted Lotus)
    const bellGeo = new THREE.CylinderGeometry(0.75, 0.45, 0.6, 16);
    const bell = new THREE.Mesh(bellGeo, basaltMat);
    bell.position.y = 5.65;
    pillarGroup.add(bell);

    // Crown Finial / Trisula Crest (Antique Gold)
    const finialGeo = new THREE.OctahedronGeometry(0.45);
    const finial = new THREE.Mesh(finialGeo, goldMat);
    finial.position.y = 6.2;
    finial.castShadow = true;
    pillarGroup.add(finial);

    heritageGroup.add(pillarGroup);

    // D. Symmetrical Left Pavilion / Shrine (Nandi Mandapa Silhouette)
    const mandapaGroup = new THREE.Group();
    mandapaGroup.position.set(-3.6, -1.2, 1.5);

    const mandapaBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.8, 2.4),
      basaltMat
    );
    mandapaBase.castShadow = true;
    mandapaGroup.add(mandapaBase);

    // 4 Corner Pillars
    const cornerPillars = [
      [-0.85, -0.85],
      [0.85, -0.85],
      [-0.85, 0.85],
      [0.85, 0.85],
    ];
    cornerPillars.forEach(([px, pz]) => {
      const cp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 2.8, 8),
        basaltMat
      );
      cp.position.set(px, 1.8, pz);
      cp.castShadow = true;
      mandapaGroup.add(cp);
    });

    // Tiered Pyramidal Roof (Stepped Shikhara)
    for (let t = 0; t < 3; t++) {
      const stepWidth = 2.6 - t * 0.6;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth, 0.4, stepWidth),
        basaltMat
      );
      step.position.y = 3.3 + t * 0.4;
      step.castShadow = true;
      mandapaGroup.add(step);
    }

    const mandapaFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      goldMat
    );
    mandapaFinial.position.y = 4.6;
    mandapaGroup.add(mandapaFinial);

    heritageGroup.add(mandapaGroup);

    // E. Atmospheric Dust Particles (Motes catching sunbeams)
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      positions[p] = (Math.random() - 0.5) * 16;
      positions[p + 1] = Math.random() * 8 - 1;
      positions[p + 2] = (Math.random() - 0.5) * 12;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xeed27c,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    heritageGroup.add(particleSystem);

    scene.add(heritageGroup);

    // -------------------------------------------------------------------------
    // Lighting Setup
    // -------------------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0x2d2822, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff3db, 2.8);
    dirLight.position.set(8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    // Inner Sanctuary Amber Point Light (Oil lamp warmth inside sanctum)
    const pointLight = new THREE.PointLight(0xffa033, 4.0, 7);
    pointLight.position.set(0, 0.4, -0.6);
    scene.add(pointLight);

    lightsRef.current = { dirLight, ambientLight, pointLight };

    setTimeout(() => {
      setIsLoading(false);
    }, 0);

    // -------------------------------------------------------------------------
    // Animation & Render Loop
    // -------------------------------------------------------------------------
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const st = controlsState.current;

      // Auto rotation when not interacting
      if (st.autoRotate && !st.isDragging) {
        st.targetRotationY += 0.003;
      }

      // Smooth dampening towards target orientation
      st.currentRotationY += (st.targetRotationY - st.currentRotationY) * 0.05;
      st.currentRotationX += (st.targetRotationX - st.currentRotationX) * 0.05;
      st.currentDistance += (st.targetDistance - st.currentDistance) * 0.06;

      // Calculate camera position in orbit
      const r = st.currentDistance;
      const phi = THREE.MathUtils.clamp(st.currentRotationX, 0.05, Math.PI / 2.2);
      const theta = st.currentRotationY;

      camera.position.x = r * Math.sin(theta) * Math.cos(phi);
      camera.position.y = r * Math.sin(phi) + 0.5;
      camera.position.z = r * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 1.2, 0);

      // Subtle particle drift
      const posAttr = particleGeo.attributes.position;
      const posArr = posAttr.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        posArr[i] -= delta * 0.15;
        if (posArr[i] < -1.5) {
          posArr[i] = 7;
        }
      }
      posAttr.needsUpdate = true;

      // Subtle lamp pulse inside sanctuary
      pointLight.intensity = 3.6 + Math.sin(clock.getElapsedTime() * 3.5) * 0.4;

      renderer.render(scene, camera);
    };

    animate();

    // -------------------------------------------------------------------------
    // Responsive Resize Observer
    // -------------------------------------------------------------------------
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      materialsRef.current.forEach((m) => m.dispose());
      stoneTexture.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [createStoneTexture, is2DFallback]);

  // ---------------------------------------------------------------------------
  // Interactive Mouse & Touch Drag Controls
  // ---------------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    controlsState.current.isDragging = true;
    controlsState.current.prevMouseX = e.clientX;
    controlsState.current.prevMouseY = e.clientY;
    controlsState.current.autoRotate = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!controlsState.current.isDragging) return;
    const deltaX = e.clientX - controlsState.current.prevMouseX;
    const deltaY = e.clientY - controlsState.current.prevMouseY;

    controlsState.current.prevMouseX = e.clientX;
    controlsState.current.prevMouseY = e.clientY;

    controlsState.current.targetRotationY -= deltaX * 0.007;
    controlsState.current.targetRotationX += deltaY * 0.005;
  };

  const handlePointerUp = () => {
    controlsState.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const st = controlsState.current;
    st.targetDistance = THREE.MathUtils.clamp(st.targetDistance + e.deltaY * 0.012, 6, 24);
  };

  // Reset Camera View
  const handleResetCamera = () => {
    const st = controlsState.current;
    st.targetRotationY = 0.25;
    st.targetRotationX = 0.2;
    st.targetDistance = 14;
    st.autoRotate = true;
    setCameraPreset('panoramic');
  };

  // Switch Camera Presets
  const applyPreset = (preset: 'panoramic' | 'pillar' | 'sanctum' | 'aerial') => {
    setCameraPreset(preset);
    const st = controlsState.current;
    st.autoRotate = false;

    if (preset === 'panoramic') {
      st.targetRotationY = 0.25;
      st.targetRotationX = 0.2;
      st.targetDistance = 14;
    } else if (preset === 'pillar') {
      st.targetRotationY = 0.95;
      st.targetRotationX = 0.35;
      st.targetDistance = 8.5;
    } else if (preset === 'sanctum') {
      st.targetRotationY = 0.0;
      st.targetRotationX = 0.12;
      st.targetDistance = 7.5;
    } else if (preset === 'aerial') {
      st.targetRotationY = 0.45;
      st.targetRotationX = 0.75;
      st.targetDistance = 18;
    }
  };

  // Switch Lighting Atmosphere
  const applyLighting = (mode: 'dawn' | 'noon' | 'twilight') => {
    setLightingMode(mode);
    const { dirLight, ambientLight, pointLight } = lightsRef.current;
    if (!dirLight || !ambientLight || !pointLight) return;

    if (mode === 'dawn') {
      dirLight.color.setHex(0xfff3db);
      dirLight.intensity = 2.8;
      dirLight.position.set(8, 12, 8);
      ambientLight.color.setHex(0x2d2822);
      ambientLight.intensity = 1.4;
      pointLight.intensity = 4.0;
    } else if (mode === 'noon') {
      dirLight.color.setHex(0xffffff);
      dirLight.intensity = 3.4;
      dirLight.position.set(2, 16, 2);
      ambientLight.color.setHex(0x3a3630);
      ambientLight.intensity = 1.8;
      pointLight.intensity = 2.0;
    } else if (mode === 'twilight') {
      dirLight.color.setHex(0xc27845);
      dirLight.intensity = 1.4;
      dirLight.position.set(-12, 4, -8);
      ambientLight.color.setHex(0x161822);
      ambientLight.intensity = 0.9;
      pointLight.intensity = 6.0;
    }
  };

  // Toggle Wireframe Analysis Mode
  const toggleWireframe = () => {
    const next = !wireframeMode;
    setWireframeMode(next);
    materialsRef.current.forEach((m) => {
      if ('wireframe' in m) {
        (m as THREE.MeshStandardMaterial).wireframe = next;
      }
    });
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#2e2923] bg-[#0c0a08] shadow-2xl">
      {/* 3D Canvas / 2D Fallback Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="relative w-full h-[380px] sm:h-[460px] lg:h-[540px] select-none cursor-grab active:cursor-grabbing overflow-hidden"
      >
        {!is2DFallback ? (
          <>
            <canvas ref={canvasRef} className="w-full h-full block" />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0908] z-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
                  <span className="text-xs font-serif text-[#ded6c5] tracking-widest uppercase">
                    Initializing Monolithic Sanctuary ...
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* 2D Heritage Architectural Plate Fallback */
          <div className="w-full h-full relative bg-[#12100e] flex flex-col items-center justify-center p-6 text-center">
            {/* Antiquarian Architectural Engraving Backdrop */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
            
            <div className="relative z-10 max-w-lg space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-[#1f1a14] border border-[#d4af37]/40 text-[#eed27c]">
                <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>2D Architectural Plate Mode Active</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage">
                  Monolithic Rock-Cut Sanctuary Facade
                </h3>
                <p className="text-xs sm:text-sm text-[#ded6c5] leading-relaxed">
                  Classical antiquarian elevation based on James Burgess (1880) architectural drawings.
                  Features the horseshoe Chaitya arch, free-standing Dhwajastambha pillar, and excavated courtyard.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#191612] border border-[#2e2923] text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-[#2e2923] pb-1.5">
                  <span className="text-[#9c9282]">Courtyard Excavation:</span>
                  <span className="font-mono text-[#eed27c]">276 ft deep × 154 ft wide</span>
                </div>
                <div className="flex justify-between border-b border-[#2e2923] pb-1.5">
                  <span className="text-[#9c9282]">Dhwajastambha Pillar:</span>
                  <span className="font-mono text-[#eed27c]">Height 49 ft (with Trisula)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9c9282]">Archival Reference:</span>
                  <span className="font-mono text-[#3ba87e]">Fergusson &amp; Burgess (1880), p. 453</span>
                </div>
              </div>

              {webglAvailable && (
                <button
                  type="button"
                  onClick={() => setIs2DFallback(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs font-semibold shadow-md transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Resume Interactive 3D Experience</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Overlay: Title & Provenance Badge */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 max-w-md pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-serif font-medium bg-[#0a0908]/85 border border-[#d4af37]/40 text-[#eed27c] backdrop-blur-md shadow-lg pointer-events-auto">
            <Sparkles className="w-3 h-3 text-[#d4af37]" />
            <span>Interactive 3D Heritage Intelligence</span>
          </div>

          <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight leading-tight drop-shadow-md">
            Monolithic Cave Sanctuary
          </h1>
          <p className="text-xs sm:text-sm text-[#ded6c5] mt-1 line-clamp-2 drop-shadow-sm">
            Exploration of Indian rock-cut architectural forms: Dhwajastambha column, Chaitya arch, and monolithic court.
          </p>
        </div>

        {/* Top Right: View Controls Toolbar */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {/* Wireframe CAD Analysis Toggle */}
          <button
            type="button"
            onClick={toggleWireframe}
            className={`p-2 rounded-xl text-xs border backdrop-blur-md transition-all shadow-md ${
              wireframeMode
                ? 'bg-[#d4af37] text-[#0a0908] border-[#d4af37]'
                : 'bg-[#0e0d0b]/80 border-[#3d372f] text-[#ded6c5] hover:border-[#d4af37]/60'
            }`}
            title="Toggle Architectural Wireframe Mesh"
            aria-label="Toggle Wireframe Mode"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Lighting Mode Switcher */}
          <button
            type="button"
            onClick={() => {
              const next = lightingMode === 'dawn' ? 'noon' : lightingMode === 'noon' ? 'twilight' : 'dawn';
              applyLighting(next);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-[#0e0d0b]/80 border border-[#3d372f] text-[#ded6c5] hover:border-[#d4af37]/60 backdrop-blur-md shadow-md transition-all"
            title={`Current Lighting: ${lightingMode}. Click to cycle.`}
            aria-label="Cycle Lighting Atmosphere"
          >
            <Sun className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="hidden sm:inline capitalize font-mono text-[11px]">{lightingMode}</span>
          </button>

          {/* Reset Camera View */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-2 rounded-xl text-xs bg-[#0e0d0b]/80 border border-[#3d372f] text-[#ded6c5] hover:border-[#d4af37]/60 backdrop-blur-md shadow-md transition-all"
            title="Reset Camera Orientation & Zoom"
            aria-label="Reset Camera View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* 2D Fallback Toggle */}
          <button
            type="button"
            onClick={() => setIs2DFallback(!is2DFallback)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border backdrop-blur-md transition-all shadow-md ${
              is2DFallback
                ? 'bg-[#d4af37] text-[#0a0908] border-[#d4af37]'
                : 'bg-[#0e0d0b]/80 border-[#3d372f] text-[#ded6c5] hover:border-[#d4af37]/60'
            }`}
            title="Switch between 3D scene and 2D architectural plate"
            aria-label="Toggle 2D Plate View"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] font-mono">
              {is2DFallback ? '3D Scene' : '2D Plate'}
            </span>
          </button>
        </div>

        {/* Bottom Left: Camera Angle Presets */}
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-10 flex flex-wrap items-center gap-1.5">
          <span className="hidden sm:inline-block text-[11px] font-mono uppercase text-[#9c9282] mr-1">
            Perspectives:
          </span>
          {[
            { id: 'panoramic', label: 'Panoramic' },
            { id: 'pillar', label: 'Pillar' },
            { id: 'sanctum', label: 'Sanctum' },
            { id: 'aerial', label: 'Aerial' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id as 'panoramic' | 'pillar' | 'sanctum' | 'aerial')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all backdrop-blur-md ${
                cameraPreset === preset.id
                  ? 'bg-[#d4af37] text-[#0a0908] font-bold shadow-md'
                  : 'bg-[#0e0d0b]/80 border border-[#2e2923] text-[#ded6c5] hover:border-[#d4af37]/50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Bottom Right: Quick Interaction Guide & 3D Lab Link */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10 flex flex-wrap items-center justify-end gap-2">
          {onExploreArchive && (
            <button
              type="button"
              onClick={onExploreArchive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif font-semibold bg-[#1a1713]/90 hover:bg-[#252019] text-[#ded6c5] border border-[#2e2923] hover:border-[#d4af37]/40 shadow-lg backdrop-blur-md transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Explore Archive</span>
            </button>
          )}

          {onOpenAssistant && (
            <button
              type="button"
              onClick={onOpenAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif font-semibold bg-[#1a1713]/90 hover:bg-[#252019] text-[#ded6c5] border border-[#2e2923] hover:border-[#d4af37]/40 shadow-lg backdrop-blur-md transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>AI Assistant</span>
            </button>
          )}

          {onInspect3DStudio && (
            <button
              type="button"
              onClick={onInspect3DStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif font-semibold bg-[#1a1713]/90 hover:bg-[#252019] text-[#eed27c] border border-[#d4af37]/40 shadow-lg backdrop-blur-md transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>3D Explorer Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Historical Provenance & Disclaimers Footer */}
      <div className="px-4 py-3 sm:px-6 bg-[#080706] border-t border-[#2e2923] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#9c9282]">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
          <span>
            <strong className="text-[#ded6c5]">Historical Provenance:</strong> Illustrative architectural study
            inspired by James Burgess (1880/1883) surveys of Western Indian rock temples. Not an archaeological laser scan.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[#3ba87e] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ba87e]" />
            Evidence-Linked Corpus
          </span>
          <span className="font-mono text-[#eed27c]">WebGL 2.0 Shader</span>
        </div>
      </div>
    </div>
  );
}

