'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  RotateCw,
  Sun,
  Moon,
  Layers,
  Sparkles,
  Info,
  Compass,
} from 'lucide-react';

export default function Monument3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [lightingMode, setLightingMode] = useState<'day' | 'sunset'>('sunset');
  const [activeHotspot, setActiveHotspot] = useState<number>(1);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const monumentGroupRef = useRef<THREE.Group | null>(null);

  const hotspots = [
    {
      id: 1,
      title: 'Entrance Portico & Stepped Pavilion',
      level: 'Ground Level (0.0 m)',
      description: 'Single-entry portal leading into the subterranean axial descent, framed by carved Solanki pillar capitals.',
      coords: { x: 0, y: 1.5, z: 12 },
    },
    {
      id: 2,
      title: 'Octagonal Shaft & Carved Mandapa',
      level: 'Intermediate Tier (-10.5 m)',
      description: 'Open octagonal light well allowing atmospheric illumination to cascade onto intricately carved friezes of celestial nymphs.',
      coords: { x: 0, y: -2, z: 2 },
    },
    {
      id: 3,
      title: 'Subterranean Stepped Terraces',
      level: 'Deep Tier (-18.2 m)',
      description: 'Five distinct subterranean storeys engineered to withstand immense lateral earth pressure while cooling ambient air by 5–7°C.',
      coords: { x: 0, y: -6, z: -5 },
    },
    {
      id: 4,
      title: 'Aquifer Spring Basin',
      level: 'Basal Water Table (-24.0 m)',
      description: 'Circular masonry reservoir catching natural subterranean aquifer runoff, functioning as community drought insurance.',
      coords: { x: 0, y: -10, z: -12 },
    },
  ];

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(lightingMode === 'sunset' ? 0x1c1917 : 0x0f172a);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(22, 18, 28);
    camera.lookAt(0, -4, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff1e6, lightingMode === 'sunset' ? 0.9 : 0.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(
      lightingMode === 'sunset' ? 0xf59e0b : 0xffffff,
      lightingMode === 'sunset' ? 2.2 : 1.8
    );
    dirLight.position.set(30, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-20, 10, -20);
    scene.add(fillLight);

    // 5. Procedural Stepwell Digital Twin
    const monumentGroup = new THREE.Group();
    monumentGroupRef.current = monumentGroup;
    scene.add(monumentGroup);

    // Stone Material
    const stoneColor = lightingMode === 'sunset' ? 0xd97706 : 0xb45309;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.85,
      metalness: 0.1,
      wireframe: wireframe,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.75,
    });

    // Outer Ground Level Trench
    const groundGeo = new THREE.BoxGeometry(36, 1, 48);
    const groundMesh = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.95 })
    );
    groundMesh.position.y = 2;
    groundMesh.receiveShadow = true;
    monumentGroup.add(groundMesh);

    // Stepwell excavation void: multiple stepped descending tiers
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const stepWidth = 14 - i * 1.4;
      const stepLength = 32 - i * 3.5;
      const tierHeight = 2.2;
      const tierY = -i * tierHeight;

      // Retaining side walls
      const wallGeo = new THREE.BoxGeometry(stepWidth, tierHeight, stepLength);
      const wallMesh = new THREE.Mesh(wallGeo, stoneMat);
      wallMesh.position.set(0, tierY, -i * 1.2);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      monumentGroup.add(wallMesh);

      // Carved Pillars at each tier pavilion
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

    // Basal Water Pool
    const poolGeo = new THREE.CylinderGeometry(4.5, 4.5, 1.5, 32);
    const poolMesh = new THREE.Mesh(poolGeo, waterMat);
    poolMesh.position.set(0, -tiers * 2.2, -tiers * 1.2);
    monumentGroup.add(poolMesh);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(60, 30, 0xd97706, 0x44403c);
    gridHelper.position.y = -tiers * 2.2 - 0.5;
    scene.add(gridHelper);

    // 6. Interaction controls: Simple Orbit drag
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

      monumentGroupRef.current.rotation.y += deltaX * 0.008;
      monumentGroupRef.current.rotation.x = Math.max(
        -0.5,
        Math.min(0.5, monumentGroupRef.current.rotation.x + deltaY * 0.005)
      );

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 7. Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (isRotating && monumentGroupRef.current && !isDragging) {
        monumentGroupRef.current.rotation.y += 0.003;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      domElem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [wireframe, lightingMode, isRotating]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <Box className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              Interactive 3D Monument Digital Twin (Adalaj Stepwell)
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Pathway 1 (WebGL / Three.js): Subterranean hydraulic twin reconstructing multi-storey stepwells from field observations
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shading Mode */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition-colors ${
              wireframe
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {wireframe ? 'Polygonal Mesh' : 'Solid Sandstone'}
          </button>

          {/* Lighting Toggle */}
          <button
            onClick={() => setLightingMode(lightingMode === 'sunset' ? 'day' : 'sunset')}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5"
          >
            {lightingMode === 'sunset' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Golden Hour Sun
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                Neutral Daylight
              </>
            )}
          </button>

          {/* Rotation Toggle */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition-colors ${
              isRotating
                ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-500'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            {isRotating ? 'Rotating' : 'Paused'}
          </button>
        </div>
      </div>

      {/* 3D Canvas + Hotspots HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Three.js Canvas Container */}
        <div className="lg:col-span-2 relative h-[520px] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-xs bg-stone-950">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Canvas HUD Overlay */}
          <div className="absolute top-3 left-3 z-10 p-2.5 rounded-lg bg-stone-900/85 backdrop-blur-xs border border-stone-800 text-[11px] text-stone-300 space-y-1">
            <div className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Structural Telemetry
            </div>
            <div>Orientation: North-South Axial Descent</div>
            <div>Depth: 5 Subterranean Tiers (24.0 m)</div>
            <div>Material: Dhrangadhra Sandstone</div>
            <div className="text-[10px] text-stone-400 mt-1 italic">Click and drag to rotate in 3D</div>
          </div>
        </div>

        {/* Hotspot & Architectural Inspector */}
        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h2 className="text-sm font-bold font-serif text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-700" />
              Architectural Annotations
            </h2>
            <span className="text-[11px] text-stone-400">4 Hotspots</span>
          </div>

          <div className="space-y-2.5">
            {hotspots.map((spot) => {
              const isSelected = activeHotspot === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => setActiveHotspot(spot.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-600' : 'bg-stone-400'}`} />
                      {spot.title}
                    </span>
                    <span className="font-mono text-[10px] text-stone-500">{spot.level}</span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-400 mt-1.5 text-[11px] leading-relaxed">
                    {spot.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>IITGN Explorer Insight:</strong> The octagonal shaft acts as a structural compression ring, neutralizing surrounding soil pressure while creating micro-climatic cooling during hot Gujarat summers.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

