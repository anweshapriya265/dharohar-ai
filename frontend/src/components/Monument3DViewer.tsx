'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  RotateCw,
  Sun,
  Sunset,
  Layers,
  Info,
  Compass,
  ShieldCheck,
  RotateCcw,
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
      documentedDepth: '0.0 meters (Surface Datum)',
      description: 'Single-entry Solanki portico with square pillared chhatri pavilion, initiating the downward axial subterranean descent.',
      cameraPos: { x: 0, y: 10, z: 24 },
      target: { x: 0, y: 0, z: 12 },
    },
    {
      id: 2,
      title: 'Octagonal Shaft & Carved Mandapa',
      level: 'Intermediate Tier (-6.6 m)',
      documentedDepth: '-6.6 meters below surface',
      description: 'Open octagonal light well allowing atmospheric sunlight to cascade down onto carved sandstone friezes and hypostyle pillars.',
      cameraPos: { x: 12, y: 2, z: 4 },
      target: { x: 0, y: -5, z: -3 },
    },
    {
      id: 3,
      title: 'Subterranean Stepped Terraces',
      level: 'Deep Tier (-8.8 m)',
      documentedDepth: '-8.8 meters below surface',
      description: 'Descending flights of stepped stone terraces and colonnaded landings engineered to moderate ambient air by geothermal cooling.',
      cameraPos: { x: -14, y: -2, z: 2 },
      target: { x: 0, y: -6, z: -6 },
    },
    {
      id: 4,
      title: 'Aquifer Spring Basin & Well Shaft',
      level: 'Basal Water Table (-11.0 m)',
      documentedDepth: '-11.0 meters below surface',
      description: 'Deep circular masonry reservoir catching subterranean groundwater, providing constant community water and drought insurance.',
      cameraPos: { x: 0, y: 4, z: -22 },
      target: { x: 0, y: -10, z: -14 },
    },
  ];

  const handleSelectHotspot = (hotspot: (typeof hotspots)[0]) => {
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

    const isDaylight = lightingMode === 'daylight';
    const bgColor = isDaylight ? 0xF0EAE1 : 0x1A1715;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, isDaylight ? 0.012 : 0.018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(20, 18, 26);
    camera.lookAt(0, -4, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting Setup
    if (lightingMode === 'twilight') {
      const ambient = new THREE.AmbientLight(0x3a3028, 2.0);
      scene.add(ambient);

      const sun = new THREE.DirectionalLight(0xd47a3e, 2.4);
      sun.position.set(-18, 12, 10);
      sun.castShadow = true;
      scene.add(sun);

      const wellGlow = new THREE.PointLight(0xffaa44, 2.5, 35);
      wellGlow.position.set(0, -8, -14);
      scene.add(wellGlow);
    } else {
      const ambient = new THREE.AmbientLight(0xFFF9F0, 2.4);
      scene.add(ambient);

      const sunlight = new THREE.DirectionalLight(0xFFF2DC, 2.6);
      sunlight.position.set(20, 30, 20);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.width = 1024;
      sunlight.shadow.mapSize.height = 1024;
      scene.add(sunlight);

      const fill = new THREE.DirectionalLight(0xDCE4EC, 1.2);
      fill.position.set(-20, 15, -20);
      scene.add(fill);
    }

    // 5. Procedural 3D Stepwell Model
    const monumentGroup = new THREE.Group();
    monumentGroupRef.current = monumentGroup;
    scene.add(monumentGroup);

    // Materials: Warm sandstone
    const stoneColor = lightingMode === 'twilight' ? 0xb87333 : 0xC8AD8D;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: wireframe,
    });

    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x2e2925 : 0x756D66,
      roughness: 0.9,
      wireframe: wireframe,
    });

    const groundTerrainMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x24201c : 0xEFE8DC,
      roughness: 0.95,
      wireframe: wireframe,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x52745E,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    // Surrounding Ground Embankments
    const leftEmbank = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 38), groundTerrainMat);
    leftEmbank.position.set(-9.5, -2, 0);
    leftEmbank.receiveShadow = true;
    monumentGroup.add(leftEmbank);

    const rightEmbank = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 38), groundTerrainMat);
    rightEmbank.position.set(9.5, -2, 0);
    rightEmbank.receiveShadow = true;
    monumentGroup.add(rightEmbank);

    const backEmbank = new THREE.Mesh(new THREE.BoxGeometry(29, 4, 8), groundTerrainMat);
    backEmbank.position.set(0, -2, -23);
    backEmbank.receiveShadow = true;
    monumentGroup.add(backEmbank);

    // Retaining Walls
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 34), stoneMat);
    leftWall.position.set(-4.5, -6, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    monumentGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 34), stoneMat);
    rightWall.position.set(4.5, -6, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    monumentGroup.add(rightWall);

    // Ground Entrance Chhatri
    const porticoRoof = new THREE.Mesh(new THREE.ConeGeometry(3, 1.8, 4), darkStoneMat);
    porticoRoof.position.set(0, 3.8, 16);
    porticoRoof.rotation.y = Math.PI / 4;
    monumentGroup.add(porticoRoof);

    // Octagonal Shaft
    const shaftGeo = new THREE.CylinderGeometry(4.2, 4.2, 12, 8, 1, true);
    const shaftMesh = new THREE.Mesh(shaftGeo, stoneMat);
    shaftMesh.position.set(0, -6, -3);
    monumentGroup.add(shaftMesh);

    // Basal Circular Well & Water
    const wellCylinder = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 14, 24, 1, true), darkStoneMat);
    wellCylinder.position.set(0, -7, -14);
    monumentGroup.add(wellCylinder);

    const waterDisk = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.4, 24), waterMat);
    waterDisk.position.set(0, -11.0, -14);
    monumentGroup.add(waterDisk);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (isRotating && monumentGroupRef.current) {
        monumentGroupRef.current.rotation.y += 0.002;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Mouse drag interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !monumentGroupRef.current) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      monumentGroupRef.current.rotation.y += dx * 0.005;
      if (cameraRef.current) {
        cameraRef.current.position.y = THREE.MathUtils.clamp(
          cameraRef.current.position.y - dy * 0.05,
          -5,
          40
        );
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const zoomFactor = e.deltaY * 0.04;
      cameraRef.current.position.z = THREE.MathUtils.clamp(
        cameraRef.current.position.z + zoomFactor,
        10,
        60
      );
    };

    const domElement = mountRef.current;
    domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });

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
      domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [wireframe, lightingMode, isRotating]);

  const activeHotspotData = hotspots.find((h) => h.id === activeHotspot) || hotspots[0];

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div>
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold mb-0.5">
            Subterranean Digital Twin
          </div>
          <h1 className="text-xl sm:text-2xl font-heritage font-bold text-[#642F38] tracking-tight">
            Adalaj Stepwell (Rudabai Vav) Digital Twin
          </h1>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5">
            Volumetric structural model of the 1498 CE five-storey subterranean hydraulic monument in Gandhinagar, Gujarat
          </p>
        </div>

        {/* Viewport Presets & Lighting Controls */}
        <div className="flex items-center gap-2">
          {/* Daylight / Twilight Toggle */}
          <button
            type="button"
            onClick={() => setLightingMode(lightingMode === 'daylight' ? 'twilight' : 'daylight')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] hover:bg-[#F6F1E7] text-xs font-mono transition-colors cursor-pointer"
          >
            {lightingMode === 'daylight' ? <Sun className="w-3.5 h-3.5 text-[#A67C3F]" /> : <Sunset className="w-3.5 h-3.5 text-[#642F38]" />}
            <span className="capitalize">{lightingMode} Mode</span>
          </button>

          {/* Wireframe Mode */}
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              wireframe
                ? 'bg-[#642F38] text-[#FFFCF5] font-semibold border-[#642F38]'
                : 'border-[#DED3C2] bg-[#FFFCF5] text-[#393331] hover:bg-[#F6F1E7]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{wireframe ? 'Solid' : 'Wireframe'}</span>
          </button>

          {/* Auto Rotation Toggle */}
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              isRotating
                ? 'bg-[#EDF3EF] text-[#52745E] border-[#BCD0C3]'
                : 'bg-[#FFFCF5] text-[#756D66] border-[#DED3C2] hover:bg-[#F6F1E7]'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            <span>{isRotating ? 'Orbiting' : 'Paused'}</span>
          </button>

          {/* Reset Camera View */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] hover:bg-[#F6F1E7] transition-colors cursor-pointer"
            title="Reset to default isometric overview"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas + Side Architectural Tier Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* 3D WebGL Canvas (7 cols) */}
        <div className="lg:col-span-7 relative rounded-xl border border-[#DED3C2] bg-[#FFFCF5] overflow-hidden shadow-xs cursor-grab active:cursor-grabbing min-h-[460px] lg:min-h-full">
          <div ref={mountRef} className="w-full h-full" />

          {/* Overlay Interaction Hint */}
          <div className="absolute bottom-3 left-3 bg-[#FFFCF5]/90 backdrop-blur-xs border border-[#DED3C2] rounded-lg px-2.5 py-1 text-[11px] text-[#756D66] shadow-xs flex items-center gap-1.5 pointer-events-none font-serif">
            <Compass className="w-3.5 h-3.5 text-[#A77C54]" />
            <span>Drag mouse to orbit 360° · Scroll to zoom into pavilions &amp; well</span>
          </div>
        </div>

        {/* Architectural Hotspots & Structural Insights (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs space-y-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="border-b border-[#EBE4D8] pb-3">
              <span className="text-[10px] font-mono uppercase text-[#814B52] tracking-wider block font-semibold">
                Stratified Hydraulic Architecture
              </span>
              <h2 className="text-base font-heritage font-bold text-[#642F38] pt-0.5">
                Subterranean Tiers &amp; Hotspots
              </h2>
              <p className="text-xs text-[#756D66] font-serif mt-0.5">
                Select a depth level to position camera and inspect structural details
              </p>
            </div>

            {/* Hotspot Tier Buttons */}
            <div className="space-y-2">
              {hotspots.map((h) => {
                const isSelected = activeHotspot === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelectHotspot(h)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#642F38] bg-[#FAF2F3] shadow-xs'
                        : 'border-[#DED3C2] bg-[#EFE8DC] hover:bg-[#E8E0D2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-serif ${isSelected ? 'text-[#642F38] font-bold' : 'text-[#393331]'}`}>
                        {h.title}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FFFCF5] border border-[#DED3C2] text-[#642F38]">
                        {h.level}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Hotspot Deep Dive Card */}
            <div className="p-4 rounded-lg border border-[#DED3C2] bg-[#F6F1E7] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-semibold text-[#814B52] tracking-wider">
                  Tier Analysis
                </span>
                <span className="font-mono text-[11px] text-[#756D66]">
                  {activeHotspotData.documentedDepth}
                </span>
              </div>
              <h3 className="text-sm font-heritage font-bold text-[#393331]">
                {activeHotspotData.title}
              </h3>
              <p className="text-xs leading-relaxed text-[#59524E] font-serif">
                {activeHotspotData.description}
              </p>
            </div>
          </div>

          {/* Subterranean Engineering Note & Provenance Notice */}
          <div className="space-y-2 pt-2 border-t border-[#EBE4D8]">
            <div className="p-3 rounded-lg bg-[#EDF3EF] border border-[#BCD0C3] text-xs text-[#393331] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#52745E] font-serif">
                <Info className="w-3.5 h-3.5" />
                <span>Hydraulic &amp; Microclimate Engineering</span>
              </div>
              <p className="text-[11px] text-[#59524E] leading-normal font-serif">
                Stepwells in arid Gujarat operated as passive geothermal cooling devices, decreasing air temperature by 5–7°C relative to the ambient surface ground.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F6F1E7] border border-[#DED3C2] text-[10px] text-[#756D66] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#A77C54] shrink-0" />
              <span className="font-serif">Procedural 3D cutaway representation based on published ASI field survey plans.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
