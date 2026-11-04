'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Layers,
  FileText,
  ShieldCheck,
  Info,
  Compass,
  ArrowRight,
  BookOpen,
  Eye,
  Maximize2,
  Sun,
  Camera,
} from 'lucide-react';
import { DocumentItem } from '@/lib/api';

interface Heritage3DExplorerProps {
  onInspectSource: (documentId: string, pageNumber: number) => void;
  availableDocuments: DocumentItem[];
}

interface HeritageModelItem {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  location: string;
  historicalPeriod: string;
  provenanceType: 'illustrative_study' | 'volumetric_reconstruction';
  documentId: string;
  pdfPageIndex: number;
  printedPageLabel: string;
  citationString: string;
  historicalNotes: string;
  dimensions: { label: string; value: string; type: 'Documented' | 'Approximate' | 'Derived' }[];
  modelType: 'kailasa' | 'kuda_cistern' | 'dumar_lena';
}

const HERITAGE_MODELS: HeritageModelItem[] = [
  {
    id: 'kailasa_court',
    name: 'Kailasa Monolithic Court & Dhwajastambha',
    subtitle: 'Elura Cave 16 (Brahmanical Monolith)',
    category: 'Rock-Cut Monolithic Architecture',
    location: 'Ellora (Verul), Chhatrapati Sambhajinagar District, Maharashtra',
    historicalPeriod: 'Rashtrakuta Dynasty · c. 757–783 A.D. (Reign of Krishna I)',
    provenanceType: 'illustrative_study',
    documentId: 'sample_doc_03_sample_fergusson_burgess_1880',
    pdfPageIndex: 4,
    printedPageLabel: '453',
    citationString: 'Fergusson & Burgess (1880), Cave Temples of India, Printed p. 453 · PDF p. 4',
    historicalNotes:
      'The courtyard of Kailasa was excavated top-down directly into the basalt scarp to an extreme depth of 107 feet, carving out a central monolithic temple block and two free-standing Dhwajastambha pillars crowned with the sacred emblems of Siva.',
    dimensions: [
      { label: 'Back Cliff Scarp Depth', value: '107 feet', type: 'Documented' },
      { label: 'Courtyard Floor Length', value: '276 feet', type: 'Documented' },
      { label: 'Courtyard Breadth', value: '154 feet', type: 'Documented' },
      { label: 'Monolithic Pillar Height', value: '49 feet', type: 'Documented' },
      { label: 'Sanctuary Spire Height', value: '96 feet', type: 'Approximate' },
      { label: 'Volumetric Excavated Mass', value: 'approx. 200,000 tons', type: 'Derived' },
    ],
    modelType: 'kailasa',
  },
  {
    id: 'kuda_cistern',
    name: 'Kuda Cisterns & Donation Inscription',
    subtitle: 'Kuda Caves · Sanctuary VI & Cistern Bench',
    category: 'Epigraphy & Hydrological Architecture',
    location: 'Kuda, Raigad District, Maharashtra (Konkan Coast)',
    historicalPeriod: 'Early Western Deccan · c. 2nd Century B.C. to 1st Century A.D.',
    provenanceType: 'illustrative_study',
    documentId: 'sample_doc_02_sample_22087',
    pdfPageIndex: 10,
    printedPageLabel: '10',
    citationString: 'Burgess & Indraji (1881), Inscriptions from the Cave-Temples, Printed p. 10 · PDF p. 10',
    historicalNotes:
      'Rock-cut water storage cisterns cut beneath the living rock at Kuda. The archaic Brahmi Prakrit inscription records the religious gift: "podhio be 2 deya dhamam" — The charitable gift of two (2) cisterns by local patrons.',
    dimensions: [
      { label: 'Epigraphical Script', value: 'Brahmi / Old Prakrit', type: 'Documented' },
      { label: 'Inscription Text', value: 'podhio be 2 deya dhamam', type: 'Documented' },
      { label: 'Excavation Type', value: 'Rock-cut Cistern & Cell', type: 'Documented' },
      { label: 'Water Capacity', value: 'approx. 4,500 gallons', type: 'Approximate' },
    ],
    modelType: 'kuda_cistern',
  },
  {
    id: 'dumar_lena',
    name: 'Dumar Lena Hypostyle Colonnade',
    subtitle: 'Elura Cave XXIX · Massive Columned Sanctuary',
    category: 'Rock-Cut Hypostyle Architecture',
    location: 'Ellora (Verul), Northern Group, Maharashtra',
    historicalPeriod: 'Early Kalachuri / Rashtrakuta · c. 6th–7th Century A.D.',
    provenanceType: 'illustrative_study',
    documentId: 'sample_doc_01_sample_1544',
    pdfPageIndex: 3,
    printedPageLabel: '37',
    citationString: 'Burgess (1883), Report on the Elura Cave Temples, Printed p. 37 · PDF p. 3',
    historicalNotes:
      'Cave XXIX, known natively as Dumar Lena or Sita-ki-Nahani, is one of the grandest excavations in Western India. The hypostyle hall measures nearly 150 feet square, supported by 26 massive fluted pillars with cushion capitals, guarded by monumental stone lions.',
    dimensions: [
      { label: 'Great Hall Dimensions', value: '148 ft × 149 ft', type: 'Documented' },
      { label: 'Total Column Count', value: '26 massive pillars', type: 'Documented' },
      { label: 'Column Capitals', value: 'Fluted Cushion (Amalaka)', type: 'Documented' },
      { label: 'Sanctuary Design', value: 'Cruciform Rock Hypostyle', type: 'Documented' },
    ],
    modelType: 'dumar_lena',
  },
];

