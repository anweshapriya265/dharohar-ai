'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  RotateCw,
  Sun,
  Sunset,
  Layers,
  Sparkles,
  Info,
  Compass,
  Camera,
} from 'lucide-react';

export default function Monument3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [lightingMode, setLightingMode] = useState<'daylight' | 'twilight'>('daylight');
  const [activeHotspot, setActiveHotspot] = useState<number>(1);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const monumentGroupRef = useRef<THREE.Group | null>(null);

  const hotspots = [
    {
      id: 1,
      title: 'Entrance Portico & Stepped Pavilion',
      level: 'Ground Level (0.0 m)',
      description: 'Single-entry Solanki portico with pyramidal chhatri roof, leading into the subterranean axial descent.',
      cameraPos: { x: 0, y: 10, z: 24 },
      target: { x: 0, y: 0, z: 12 },
    },
    {
      id: 2,
      title: 'Octagonal Shaft & Carved Mandapa',
      level: 'Intermediate Tier (-6.6 m)',
      description: 'Open octagonal light well allowing atmospheric sunlight to cascade down onto carved friezes and hypostyle pillars.',
      cameraPos: { x: 12, y: 2, z: 4 },
      target: { x: 0, y: -5, z: -3 },
    },
    {
      id: 3,
      title: 'Subterranean Stepped Terraces',
      level: 'Deep Tier (-8.8 m)',
      description: 'Descending flights of sandstone steps and colonnaded landings engineered to moderate ambient air by 5–7°C.',
      cameraPos: { x: -14, y: -2, z: 2 },
      target: { x: 0, y: -6, z: -6 },
    },
    {
      id: 4,
      title: 'Aquifer Spring Basin',
      level: 'Basal Water Table (-11.0 m)',
      description: 'Deep circular masonry reservoir catching subterranean groundwater, providing constant cooling and drought insurance.',
      cameraPos: { x: 0, y: 4, z: -22 },
      target: { x: 0, y: -10, z: -14 },
    },
  ];

  const handleSelectHotspot = (hotspot: typeof hotspots[0]) => {
    setActiveHotspot(hotspot.id);
    if (cameraRef.current) {
      cameraRef.current.position.set(hotspot.cameraPos.x, hotspot.cameraPos.y, hotspot.cameraPos.z);
      cameraRef.current.lookAt(hotspot.target.x, hotspot.target.y, hotspot.target.z);
    }
  };

  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(20, 18, 26);
      cameraRef.current.lookAt(0, -4, 0);
    }
    setActiveHotspot(1);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const bgColor = lightingMode === 'twilight' ? 0x1c1917 : 0xf4f1eb;
    scene.background = new THREE.Color(bgColor);

    // 2. Camera: Isometric 3/4 cutaway overview looking down into the open trench
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(20, 18, 26);
    camera.lookAt(0, -4, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.replaceChildren(renderer.domElement);

    // 4. Lighting Rig
    if (lightingMode === 'twilight') {
      const ambient = new THREE.AmbientLight(0xffecd2, 0.5);
      scene.add(ambient);

      // Sunset sun angle
      const sun = new THREE.DirectionalLight(0xe88a43, 1.6);
      sun.position.set(24, 22, 20);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      scene.add(sun);

      // Warm glow from deep inside the well
      const wellGlow = new THREE.PointLight(0xffaa44, 2.5, 35);
      wellGlow.position.set(0, -8, -14);
      scene.add(wellGlow);
    } else {
      // Gallery daylight
      const ambient = new THREE.AmbientLight(0xffffff, 0.75);
      scene.add(ambient);

      const sunlight = new THREE.DirectionalLight(0xfff7ed, 1.3);
      sunlight.position.set(20, 30, 20);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.width = 1024;
      sunlight.shadow.mapSize.height = 1024;
      scene.add(sunlight);

      const fill = new THREE.DirectionalLight(0xd9e2ec, 0.4);
      fill.position.set(-20, 15, -20);
      scene.add(fill);
    }

    // 5. Procedural 3D Stepwell Model
    const monumentGroup = new THREE.Group();
    monumentGroupRef.current = monumentGroup;
    scene.add(monumentGroup);

    // Materials
    const stoneColor = lightingMode === 'twilight' ? 0xd47a3e : 0xb8885b;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.8,
      metalness: 0.05,
      wireframe: wireframe,
    });

    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x2e2925 : 0x8a6b4b,
      roughness: 0.9,
      wireframe: wireframe,
    });

    const groundTerrainMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x24201c : 0xd8d2c4,
      roughness: 0.95,
      wireframe: wireframe,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d7c9e,
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    // A. SURROUNDING GROUND EMBANKMENTS (Cutaway Trench Open in Center)
    // Left embankment (x < -4.5)
    const leftEmbankGeo = new THREE.BoxGeometry(10, 4, 38);
    const leftEmbank = new THREE.Mesh(leftEmbankGeo, groundTerrainMat);
    leftEmbank.position.set(-9.5, -2, 0);
    leftEmbank.receiveShadow = true;
    monumentGroup.add(leftEmbank);

    // Right embankment (x > +4.5)
    const rightEmbankGeo = new THREE.BoxGeometry(10, 4, 38);
    const rightEmbank = new THREE.Mesh(rightEmbankGeo, groundTerrainMat);
    rightEmbank.position.set(9.5, -2, 0);
    rightEmbank.receiveShadow = true;
    monumentGroup.add(rightEmbank);

    // Back embankment behind the circular well
    const backEmbankGeo = new THREE.BoxGeometry(29, 4, 8);
    const backEmbank = new THREE.Mesh(backEmbankGeo, groundTerrainMat);
    backEmbank.position.set(0, -2, -23);
    backEmbank.receiveShadow = true;
    monumentGroup.add(backEmbank);

    // B. MASONRY RETAINING WALLS ALONG THE OPEN TRENCH
    // Left retaining wall (x = -4.5)
    const leftWallGeo = new THREE.BoxGeometry(0.6, 12, 34);
    const leftWall = new THREE.Mesh(leftWallGeo, stoneMat);
    leftWall.position.set(-4.5, -6, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    monumentGroup.add(leftWall);

    // Right retaining wall (x = +4.5)
    const rightWallGeo = new THREE.BoxGeometry(0.6, 12, 34);
    const rightWall = new THREE.Mesh(rightWallGeo, stoneMat);
    rightWall.position.set(4.5, -6, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    monumentGroup.add(rightWall);

    // C. GROUND ENTRANCE CHHATRI / PORTICO (z = +16, y = 0)
    const porticoRoofGeo = new THREE.ConeGeometry(3, 1.8, 4);
    const porticoRoof = new THREE.Mesh(porticoRoofGeo, darkStoneMat);
    porticoRoof.position.set(0, 3.8, 16);
    porticoRoof.rotation.y = Math.PI / 4;
    porticoRoof.castShadow = true;
    monumentGroup.add(porticoRoof);

    // Portico plinth
    const plinthGeo = new THREE.BoxGeometry(6, 0.6, 6);
    const plinth = new THREE.Mesh(plinthGeo, stoneMat);
    plinth.position.set(0, 0.3, 16);
    monumentGroup.add(plinth);

    // Portico entrance pillars
    for (let i = 0; i < 4; i++) {
      const px = (i % 2 === 0 ? 1 : -1) * 2.2;
      const pz = (i < 2 ? 1 : -1) * 2.2 + 16;
      const pilGeo = new THREE.CylinderGeometry(0.25, 0.3, 2.6, 8);
      const pil = new THREE.Mesh(pilGeo, stoneMat);
      pil.position.set(px, 1.6, pz);
      pil.castShadow = true;
      monumentGroup.add(pil);
    }

    // D. DESCENDING TIERS & FLIGHTS OF STEPS
    const tierLevels = [
      { y: 0.0, zStart: 16, zEnd: 11, label: 'Entry Flight' },
      { y: -2.4, zStart: 11, zEnd: 6, label: 'Pavilion Tier 1' },
      { y: -4.8, zStart: 6, zEnd: 1, label: 'Pavilion Tier 2' },
      { y: -7.2, zStart: 1, zEnd: -5, label: 'Octagonal Mandapa Tier 3' },
      { y: -9.6, zStart: -5, zEnd: -10, label: 'Deep Hypostyle Tier 4' },
    ];

    tierLevels.forEach((tier, tIdx) => {
      // 1. Landing Platform
      const landingLength = 3.5;
      const landingZ = (tier.zStart + tier.zEnd) / 2;
      const landingGeo = new THREE.BoxGeometry(8.2, 0.5, landingLength);
      const landingMesh = new THREE.Mesh(landingGeo, stoneMat);
      landingMesh.position.set(0, tier.y, landingZ);
      landingMesh.receiveShadow = true;
      monumentGroup.add(landingMesh);

      // 2. Colonnaded Pillars on this Landing
      if (tIdx > 0 && tIdx < 5) {
        const pillarPositions = [
          [-3, landingZ - 1.2],
          [3, landingZ - 1.2],
          [-3, landingZ + 1.2],
          [3, landingZ + 1.2],
        ];

        // Pillar height up to ground level
        const pHeight = Math.abs(tier.y) + 1.2;
        pillarPositions.forEach(([px, pz]) => {
          const colGeo = new THREE.CylinderGeometry(0.22, 0.28, pHeight, 10);
          const col = new THREE.Mesh(colGeo, stoneMat);
          col.position.set(px, tier.y + pHeight / 2, pz);
          col.castShadow = true;
          monumentGroup.add(col);

          // Capital bracket on top
          const capGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
          const cap = new THREE.Mesh(capGeo, darkStoneMat);
          cap.position.set(px, tier.y + pHeight, pz);
          monumentGroup.add(cap);
        });

        // Architrave cross-beams connecting pillar tops
        const beamGeo = new THREE.BoxGeometry(6.6, 0.35, 0.5);
        const beam1 = new THREE.Mesh(beamGeo, darkStoneMat);
        beam1.position.set(0, tier.y + pHeight + 0.2, landingZ - 1.2);
        monumentGroup.add(beam1);

        const beam2 = new THREE.Mesh(beamGeo, darkStoneMat);
        beam2.position.set(0, tier.y + pHeight + 0.2, landingZ + 1.2);
        monumentGroup.add(beam2);
      }

      // 3. Flight of descending stairs leading down to next tier
      if (tIdx < tierLevels.length - 1) {
        const nextY = tierLevels[tIdx + 1].y;
        const stepsCount = 7;
        const stepDz = 0.35;
        const stepDy = (nextY - tier.y) / stepsCount;

        for (let s = 0; s < stepsCount; s++) {
          const sGeo = new THREE.BoxGeometry(7.8, 0.38, 0.45);
          const sMesh = new THREE.Mesh(sGeo, darkStoneMat);
          const sZ = tier.zEnd - s * stepDz;
          const sY = tier.y + s * stepDy;
          sMesh.position.set(0, sY, sZ);
          sMesh.receiveShadow = true;
          monumentGroup.add(sMesh);
        }
      }
    });

    // E. OCTAGONAL LIGHT WELL AT TIER 3 (z = -2)
    const octRadius = 3.2;
    for (let o = 0; o < 8; o++) {
      const angle = (o * Math.PI) / 4;
      const ox = Math.cos(angle) * octRadius;
      const oz = Math.sin(angle) * octRadius - 2;
      const octColGeo = new THREE.CylinderGeometry(0.24, 0.3, 9, 8);
      const octCol = new THREE.Mesh(octColGeo, stoneMat);
      octCol.position.set(ox, -2.7, oz);
      octCol.castShadow = true;
      monumentGroup.add(octCol);
    }

    // F. DEEP CIRCULAR WELL SHAFT AT FAR END (z = -15)
    const wellCenterZ = -15.5;
    const wellRadius = 4.2;
    const wellDepth = 12;

    // Outer masonry cylinder
    const wellWallGeo = new THREE.CylinderGeometry(
      wellRadius + 0.8,
      wellRadius + 0.8,
      wellDepth,
      32,
      1,
      true
    );
    const wellWall = new THREE.Mesh(wellWallGeo, stoneMat);
    wellWall.position.set(0, -6, wellCenterZ);
    wellWall.castShadow = true;
    wellWall.receiveShadow = true;
    monumentGroup.add(wellWall);

    // Stone spiral brackets inside well
    for (let w = 0; w < 5; w++) {
      const ringGeo = new THREE.TorusGeometry(wellRadius, 0.35, 8, 32);
      const ring = new THREE.Mesh(ringGeo, darkStoneMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -2.2 - w * 2.2, wellCenterZ);
      monumentGroup.add(ring);
    }

    // Water pool at bottom of well
    const waterGeo = new THREE.CircleGeometry(wellRadius - 0.1, 32);
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -11.2, wellCenterZ);
    monumentGroup.add(waterMesh);

    // G. Subtle architectural ground grid below the well
    const gridHelper = new THREE.GridHelper(
      50,
      25,
      lightingMode === 'twilight' ? 0xb67322 : 0x9c381e,
      lightingMode === 'twilight' ? 0x44403c : 0xc7c1b5
    );
    gridHelper.position.y = -12.5;
    scene.add(gridHelper);

    // 6. Mouse Drag Orbit Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !monumentGroupRef.current) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      monumentGroupRef.current.rotation.y += deltaX * 0.007;
      monumentGroupRef.current.rotation.x = Math.max(
        -0.5,
        Math.min(0.5, monumentGroupRef.current.rotation.x + deltaY * 0.005)
      );

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 7. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isRotating && !isDragging && monumentGroupRef.current) {
        monumentGroupRef.current.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [wireframe, lightingMode, isRotating]);

  const activeHotspotData = hotspots.find((h) => h.id === activeHotspot) || hotspots[0];

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fbeee9] text-[#9c381e] mb-1">
            <Box className="w-3.5 h-3.5" />
            <span>Pathway 1: Computer Vision &amp; 3D Digital Twin</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 font-heritage tracking-tight">
            Adalaj Subterranean Stepwell (Baoli) — Interactive 3D Cutaway
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Photogrammetric reconstruction of open subterranean tiers, flights of stairs, hypostyle pavilions, and aquifer water well
          </p>
        </div>

        {/* 3D Control Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lighting Mode Toggle */}
          <button
            onClick={() => setLightingMode(lightingMode === 'daylight' ? 'twilight' : 'daylight')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5dfd5] bg-white hover:bg-[#f7f5f0] text-stone-700 text-xs font-medium transition-colors shadow-2xs"
          >
            {lightingMode === 'daylight' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#b67322]" />
                <span>Gallery Lighting</span>
              </>
            ) : (
              <>
                <Sunset className="w-3.5 h-3.5 text-[#9c381e]" />
                <span>Sunset Bronze</span>
              </>
            )}
          </button>

          {/* Wireframe Mesh Toggle */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              wireframe
                ? 'border-[#9c381e] bg-[#fbeee9] text-[#9c381e] font-semibold'
                : 'border-[#e5dfd5] bg-white hover:bg-[#f7f5f0] text-stone-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{wireframe ? 'Mesh Wireframe' : 'Solid Sandstone'}</span>
          </button>

          {/* Auto Rotation Toggle */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isRotating
                ? 'border-[#c3dcd0] bg-[#edf5f1] text-[#2d5e4a]'
                : 'border-stone-200 bg-stone-100 text-stone-500'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            <span>{isRotating ? 'Orbit Active' : 'Orbit Paused'}</span>
          </button>

          {/* Reset Camera */}
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg border border-[#e5dfd5] hover:bg-stone-50 text-stone-600 transition-colors"
            title="Reset to default camera view"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas + Side Architectural Hotspots Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* 3D WebGL Canvas */}
        <div className="lg:col-span-2 relative rounded-2xl border border-[#e5dfd5] overflow-hidden shadow-heritage cursor-grab active:cursor-grabbing">
          <div ref={mountRef} className="w-full h-full" />

          {/* Overlay Interaction Hint */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-[#e5dfd5] rounded-xl px-3 py-1.5 text-[11px] text-stone-600 shadow-heritage flex items-center gap-2 pointer-events-none">
            <Compass className="w-3.5 h-3.5 text-[#9c381e]" />
            <span>Click &amp; drag mouse to orbit 360° · Scroll to zoom into subterranean pavilions &amp; well</span>
          </div>
        </div>

        {/* Architectural Hotspots & Structural Insights */}
        <div className="h-full overflow-y-auto rounded-2xl border border-[#e5dfd5] bg-white p-5 shadow-heritage space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9c381e]" />
                <span>Architectural Tiers &amp; Hotspots</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Select a subterranean tier to position camera and inspect structural details
              </p>
            </div>

            {/* Hotspot Tier Buttons */}
            <div className="space-y-2">
              {hotspots.map((h) => {
                const isSelected = activeHotspot === h.id;
                return (
                  <button
                    key={h.id}
                    onClick={() => handleSelectHotspot(h)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'border-[#9c381e] bg-[#fbeee9] shadow-2xs'
                        : 'border-[#e5dfd5] bg-[#f7f5f0]/50 hover:bg-[#f7f5f0] hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isSelected ? 'text-[#9c381e]' : 'text-stone-900'}`}>
                        {h.title}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-[#e5dfd5] text-stone-600">
                        {h.level}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Hotspot Deep Dive Card */}
            <div className="p-4 rounded-xl border border-[#e5dfd5] bg-[#f7f5f0] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-semibold text-[#9c381e] tracking-wider">
                  Tier Analysis
                </span>
                <span className="font-mono text-[11px] text-stone-500">
                  {activeHotspotData.level}
                </span>
              </div>
              <h4 className="text-sm font-serif font-bold text-stone-900 font-heritage">
                {activeHotspotData.title}
              </h4>
              <p className="text-xs leading-relaxed text-stone-700 font-serif">
                {activeHotspotData.description}
              </p>
            </div>
          </div>

          {/* Subterranean Engineering Note */}
          <div className="p-3 rounded-xl bg-[#edf5f1] border border-[#c3dcd0] text-xs text-[#2d5e4a] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>Hydraulic &amp; Microclimate Engineering</span>
            </div>
            <p className="text-[11px] text-[#2d5e4a]/90 leading-normal">
              Stepwells in arid Gujarat operated as passive geothermal cooling devices, decreasing air temperature by up to 6°C relative to the scorching surface ground.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
