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
      description: 'Single-entry portal leading into the subterranean axial descent, framed by carved Solanki pillar capitals and lintels.',
      cameraPos: { x: 0, y: 8, z: 22 },
      target: { x: 0, y: 1, z: 10 },
    },
    {
      id: 2,
      title: 'Octagonal Shaft & Carved Mandapa',
      level: 'Intermediate Tier (-10.5 m)',
      description: 'Open octagonal light well allowing atmospheric sunlight to cascade down onto intricately carved friezes of celestial dancers and floral motifs.',
      cameraPos: { x: 12, y: 4, z: 8 },
      target: { x: 0, y: -2, z: 0 },
    },
    {
      id: 3,
      title: 'Subterranean Stepped Terraces',
      level: 'Deep Tier (-18.2 m)',
      description: 'Five distinct subterranean storeys engineered with interlocking sandstone masonry to withstand lateral earth pressure while cooling ambient air by 5–7°C.',
      cameraPos: { x: -14, y: -2, z: 2 },
      target: { x: 0, y: -6, z: -4 },
    },
    {
      id: 4,
      title: 'Aquifer Spring Basin',
      level: 'Basal Water Table (-24.0 m)',
      description: 'Circular masonry reservoir catching natural subterranean aquifer runoff, functioning as perpetual drought insurance and a community sacred cooling retreat.',
      cameraPos: { x: 0, y: -6, z: -18 },
      target: { x: 0, y: -12, z: -12 },
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
      cameraRef.current.position.set(22, 18, 28);
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

    const bgColor = lightingMode === 'twilight' ? 0x1c1917 : 0xf2eee6;
    scene.background = new THREE.Color(bgColor);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(22, 18, 28);
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
      const ambient = new THREE.AmbientLight(0xfff1e0, 0.45);
      scene.add(ambient);

      // Golden sunset sun
      const sun = new THREE.DirectionalLight(0xe88a43, 1.5);
      sun.position.set(25, 20, 25);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      scene.add(sun);

      // Deep subterranean candle-light glow
      const wellPoint = new THREE.PointLight(0xffaa44, 2.0, 30);
      wellPoint.position.set(0, -10, 0);
      scene.add(wellPoint);
    } else {
      // Natural museum gallery lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);

      const sunlight = new THREE.DirectionalLight(0xfff7ed, 1.2);
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

    // Authentic Sandstone Material
    const stoneColor = lightingMode === 'twilight' ? 0xd47a3e : 0xb8885b;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: wireframe,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2b7a9e,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8,
    });

    // Outer Ground Level
    const groundGeo = new THREE.BoxGeometry(36, 1, 48);
    const groundMesh = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({
        color: lightingMode === 'twilight' ? 0x2e2925 : 0xded8cc,
        roughness: 0.95,
      })
    );
    groundMesh.position.y = 2;
    groundMesh.receiveShadow = true;
    monumentGroup.add(groundMesh);

    // Stepwell descending tiers (5 subterranean levels)
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const stepWidth = 14 - i * 1.4;
      const stepLength = 32 - i * 3.5;
      const tierHeight = 2.2;
      const tierY = -i * tierHeight;

      // Retaining masonry side walls
      const wallGeo = new THREE.BoxGeometry(stepWidth, tierHeight, stepLength);
      const wallMesh = new THREE.Mesh(wallGeo, stoneMat);
      wallMesh.position.set(0, tierY, -i * 1.2);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      monumentGroup.add(wallMesh);

      // Carved Solanki Pillars at each pavilion level
      const pillarCount = 4;
      for (let p = 0; p < pillarCount; p++) {
        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, tierHeight * 1.5, 12);
        const pillarMesh = new THREE.Mesh(pillarGeo, stoneMat);
        const px = (p % 2 === 0 ? 1 : -1) * (stepWidth * 0.38);
        const pz = (p < 2 ? 1 : -1) * (stepLength * 0.35);
        pillarMesh.position.set(px, tierY + tierHeight * 0.5, pz - i * 1.2);
        pillarMesh.castShadow = true;
        monumentGroup.add(pillarMesh);
      }
    }

    // Basal Water Pool (Deep Aquifer)
    const poolGeo = new THREE.CylinderGeometry(4.8, 4.8, 1.5, 32);
    const poolMesh = new THREE.Mesh(poolGeo, waterMat);
    poolMesh.position.set(0, -tiers * 2.2, -tiers * 1.2);
    monumentGroup.add(poolMesh);

    // Subtle Architectural Grid Base
    const gridHelper = new THREE.GridHelper(
      60,
      30,
      lightingMode === 'twilight' ? 0xb67322 : 0x9c381e,
      lightingMode === 'twilight' ? 0x44403c : 0xc7c1b5
    );
    gridHelper.position.y = -tiers * 2.2 - 0.5;
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
            Adalaj Subterranean Stepwell (Baoli) — Interactive 3D Twin
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Photogrammetric reconstruction of subterranean tiers, hypostyle pavilions, and water table architecture
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
            <span>Click &amp; drag mouse to orbit 360° · Scroll to inspect subterranean storeys</span>
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
                Select a subterranean tier to position camera and inspect engineering details
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