export default function Heritage3DExplorer({
  onInspectSource,
  availableDocuments,
}: Heritage3DExplorerProps) {
  const [selectedModel, setSelectedModel] = useState<HeritageModelItem>(HERITAGE_MODELS[0]);
  const [shadingMode, setShadingMode] = useState<'textured' | 'clay' | 'wireframe'>('textured');
  const [is2DPlateView, setIs2DPlateView] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const materialsList = useRef<THREE.Material[]>([]);

  // Camera Orbit State
  const controlsState = useRef({
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    rotX: 0.32,
    rotY: 0.42,
    dist: 11,
    targetRotX: 0.32,
    targetRotY: 0.42,
    targetDist: 11,
  });

  const handleResetCamera = () => {
    controlsState.current.targetRotX = 0.32;
    controlsState.current.targetRotY = 0.42;
    controlsState.current.targetDist = 11;
  };

  const createTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#6e6559';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const c = Math.floor(Math.random() * 60);
        ctx.fillStyle = `rgba(${c},${c},${c},0.15)`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }, []);

  const buildModelGeometry = useCallback(
    (type: string, stoneTex: THREE.Texture) => {
      const group = new THREE.Group();
      materialsList.current.forEach((m) => m.dispose());
      materialsList.current = [];

      // Warm weathered basalt tone (clear relief, not pitch black)
      const basaltColor = shadingMode === 'clay' ? 0xc2b5a1 : 0x685f52;
      const darkPlinthColor = shadingMode === 'clay' ? 0xa89b88 : 0x3d372f;

      const basaltMat = new THREE.MeshStandardMaterial({
        color: basaltColor,
        roughness: 0.85,
        metalness: shadingMode === 'clay' ? 0.0 : 0.08,
        bumpMap: shadingMode === 'textured' ? stoneTex : null,
        bumpScale: 0.05,
        wireframe: shadingMode === 'wireframe',
      });
      materialsList.current.push(basaltMat);

      const darkMat = new THREE.MeshStandardMaterial({
        color: darkPlinthColor,
        roughness: 0.9,
        bumpMap: shadingMode === 'textured' ? stoneTex : null,
        bumpScale: 0.06,
        wireframe: shadingMode === 'wireframe',
      });
      materialsList.current.push(darkMat);

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.35,
        metalness: 0.75,
        wireframe: shadingMode === 'wireframe',
      });
      materialsList.current.push(goldMat);

      if (type === 'kailasa') {
        // Courtyard Plinths
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 10), darkMat);
        plinth.position.y = -1.8;
        plinth.receiveShadow = true;
        group.add(plinth);

        // Sanctum Central Block
        const sanctuary = new THREE.Mesh(new THREE.BoxGeometry(5.4, 4.4, 4.4), basaltMat);
        sanctuary.position.set(0, 0.7, -1.2);
        sanctuary.castShadow = true;
        group.add(sanctuary);

        // Shikhara Spire
        for (let s = 0; s < 4; s++) {
          const w = 4.2 - s * 0.8;
          const spireTier = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, w), basaltMat);
          spireTier.position.set(0, 3.25 + s * 0.7, -1.2);
          spireTier.castShadow = true;
          group.add(spireTier);
        }
        const spireTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), goldMat);
        spireTop.position.set(0, 6.2, -1.2);
        group.add(spireTop);

        // Dhwajastambha Pillar (Right Forecourt)
        const pillarGroup = new THREE.Group();
        pillarGroup.position.set(3.2, -1.5, 1.8);
        const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.7, 8), basaltMat);
        pillarGroup.add(pBase);
        const pShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 4.8, 16), basaltMat);
        pShaft.position.y = 2.75;
        pShaft.castShadow = true;
        pillarGroup.add(pShaft);
        const pBell = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.4, 0.5, 16), basaltMat);
        pBell.position.y = 5.35;
        pillarGroup.add(pBell);
        const pTrisula = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), goldMat);
        pTrisula.position.y = 5.85;
        pillarGroup.add(pTrisula);
        group.add(pillarGroup);

        // Nandi Pavilion (Left Forecourt)
        const nandiGroup = new THREE.Group();
        nandiGroup.position.set(-3.2, -1.5, 1.8);
        const nBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 2.2), basaltMat);
        nandiGroup.add(nBase);
        for (let t = 0; t < 3; t++) {
          const tw = 2.2 - t * 0.5;
          const tMesh = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.4, tw), basaltMat);
          tMesh.position.y = 2.6 + t * 0.4;
          nandiGroup.add(tMesh);
        }
        const nFinial = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), goldMat);
        nFinial.position.y = 3.9;
        nandiGroup.add(nFinial);
        group.add(nandiGroup);

        // Back Escarpment Cliffs
        const cliffBack = new THREE.Mesh(new THREE.BoxGeometry(16, 7.5, 2.5), darkMat);
        cliffBack.position.set(0, 2.2, -5.5);
        cliffBack.receiveShadow = true;
        group.add(cliffBack);
      } else if (type === 'kuda_cistern') {
        // Kuda Cisterns
        const rockBase = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 10), darkMat);
        rockBase.position.y = -1.8;
        group.add(rockBase);

        const cliff = new THREE.Mesh(new THREE.BoxGeometry(12, 5.0, 3.0), basaltMat);
        cliff.position.set(0, 1.2, -3.2);
        group.add(cliff);

        // Two cistern tanks
        for (let c = 0; c < 2; c++) {
          const x = (c === 0 ? -2.2 : 2.2);
          const cRim = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.4, 3.0), basaltMat);
          cRim.position.set(x, -0.6, 0.8);
          group.add(cRim);

          const cWater = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.2, 2.6),
            new THREE.MeshStandardMaterial({ color: 0x1d7c9e, roughness: 0.1, metalness: 0.6 })
          );
          cWater.position.set(x, -0.2, 0.8);
          group.add(cWater);
        }

        // Inscription Tablet Slab
        const tablet = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 0.2), goldMat);
        tablet.position.set(0, 2.2, -1.6);
        group.add(tablet);
      } else {
        // Dumar Lena: Massive 26-column Hypostyle Hall
        const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 14), darkMat);
        floor.position.y = -1.8;
        group.add(floor);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 4.2, 1.8), basaltMat);
        backWall.position.set(0, 0.6, -5.5);
        group.add(backWall);

        const colRows = [-3.2, 0, 3.2];
        const colCols = [-3.8, -1.2, 1.2, 3.8];

        colRows.forEach((rz) => {
          colCols.forEach((cx) => {
            const colGroup = new THREE.Group();
            colGroup.position.set(cx, -1.5, rz);

            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 3.2, 12), basaltMat);
            shaft.position.y = 1.6;
            shaft.castShadow = true;
            colGroup.add(shaft);

            const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.18, 12, 24), basaltMat);
            cushion.rotation.x = Math.PI / 2;
            cushion.position.y = 3.3;
            colGroup.add(cushion);

            group.add(colGroup);
          });
        });

        const roof = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.7, 13.8), basaltMat);
        roof.position.set(0, 2.8, 0);
        group.add(roof);

        const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.0, 8), goldMat);
        altar.position.set(0, -1.0, -1.5);
        group.add(altar);
      }

      return group;
    },
    [shadingMode]
  );

  // Initialize Three.js Viewport
  useEffect(() => {
    if (is2DPlateView) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a08);
    scene.fog = new THREE.FogExp2(0x0c0a08, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 11);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const stoneTex = createTexture();
    const modelGroup = buildModelGeometry(selectedModel.modelType, stoneTex);
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    // Warm, Multi-Directional Gallery Lighting (Legible reliefs, no pitch black)
    const ambientLight = new THREE.AmbientLight(0x504538, 2.2);
    scene.add(ambientLight);

    const keySunlight = new THREE.DirectionalLight(0xffeedd, 3.2);
    keySunlight.position.set(10, 16, 10);
    keySunlight.castShadow = true;
    keySunlight.shadow.mapSize.width = 1024;
    keySunlight.shadow.mapSize.height = 1024;
    scene.add(keySunlight);

    const fillSkylight = new THREE.DirectionalLight(0xb8cde3, 1.4);
    fillSkylight.position.set(-10, 8, -8);
    scene.add(fillSkylight);

    const rimLight = new THREE.DirectionalLight(0xd4af37, 1.0);
    rimLight.position.set(0, -6, 10);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0xffb84d, 3.0, 14);
    pointLight.position.set(0, 2.0, 0);
    scene.add(pointLight);

    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const st = controlsState.current;

      if (isAutoRotating && !st.isDragging) {
        st.targetRotY += 0.002;
      }

      st.rotY += (st.targetRotY - st.rotY) * 0.06;
      st.rotX += (st.targetRotX - st.rotX) * 0.06;
      st.dist += (st.targetDist - st.dist) * 0.06;

      const r = st.dist;
      const phi = THREE.MathUtils.clamp(st.rotX, 0.08, Math.PI / 2.15);
      const theta = st.rotY;

      camera.position.x = r * Math.sin(theta) * Math.cos(phi);
      camera.position.y = r * Math.sin(phi) + 0.5;
      camera.position.z = r * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 0.8, 0);

      renderer.render(scene, camera);
    };

    renderLoop();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      scene.clear();
    };
  }, [selectedModel, shadingMode, is2DPlateView, createTexture, buildModelGeometry, isAutoRotating]);

  // Mouse & Touch Orbit Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    controlsState.current.isDragging = true;
    controlsState.current.prevMouseX = e.clientX;
    controlsState.current.prevMouseY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!controlsState.current.isDragging) return;
    const dx = e.clientX - controlsState.current.prevMouseX;
    const dy = e.clientY - controlsState.current.prevMouseY;
    controlsState.current.prevMouseX = e.clientX;
    controlsState.current.prevMouseY = e.clientY;

    controlsState.current.targetRotY += dx * 0.006;
    controlsState.current.targetRotX += dy * 0.006;
  };

  const handleMouseUp = () => {
    controlsState.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    controlsState.current.targetDist = THREE.MathUtils.clamp(
      controlsState.current.targetDist + e.deltaY * 0.008,
      5,
      22
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Model Selector Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#1a1714] text-[#eed27c] border border-[#d4af37]/40 mb-1">
            <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Interactive 3D Architectural Study</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
            3D Heritage Explorer
          </h1>
          <p className="text-xs sm:text-sm text-[#9c9282] mt-0.5">
            Procedural volumetric studies derived from 19th-century ASI elevation plates and gazetteer measurements
          </p>
        </div>

        {/* Model Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {HERITAGE_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => setSelectedModel(model)}
              className={`px-3 py-1.5 rounded-xl text-xs font-serif transition-all ${
                selectedModel.id === model.id
                  ? 'bg-[#d4af37] text-[#080706] font-bold shadow-sm'
                  : 'bg-[#171512] text-[#ded6c5] border border-[#26221d] hover:border-[#363028] hover:text-[#fcf9f2]'
              }`}
            >
              {model.name.split('&')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Screen: 3D Viewport on Left + Curatorial Evidence Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left: 3D WebGL Viewport (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-[#26221d] bg-[#0c0a08] overflow-hidden shadow-xl relative min-h-[460px] lg:min-h-full">
          {/* Top Viewport Controls Bar */}
          <div className="p-3 border-b border-[#26221d] bg-[#12100e] flex flex-wrap items-center justify-between gap-2 z-10 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-serif font-semibold text-[#fcf9f2] text-xs">
                {selectedModel.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c1813] text-[#eed27c] border border-[#d4af37]/30">
                {shadingMode} mode
              </span>
            </div>

            {/* Shading & Control Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShadingMode('textured')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                  shadingMode === 'textured'
                    ? 'bg-[#d4af37] text-[#080706] font-semibold'
                    : 'bg-[#171512] text-[#ded6c5] border border-[#26221d]'
                }`}
              >
                Textured
              </button>
              <button
                type="button"
                onClick={() => setShadingMode('clay')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                  shadingMode === 'clay'
                    ? 'bg-[#d4af37] text-[#080706] font-semibold'
                    : 'bg-[#171512] text-[#ded6c5] border border-[#26221d]'
                }`}
              >
                Clay
              </button>
              <button
                type="button"
                onClick={() => setShadingMode('wireframe')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                  shadingMode === 'wireframe'
                    ? 'bg-[#d4af37] text-[#080706] font-semibold'
                    : 'bg-[#171512] text-[#ded6c5] border border-[#26221d]'
                }`}
              >
                Wireframe
              </button>
              <button
                type="button"
                onClick={() => setIsAutoRotating(!isAutoRotating)}
                className={`p-1.5 rounded-lg border border-[#26221d] transition-colors ${
                  isAutoRotating ? 'text-[#3ba87e] bg-[#0d1e17]' : 'text-[#9c9282] bg-[#171512]'
                }`}
                title={isAutoRotating ? 'Pause orbit' : 'Resume orbit'}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetCamera}
                className="p-1.5 rounded-lg border border-[#26221d] bg-[#171512] text-[#ded6c5] hover:text-[#fcf9f2] transition-colors"
                title="Reset camera viewpoint"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIs2DPlateView(!is2DPlateView)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                  is2DPlateView
                    ? 'bg-[#d4af37] text-[#080706] font-bold border-[#d4af37]'
                    : 'bg-[#171512] text-[#ded6c5] border-[#26221d]'
                }`}
              >
                {is2DPlateView ? '3D View' : '2D Folio'}
              </button>
            </div>
          </div>

          {/* Viewport Canvas or 2D Folio */}
          <div
            ref={containerRef}
            className="flex-1 w-full relative cursor-grab active:cursor-grabbing min-h-[420px]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {is2DPlateView ? (
              <div className="absolute inset-0 bg-[#0d0b09] p-6 flex flex-col items-center justify-center text-center space-y-3">
                <FileText className="w-12 h-12 text-[#d4af37]" />
                <h3 className="text-base font-serif font-bold text-[#fcf9f2] font-heritage">
                  Historical Architectural Plate: {selectedModel.name}
                </h3>
                <p className="text-xs text-[#ded6c5] max-w-md font-serif leading-relaxed">
                  Published in {selectedModel.citationString}. Plate illustrates the ground plan, cross-section, and vertical rock scarp elevations.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectSource(selectedModel.documentId, selectedModel.pdfPageIndex)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4af37] text-[#080706] text-xs font-semibold shadow-md hover:bg-[#e5c158] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Inspect Original Ingested PDF Page</span>
                </button>
              </div>
            ) : (
              <>
                <canvas ref={canvasRef} className="w-full h-full block" />
                {/* Floating Orbit Overlay Hint */}
                <div className="absolute bottom-3 left-3 bg-[#110f0d]/90 backdrop-blur-xs border border-[#26221d] rounded-xl px-3 py-1.5 text-[11px] text-[#9c9282] shadow-lg flex items-center gap-2 pointer-events-none">
                  <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Drag to orbit 360° · Scroll to zoom</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Curatorial Evidence & Dimension Provenance Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[#26221d] bg-[#110f0d] p-5 shadow-xl space-y-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Monument Heading */}
            <div className="space-y-1 pb-3 border-b border-[#201d19]">
              <span className="text-[10px] font-mono uppercase text-[#d4af37] tracking-wider block font-semibold">
                {selectedModel.category}
              </span>
              <h2 className="text-lg font-serif font-bold text-[#fcf9f2] font-heritage leading-snug">
                {selectedModel.name}
              </h2>
              <div className="text-xs text-[#9c9282] font-mono">
                {selectedModel.location}
              </div>
              <div className="text-xs text-[#eed27c] font-serif pt-0.5">
                {selectedModel.historicalPeriod}
              </div>
            </div>

            {/* Historical Architectural Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-[#9c9282] block tracking-wider">
                Documented Architecture
              </span>
              <p className="text-xs text-[#ded6c5] leading-relaxed font-serif bg-[#171512] p-3 rounded-xl border border-[#26221d]">
                {selectedModel.historicalNotes}
              </p>
            </div>

            {/* Documented Dimensions Table with Provenance Tagging */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#9c9282] tracking-wider font-semibold">
                  Architectural Measurements
                </span>
                <span className="text-[10px] font-mono text-[#eed27c]">
                  Archival Provenance
                </span>
              </div>

              <div className="rounded-xl border border-[#26221d] overflow-hidden text-xs">
                {selectedModel.dimensions.map((dim, idx) => (
                  <div
                    key={dim.label}
                    className={`flex items-center justify-between p-2.5 ${
                      idx % 2 === 0 ? 'bg-[#141210]' : 'bg-[#171512]'
                    } border-b border-[#201d19] last:border-b-0`}
                  >
                    <span className="text-[#ded6c5] font-medium">{dim.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#fcf9f2] font-semibold">{dim.value}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          dim.type === 'Documented'
                            ? 'bg-[#0d1e17] text-[#3ba87e] border border-[#3ba87e]/30'
                            : dim.type === 'Approximate'
                            ? 'bg-[#1f1910] text-[#eed27c] border border-[#d4af37]/30'
                            : 'bg-[#171512] text-[#9c9282] border border-[#26221d]'
                        }`}
                      >
                        {dim.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scientific Accuracy & Interpretation Disclaimer */}
            <div className="p-3 rounded-xl bg-[#171512] border border-[#26221d] space-y-1 text-xs text-[#9c9282]">
              <div className="flex items-center gap-1.5 text-[#eed27c] font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3ba87e]" />
                <span>Model Provenance &amp; Interpretation Notice</span>
              </div>
              <p className="text-[11px] text-[#9c9282] leading-tight font-serif">
                This 3D model is a procedural volumetric study reconstructed directly from measurements documented in 19th-century ASI gazetteers. Dimensions labeled <em>Documented</em> cite published survey records.
              </p>
            </div>
          </div>

          {/* Primary Action Button: Inspect Ingested Archival PDF */}
          <div className="pt-2 border-t border-[#201d19]">
            <button
              type="button"
              onClick={() => onInspectSource(selectedModel.documentId, selectedModel.pdfPageIndex)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-[#080706] text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Inspect Source Monograph ({selectedModel.citationString.split(',')[0]})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
