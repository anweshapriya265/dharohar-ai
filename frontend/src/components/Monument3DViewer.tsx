'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
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

  // Smooth camera interpolation targets
  const targetCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(22, 20, 28));
  const currentCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(22, 20, 28));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -4.5, 0));
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -4.5, 0));

  const hotspots = [
    {
      id: 1,
      title: 'Entrance Portico & Stepped Pavilion',
      level: 'Ground Level (0.0 m)',
      documentedDepth: '0.0 meters (Surface Datum)',
      description: 'Single-entry Solanki portico with square pillared chhatri pavilion, initiating the downward axial subterranean descent.',
      cameraPos: { x: 0, y: 8, z: 24 },
      target: { x: 0, y: 1.5, z: 14 },
    },
    {
      id: 2,
      title: 'Octagonal Shaft & Carved Mandapa',
      level: 'Intermediate Tier (-6.6 m)',
      documentedDepth: '-6.6 meters below surface',
      description: 'Open octagonal light well allowing atmospheric sunlight to cascade down onto carved sandstone friezes and hypostyle pillars.',
      cameraPos: { x: 12, y: 1, z: -2 },
      target: { x: 0, y: -5, z: -4 },
    },
    {
      id: 3,
      title: 'Subterranean Stepped Terraces',
      level: 'Deep Tier (-8.8 m)',
      documentedDepth: '-8.8 meters below surface',
      description: 'Descending flights of stepped stone terraces and colonnaded landings engineered to moderate ambient air by geothermal cooling.',
      cameraPos: { x: -14, y: 2, z: 4 },
      target: { x: 0, y: -4, z: 2 },
    },
    {
      id: 4,
      title: 'Aquifer Spring Basin & Well Shaft',
      level: 'Basal Water Table (-11.0 m)',
      documentedDepth: '-11.0 meters below surface',
      description: 'Deep circular masonry reservoir catching subterranean groundwater, providing constant community water and drought insurance.',
      cameraPos: { x: 4, y: -2, z: -23 },
      target: { x: 0, y: -9, z: -15 },
    },
  ];

  const handleSelectHotspot = (hotspot: (typeof hotspots)[0]) => {
    setActiveHotspot(hotspot.id);
    targetCameraPosRef.current.set(hotspot.cameraPos.x, hotspot.cameraPos.y, hotspot.cameraPos.z);
    targetLookAtRef.current.set(hotspot.target.x, hotspot.target.y, hotspot.target.z);
  };

  const handleResetCamera = () => {
    targetCameraPosRef.current.set(22, 20, 28);
    targetLookAtRef.current.set(0, -4.5, 0);
    setActiveHotspot(1);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDaylight = lightingMode === 'daylight';
    const bgColor = isDaylight ? 0xF0EAE1 : 0x1A1715;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, isDaylight ? 0.010 : 0.016);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.copy(currentCameraPosRef.current);
    camera.lookAt(currentLookAtRef.current);
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

    // 4. Lighting Configuration
    if (lightingMode === 'twilight') {
      const ambient = new THREE.AmbientLight(0x28201a, 1.8);
      scene.add(ambient);

      // Deep sunset directional rim light
      const duskSun = new THREE.DirectionalLight(0xd47a3e, 2.2);
      duskSun.position.set(-20, 16, 12);
      duskSun.castShadow = true;
      scene.add(duskSun);

      // Warm oil lamps / diya point lights in subterranean pavilions
      const lamp1 = new THREE.PointLight(0xffaa44, 2.2, 18);
      lamp1.position.set(0, 1.8, 15.5); // Entrance Chhatri
      scene.add(lamp1);

      const lamp2 = new THREE.PointLight(0xff9933, 2.5, 22);
      lamp2.position.set(0, -5.0, -4.0); // Octagonal Mandapa center
      scene.add(lamp2);

      const lamp3 = new THREE.PointLight(0xff8833, 2.0, 16);
      lamp3.position.set(0, -7.5, 1.0); // Tier 2 landing
      scene.add(lamp3);

      const wellGlow = new THREE.PointLight(0x44ddbb, 1.8, 20);
      wellGlow.position.set(0, -9.0, -15.0); // Water reservoir glow
      scene.add(wellGlow);
    } else {
      // Golden architectural daylight
      const ambient = new THREE.AmbientLight(0xfff6ec, 2.2);
      scene.add(ambient);

      const sunlight = new THREE.DirectionalLight(0xfff1dc, 2.8);
      sunlight.position.set(24, 32, 22);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.width = 2048;
      sunlight.shadow.mapSize.height = 2048;
      sunlight.shadow.bias = -0.0005;
      scene.add(sunlight);

      // Soft sky fill
      const fillLight = new THREE.DirectionalLight(0xdde4ec, 1.2);
      fillLight.position.set(-20, 18, -20);
      scene.add(fillLight);
    }

    // 5. Materials (Gujarat Dhrangadhra Sandstone Palette)
    const stoneColor = lightingMode === 'twilight' ? 0xb57b4c : 0xD5BE9E;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.82,
      metalness: 0.04,
      wireframe: wireframe,
    });

    const darkStoneColor = lightingMode === 'twilight' ? 0x6e4e36 : 0x8A7765;
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: darkStoneColor,
      roughness: 0.88,
      metalness: 0.05,
      wireframe: wireframe,
    });

    const ornateStoneMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0xc78b5a : 0xE6D2B8,
      roughness: 0.72,
      metalness: 0.03,
      wireframe: wireframe,
    });

    const retainingWallMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x825f46 : 0xBDAB93,
      roughness: 0.9,
      wireframe: wireframe,
    });

    const cutawayBaseMat = new THREE.MeshStandardMaterial({
      color: lightingMode === 'twilight' ? 0x3d3029 : 0x5C5248,
      roughness: 0.95,
      wireframe: wireframe,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2A7366,
      roughness: 0.08,
      metalness: 0.75,
      transparent: true,
      opacity: 0.85,
    });

    // 6. Procedural Stepwell Construction Group
    const monumentGroup = new THREE.Group();
    monumentGroupRef.current = monumentGroup;
    scene.add(monumentGroup);

    // Architectural Helper Functions:
    // A. Solanki Column with base pedestal, cylindrical shaft, and cruciform brackets
    const createSolankiPillar = (x: number, yBottom: number, height: number, z: number) => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(x, yBottom, z);

      // Base pedestal (Square carved plinth)
      const baseGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
      const baseMesh = new THREE.Mesh(baseGeo, darkStoneMat);
      baseMesh.position.y = 0.15;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      pillarGroup.add(baseMesh);

      // Main column shaft (octagonal fluted cylinder)
      const shaftHeight = Math.max(0.2, height - 0.6);
      const shaftGeo = new THREE.CylinderGeometry(0.18, 0.22, shaftHeight, 8);
      const shaftMesh = new THREE.Mesh(shaftGeo, stoneMat);
      shaftMesh.position.y = 0.3 + shaftHeight / 2;
      shaftMesh.castShadow = true;
      shaftMesh.receiveShadow = true;
      pillarGroup.add(shaftMesh);

      // Pot-and-foliage capital block
      const capitalGeo = new THREE.BoxGeometry(0.65, 0.2, 0.65);
      const capitalMesh = new THREE.Mesh(capitalGeo, ornateStoneMat);
      capitalMesh.position.y = 0.3 + shaftHeight + 0.1;
      capitalMesh.castShadow = true;
      pillarGroup.add(capitalMesh);

      // Cross-bracket arms (Solanki four-way bracket)
      const bracketArmX = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.35), ornateStoneMat);
      bracketArmX.position.y = 0.3 + shaftHeight + 0.15;
      bracketArmX.castShadow = true;
      pillarGroup.add(bracketArmX);

      const bracketArmZ = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.85), ornateStoneMat);
      bracketArmZ.position.y = 0.3 + shaftHeight + 0.15;
      bracketArmZ.castShadow = true;
      pillarGroup.add(bracketArmZ);

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

    // C. Flight of Stone Steps
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
      return flightGroup;
    };

    // --- 1. Foundational Geological Bedrock Plinth (Cutaway Base) ---
    // A clean architectural cutaway plinth at the base, never obstructing line of sight
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 42), cutawayBaseMat);
    plinth.position.set(0, -12.0, 0);
    plinth.receiveShadow = true;
    monumentGroup.add(plinth);

    // --- 2. Lateral Masonry Retaining Walls with Stringcourses & Niches ---
    // Left retaining wall (X = -4.3)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 34), retainingWallMat);
    leftWall.position.set(-4.3, -5.5, 0.5);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    monumentGroup.add(leftWall);

    // Right retaining wall (X = +4.3)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 34), retainingWallMat);
    rightWall.position.set(4.3, -5.5, 0.5);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    monumentGroup.add(rightWall);

    // Horizontal architectural stringcourse frieze bands along trench walls
    for (const h of [-2.2, -4.4, -6.6, -8.8]) {
      const leftCornice = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 33.6), ornateStoneMat);
      leftCornice.position.set(-3.9, h, 0.5);
      monumentGroup.add(leftCornice);

      const rightCornice = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 33.6), ornateStoneMat);
      rightCornice.position.set(3.9, h, 0.5);
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
      // Left niche frame
      const leftNiche = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.7), darkStoneMat);
      leftNiche.position.set(-3.95, pos.y, pos.z);
      monumentGroup.add(leftNiche);

      // Right niche frame
      const rightNiche = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.7), darkStoneMat);
      rightNiche.position.set(3.95, pos.y, pos.z);
      monumentGroup.add(rightNiche);
    }

    // --- 3. Ground Level Entrance Chhatri & Jagati (Z = +16.0, Y = 0.0) ---
    // Jagati plinth platform
    const jagati = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 5.2), darkStoneMat);
    jagati.position.set(0, 0.25, 16.0);
    jagati.receiveShadow = true;
    monumentGroup.add(jagati);

    // 4 Corner Solanki Columns for Entrance Portico
    const porticoPillars = [
      { x: -2.0, z: 14.5 },
      { x: 2.0, z: 14.5 },
      { x: -2.0, z: 17.5 },
      { x: 2.0, z: 17.5 },
    ];
    for (const p of porticoPillars) {
      monumentGroup.add(createSolankiPillar(p.x, 0.5, 2.8, p.z));
    }

    // Portico Roof Beam Structure
    monumentGroup.add(createArchitrave(0, 3.3, 14.5, 4.4, 0.25, 0.4));
    monumentGroup.add(createArchitrave(0, 3.3, 17.5, 4.4, 0.25, 0.4));
    monumentGroup.add(createArchitrave(-2.0, 3.3, 16.0, 0.4, 0.25, 3.4));
    monumentGroup.add(createArchitrave(2.0, 3.3, 16.0, 0.4, 0.25, 3.4));

    // Overhanging Chhajja eaves
    const chhajja = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 4.4), ornateStoneMat);
    chhajja.position.set(0, 3.45, 16.0);
    chhajja.castShadow = true;
    monumentGroup.add(chhajja);

    // Classical 3-tier stepped pyramidal shikhara roof
    const roofTier1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 3.6), stoneMat);
    roofTier1.position.set(0, 3.7, 16.0);
    roofTier1.castShadow = true;
    monumentGroup.add(roofTier1);

    const roofTier2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 2.6), stoneMat);
    roofTier2.position.set(0, 4.05, 16.0);
    roofTier2.castShadow = true;
    monumentGroup.add(roofTier2);

    const roofTier3 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 1.6), stoneMat);
    roofTier3.position.set(0, 4.4, 16.0);
    roofTier3.castShadow = true;
    monumentGroup.add(roofTier3);

    // Kalasha finial at apex
    const kalasha = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 0.7, 8), ornateStoneMat);
    kalasha.position.set(0, 4.95, 16.0);
    kalasha.castShadow = true;
    monumentGroup.add(kalasha);

    // --- 4. TIER 1 (Y = -2.2m): Descent Flight 1 & First Pavilion ---
    // Flight 1: from Entrance (Y = 0.0, Z = +13.5) down to Tier 1 Landing (Y = -2.2, Z = +10.2)
    monumentGroup.add(createStairFlight(0.0, -2.2, 13.5, 10.2, 5.0, 8));

    // Tier 1 Landing Platform
    const landing1 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 3.0), darkStoneMat);
    landing1.position.set(0, -2.35, 8.7);
    landing1.receiveShadow = true;
    monumentGroup.add(landing1);

    // Tier 1 Pavilion Pillars (height 2.2m up to ground level beam)
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 9.6));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 9.6));
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 7.8));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 7.8));

    // Tier 1 Overhead Cross-beams
    monumentGroup.add(createArchitrave(0, 0.05, 9.6, 4.4, 0.25, 0.4));
    monumentGroup.add(createArchitrave(0, 0.05, 7.8, 4.4, 0.25, 0.4));
    monumentGroup.add(createArchitrave(-2.0, 0.05, 8.7, 0.4, 0.25, 2.2));
    monumentGroup.add(createArchitrave(2.0, 0.05, 8.7, 0.4, 0.25, 2.2));

    // --- 5. TIER 2 (Y = -4.4m): Descent Flight 2 & Two-Storey Pavilion ---
    // Flight 2: from Tier 1 (Y = -2.2, Z = +7.3) down to Tier 2 (Y = -4.4, Z = +4.0)
    monumentGroup.add(createStairFlight(-2.2, -4.4, 7.3, 4.0, 5.0, 8));

    // Tier 2 Landing Platform
    const landing2 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 3.0), darkStoneMat);
    landing2.position.set(0, -4.55, 2.5);
    landing2.receiveShadow = true;
    monumentGroup.add(landing2);

    // Multi-storey Columns rising from -4.4m
    monumentGroup.add(createSolankiPillar(-2.0, -4.4, 2.2, 3.4));
    monumentGroup.add(createSolankiPillar(2.0, -4.4, 2.2, 3.4));
    monumentGroup.add(createSolankiPillar(-2.0, -4.4, 2.2, 1.6));
    monumentGroup.add(createSolankiPillar(2.0, -4.4, 2.2, 1.6));

    // Upper level columns continuing up to surface
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 3.4));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 3.4));
    monumentGroup.add(createSolankiPillar(-2.0, -2.2, 2.2, 1.6));
    monumentGroup.add(createSolankiPillar(2.0, -2.2, 2.2, 1.6));

    // Intermediate and Top Cross-beams for Pavilion 2
    for (const beamY of [-2.15, 0.05]) {
      monumentGroup.add(createArchitrave(0, beamY, 3.4, 4.4, 0.22, 0.35));
      monumentGroup.add(createArchitrave(0, beamY, 1.6, 4.4, 0.22, 0.35));
      monumentGroup.add(createArchitrave(-2.0, beamY, 2.5, 0.35, 0.22, 2.1));
      monumentGroup.add(createArchitrave(2.0, beamY, 2.5, 0.35, 0.22, 2.1));
    }

    // --- 6. TIER 3 (Y = -6.6m): Grand Octagonal Mandapa & Light Well Atrium ---
    // Flight 3: from Tier 2 (Y = -4.4, Z = +1.1) down to Octagonal Mandapa (Y = -6.6, Z = -2.0)
    monumentGroup.add(createStairFlight(-4.4, -6.6, 1.1, -2.0, 5.0, 8));

    // Octagonal Mandapa Base Platform
    const octFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 0.3, 8),
      darkStoneMat
    );
    octFloor.position.set(0, -6.75, -4.5);
    octFloor.receiveShadow = true;
    monumentGroup.add(octFloor);

    // 8 Grand Colonnade Pillars arranged in an octagon around open atrium (radius = 3.0m)
    const octRadius = 3.0;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const px = Math.cos(angle) * octRadius;
      const pz = -4.5 + Math.sin(angle) * octRadius;

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
        const z1 = -4.5 + Math.sin(a1) * octRadius;
        const x2 = Math.cos(a2) * octRadius;
        const z2 = -4.5 + Math.sin(a2) * octRadius;

        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const beamLen = Math.hypot(x2 - x1, z2 - z1);
        const rotY = Math.atan2(x2 - x1, z2 - z1);

        const octBeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, beamLen), ornateStoneMat);
        octBeam.position.set(mx, ringY, mz);
        octBeam.rotation.y = rotY;
        octBeam.castShadow = true;
        monumentGroup.add(octBeam);
      }
    }

    // --- 7. TIER 4 (Y = -8.8m): Descent Flight 4 & Deep Subterranean Terraces ---
    // Flight 4: from Octagonal Mandapa (Y = -6.6, Z = -7.0) down to Tier 4 (Y = -8.8, Z = -10.5)
    monumentGroup.add(createStairFlight(-6.6, -8.8, -7.0, -10.5, 4.4, 8));

    // Deep Landing Platform
    const landing4 = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.3, 2.5), darkStoneMat);
    landing4.position.set(0, -8.95, -11.7);
    landing4.receiveShadow = true;
    monumentGroup.add(landing4);

    // Deep Tier Hypostyle Pillars
    monumentGroup.add(createSolankiPillar(-1.8, -8.8, 2.2, -11.0));
    monumentGroup.add(createSolankiPillar(1.8, -8.8, 2.2, -11.0));
    monumentGroup.add(createSolankiPillar(-1.8, -8.8, 2.2, -12.4));
    monumentGroup.add(createSolankiPillar(1.8, -8.8, 2.2, -12.4));

    // --- 8. TIER 5 (Y = -11.0m): Basal Water Pool & Circular Well Shaft (Kupa) ---
    // Final descent flight leading directly into the reservoir
    monumentGroup.add(createStairFlight(-8.8, -10.8, -12.9, -14.2, 4.2, 6));

    // Deep Circular Masonry Well (Kupa) centered at (0, y, -16.5)
    const wellShaftOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 3.8, 12, 32, 1, true),
      retainingWallMat
    );
    wellShaftOuter.position.set(0, -5.5, -16.5);
    wellShaftOuter.receiveShadow = true;
    wellShaftOuter.castShadow = true;
    monumentGroup.add(wellShaftOuter);

    // Torus stone ring bands encircling well shaft
    for (const ty of [-2.5, -5.5, -8.5]) {
      const torusRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.82, 0.14, 8, 32),
        ornateStoneMat
      );
      torusRing.position.set(0, ty, -16.5);
      torusRing.rotation.x = Math.PI / 2;
      monumentGroup.add(torusRing);
    }

    // Wellhead Parapet at Ground Level
    const wellParapet = new THREE.Mesh(
      new THREE.CylinderGeometry(3.9, 3.9, 0.8, 32, 1, true),
      stoneMat
    );
    wellParapet.position.set(0, 0.4, -16.5);
    wellParapet.castShadow = true;
    monumentGroup.add(wellParapet);

    // Pulley pillars for water drawing at ground level
    monumentGroup.add(createSolankiPillar(-2.2, 0.0, 2.4, -16.5));
    monumentGroup.add(createSolankiPillar(2.2, 0.0, 2.4, -16.5));
    monumentGroup.add(createArchitrave(0, 2.45, -16.5, 4.8, 0.25, 0.35));

    // Shimmering Subterranean Water Disc Pool
    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.75, 3.75, 0.4, 32),
      waterMat
    );
    waterPool.position.set(0, -10.9, -16.5);
    monumentGroup.add(waterPool);

    // 7. Mouse Orbit Drag & Zoom Handlers
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

      monumentGroupRef.current.rotation.y += dx * 0.006;
      targetCameraPosRef.current.y = THREE.MathUtils.clamp(
        targetCameraPosRef.current.y - dy * 0.06,
        -4,
        35
      );
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.035;
      const dir = targetCameraPosRef.current.clone().sub(targetLookAtRef.current).normalize();
      const dist = targetCameraPosRef.current.distanceTo(targetLookAtRef.current);
      const newDist = THREE.MathUtils.clamp(dist + zoomFactor, 8, 55);
      targetCameraPosRef.current.copy(targetLookAtRef.current).addScaledVector(dir, newDist);
    };

    const domElement = mountRef.current;
    domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Touch support for mobile / tablets
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && monumentGroupRef.current) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        monumentGroupRef.current.rotation.y += dx * 0.008;
        targetCameraPosRef.current.y = THREE.MathUtils.clamp(
          targetCameraPosRef.current.y - dy * 0.06,
          -4,
          35
        );
      }
    };
    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: true });

    // 8. Animation & Render Loop with Smooth Camera Lerp
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation towards target (ease-in-out feel)
      currentCameraPosRef.current.lerp(targetCameraPosRef.current, 0.07);
      currentLookAtRef.current.lerp(targetLookAtRef.current, 0.07);

      camera.position.copy(currentCameraPosRef.current);
      camera.lookAt(currentLookAtRef.current);

      // Gentle auto-rotation when orbit is enabled and not manually dragging
      if (isRotating && !isDragging && monumentGroupRef.current) {
        monumentGroupRef.current.rotation.y += 0.002;
      }

      // Subtle water shimmer pulsation
      waterPool.position.y = -10.9 + Math.sin(elapsed * 1.5) * 0.04;

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
      domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
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
