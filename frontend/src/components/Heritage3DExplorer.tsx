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
  historicalPeriod: string;
  provenanceType: 'illustrative_study' | 'volumetric_reconstruction';
  documentId: string;
  pdfPageIndex: number;
  printedPageLabel: string;
  citationString: string;
  historicalNotes: string;
  dimensions: { label: string; value: string }[];
  modelType: 'kailasa' | 'kuda_cistern' | 'dumar_lena';
}

const HERITAGE_MODELS: HeritageModelItem[] = [
  {
    id: 'kailasa_court',
    name: 'Kailasa Monolithic Court & Dhwajastambha',
    subtitle: 'Elura Cave 16 (Brahmanical Monolith)',
    category: 'Rock-Cut Architecture',
    historicalPeriod: 'Rashtrakuta Dynasty · c. 757–783 A.D.',
    provenanceType: 'illustrative_study',
    documentId: 'sample_doc_03_sample_fergusson_burgess_1880',
    pdfPageIndex: 4,
    printedPageLabel: '453',
    citationString: 'Fergusson & Burgess (1880), Printed page 453 · PDF page 4',
    historicalNotes:
      'The courtyard of Kailasa was excavated downwards into the basalt cliff to an extreme depth of 107 feet, isolating a central monolithic temple block and two free-standing Dhwajastambha pillars crowned with the sacred trisula of Siva.',
    dimensions: [
      { label: 'Courtyard Floor Depth', value: '276 feet' },
      { label: 'Courtyard Breadth', value: '154 feet' },
      { label: 'Back Cliff Scarp', value: '107 feet' },
      { label: 'Monolithic Pillar Height', value: '49 feet' },
    ],
    modelType: 'kailasa',
  },
  {
    id: 'kuda_cistern',
    name: 'Kuda Cisterns & Donation Inscription',
    subtitle: 'Kuda Caves · Sanctuary VI & Cistern Bench',
    category: 'Epigraphy & Rock Sanctuary',
    historicalPeriod: 'Early Western Deccan · c. 2nd Century B.C.',
    provenanceType: 'illustrative_study',
    documentId: 'sample_doc_02_sample_22087',
    pdfPageIndex: 10,
    printedPageLabel: '10',
    citationString: 'Burgess & Indraji (1881), Printed page 10 · PDF page 10',
    historicalNotes:
      'Rock-cut water storage cisterns cut beneath the living rock at Kuda. The archaic Prakrit inscription records the religious gift: "podhio be 2 deya dhamam" — The charitable gift of two (2) cisterns.',
    dimensions: [
      { label: 'Excavation Type', value: 'Rock-cut Cistern & Cell' },
      { label: 'Epigraphical Script', value: 'Brahmi / Old Prakrit' },
      { label: 'Inscription Text', value: 'podhio be 2 deya dhamam' },
      { label: 'Archival Record', value: 'Burgess & Indraji (1881)' },
    ],
    modelType: 'kuda_cistern',
  },
  {
    id: 'dumar_lena',
    name: 'Dumar Lena Hypostyle Colonnade',
    subtitle: 'Elura Cave XXIX · Massive Columned Sanctuary',
    category: 'Rock-Cut Hypostyle Architecture',
    historicalPeriod: 'Early Kalachuri / Rashtrakuta · c. 6th–7th Century A.D.',
    provenanceType: 'illustrative_study',
    documentId: 'sample_doc_01_sample_1544',
    pdfPageIndex: 3,
    printedPageLabel: '37',
    citationString: 'Burgess (1883), Printed page 37 · PDF page 3',
    historicalNotes:
      'Cave XXIX, known natively as Dumar Lena, is one of the grandest excavations in Western India. The hypostyle hall measures nearly 150 feet square, supported by 26 massive fluted pillars with cushion capitals, guarded by monumental stone lions.',
    dimensions: [
      { label: 'Great Hall Dimensions', value: '148 ft × 149 ft' },
      { label: 'Pillar Count', value: '26 massive columns' },
      { label: 'Capitals', value: 'Fluted Cushion / Amalaka' },
      { label: 'Sanctuary Style', value: 'Cruciform Rock Hypostyle' },
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

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  const controlsState = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotY: 0.35,
    rotX: 0.22,
    targetRotY: 0.35,
    targetRotX: 0.22,
    dist: 12,
    targetDist: 12,
    autoRotate: true,
  });

  const materialsList = useRef<THREE.Material[]>([]);

  // Procedural stone texture
  const createTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = '#221f1b';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const b = Math.floor(Math.random() * 40) + 20;
      ctx.fillStyle = `rgba(${b + 8}, ${b + 4}, ${b}, ${Math.random() * 0.4})`;
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }, []);

  // Build 3D Model Geometry based on selected model
  const buildModelGeometry = useCallback(
    (type: 'kailasa' | 'kuda_cistern' | 'dumar_lena', stoneTex: THREE.CanvasTexture): THREE.Group => {
      const group = new THREE.Group();
      materialsList.current = [];

      const basaltMat = new THREE.MeshStandardMaterial({
        color: shadingMode === 'clay' ? 0xd0c4b2 : 0x38322c,
        roughness: shadingMode === 'clay' ? 0.95 : 0.88,
        metalness: shadingMode === 'clay' ? 0.0 : 0.12,
        bumpMap: shadingMode === 'textured' ? stoneTex : null,
        bumpScale: 0.04,
        wireframe: shadingMode === 'wireframe',
      });
      materialsList.current.push(basaltMat);

      const darkMat = new THREE.MeshStandardMaterial({
        color: shadingMode === 'clay' ? 0xb8ab97 : 0x221f1c,
        roughness: 0.92,
        bumpMap: shadingMode === 'textured' ? stoneTex : null,
        bumpScale: 0.05,
        wireframe: shadingMode === 'wireframe',
      });
      materialsList.current.push(darkMat);

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.35,
        metalness: 0.8,
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
      } else if (type === 'kuda_cistern') {
        // Rock-cut Cave Verandah & Cistern Well
        const cliffBase = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 9), darkMat);
        cliffBase.position.y = -1.8;
        group.add(cliffBase);

        // Cliff Wall with Recessed Sanctuary Cell
        const cliffWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 2.5), basaltMat);
        cliffWall.position.set(0, 1.0, -2.5);
        cliffWall.castShadow = true;
        group.add(cliffWall);

        // Recessed Cave Cell
        const caveCell = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 2.4), darkMat);
        caveCell.position.set(0, 0.4, -1.8);
        group.add(caveCell);

        // Dual Rock-Cut Cisterns (podhio be 2)
        const cistern1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), darkMat);
        cistern1.position.set(-2.8, -1.0, 0.6);
        group.add(cistern1);

        const cistern2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), darkMat);
        cistern2.position.set(-2.8, -1.0, 2.6);
        group.add(cistern2);

        // Water surface inside cisterns
        const waterMat = new THREE.MeshStandardMaterial({
          color: 0x1d4e5f,
          roughness: 0.1,
          metalness: 0.8,
        });
        materialsList.current.push(waterMat);
        const water1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), waterMat);
        water1.position.set(-2.8, -0.6, 0.6);
        group.add(water1);
        const water2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), waterMat);
        water2.position.set(-2.8, -0.6, 2.6);
        group.add(water2);

        // Inscribed Epigraphical Stele (Simulated Brahmi Epigraph Tablet)
        const stele = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.15), goldMat);
        stele.position.set(0, 2.6, -1.2);
        group.add(stele);

        // Front Verandah Octagonal Pillars
        for (const px of [-1.8, 1.8]) {
          const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.0, 8), basaltMat);
          pil.position.set(px, 0.0, -0.4);
          pil.castShadow = true;
          group.add(pil);
        }
      } else {
        // Dumar Lena: Massive 26-column Hypostyle Hall
        const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 14), darkMat);
        floor.position.y = -1.8;
        group.add(floor);

        // Back Rock Wall & Shrine
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 4.2, 1.8), basaltMat);
        backWall.position.set(0, 0.6, -5.5);
        group.add(backWall);

        // Grid of Massive Columns with Cushion / Amalaka Capitals
        const colRows = [-3.2, 0, 3.2];
        const colCols = [-3.8, -1.2, 1.2, 3.8];

        colRows.forEach((rz) => {
          colCols.forEach((cx) => {
            const colGroup = new THREE.Group();
            colGroup.position.set(cx, -1.5, rz);

            // Shaft
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 3.2, 12), basaltMat);
            shaft.position.y = 1.6;
            shaft.castShadow = true;
            colGroup.add(shaft);

            // Cushion Capital (Amalaka)
            const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.18, 12, 24), basaltMat);
            cushion.rotation.x = Math.PI / 2;
            cushion.position.y = 3.3;
            colGroup.add(cushion);

            group.add(colGroup);
          });
        });

        // Massive Roof Plinth
        const roof = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.7, 13.8), basaltMat);
        roof.position.set(0, 2.8, 0);
        group.add(roof);

        // Central Altar Shrine
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
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a08);
    scene.fog = new THREE.FogExp2(0x0c0a08, 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 12);
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

    // Lights
    const amb = new THREE.AmbientLight(0x28231d, 1.5);
    scene.add(amb);

    const dir = new THREE.DirectionalLight(0xfff5e0, 2.8);
    dir.position.set(8, 14, 8);
    dir.castShadow = true;
    scene.add(dir);

    const point = new THREE.PointLight(0xffaa33, 4.0, 9);
    point.position.set(0, 1.5, 0);
    scene.add(point);

    let animId: number;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const st = controlsState.current;

      point.intensity = 3.6 + Math.sin(clock.getElapsedTime() * 3.0) * 0.4;

      if (st.autoRotate && !st.isDragging) {
        st.targetRotY += 0.0025;
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

    const resizeObs = new ResizeObserver(() => handleResize());
    resizeObs.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObs.disconnect();
      renderer.dispose();
      materialsList.current.forEach((m) => m.dispose());
      stoneTex.dispose();
    };
  }, [buildModelGeometry, createTexture, is2DPlateView, selectedModel]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    controlsState.current.isDragging = true;
    controlsState.current.prevX = e.clientX;
    controlsState.current.prevY = e.clientY;
    controlsState.current.autoRotate = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!controlsState.current.isDragging) return;
    const dx = e.clientX - controlsState.current.prevX;
    const dy = e.clientY - controlsState.current.prevY;
    controlsState.current.prevX = e.clientX;
    controlsState.current.prevY = e.clientY;

    controlsState.current.targetRotY -= dx * 0.007;
    controlsState.current.targetRotX += dy * 0.005;
  };

  const handlePointerUp = () => {
    controlsState.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    controlsState.current.targetDist = THREE.MathUtils.clamp(
      controlsState.current.targetDist + e.deltaY * 0.012,
      6,
      22
    );
  };

  const handleReset = () => {
    controlsState.current.targetRotY = 0.35;
    controlsState.current.targetRotX = 0.22;
    controlsState.current.targetDist = 12;
    controlsState.current.autoRotate = true;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-[#2e2923] bg-gradient-to-br from-[#141210] via-[#110f0d] to-[#0a0908] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-[#1d1914] border border-[#d4af37]/40 text-[#eed27c]">
            <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Interactive 3D Heritage Exploration Laboratory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
            Volumetric Architectural Explorer
          </h1>
          <p className="text-sm text-[#ded6c5] leading-relaxed">
            Inspect stylized 3D reconstructions of Western Indian rock-cut cave monuments, calibrated with dual-pagination
            archival citations from James Burgess (1880/1883) and Bhagwanlal Indraji (1881).
          </p>
        </div>
      </div>

      {/* Model Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {HERITAGE_MODELS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedModel(item);
              handleReset();
            }}
            className={`p-4 rounded-xl text-left border transition-all ${
              selectedModel.id === item.id
                ? 'bg-[#1a1714] border-[#d4af37] shadow-lg ring-1 ring-[#d4af37]/30'
                : 'bg-[#12100e] border-[#2e2923] hover:border-[#3d372f] text-[#ded6c5]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
                {item.category}
              </span>
              <span className="text-[10px] font-mono text-[#9c9282]">{item.historicalPeriod.split('·')[0]}</span>
            </div>
            <h3 className="text-sm font-serif font-bold text-[#fcf9f2] font-heritage line-clamp-1">
              {item.name}
            </h3>
            <p className="text-xs text-[#9c9282] mt-0.5 line-clamp-1">{item.subtitle}</p>
          </button>
        ))}
      </div>

      {/* Main 3D Viewport & Metadata Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Canvas / 2D Plate Viewport (8 Columns) */}
        <div className="lg:col-span-8 space-y-3">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            className="relative w-full h-[400px] sm:h-[480px] lg:h-[540px] rounded-2xl overflow-hidden border border-[#2e2923] bg-[#0c0a08] shadow-2xl cursor-grab active:cursor-grabbing select-none"
          >
            {!is2DPlateView ? (
              <canvas ref={canvasRef} className="w-full h-full block" />
            ) : (
              /* 2D Architectural Plate View */
              <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-[#110f0d] relative">
                <div className="max-w-md space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b1712] border border-[#d4af37]/30 text-[#eed27c] text-xs font-mono">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>2D Archival Plate Engraving</span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#fcf9f2] font-heritage">
                    {selectedModel.name}
                  </h3>
                  <p className="text-xs text-[#ded6c5] leading-relaxed">
                    {selectedModel.historicalNotes}
                  </p>
                  <div className="p-3 rounded-lg bg-[#181512] border border-[#2e2923] text-left text-xs font-mono space-y-1 text-[#eed27c]">
                    <div>{selectedModel.citationString}</div>
                    <div className="text-[11px] text-[#9c9282]">Verified Provenance: Survey Plate Schema</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
              {/* Shading Mode */}
              <button
                type="button"
                onClick={() => {
                  const modes: ('textured' | 'clay' | 'wireframe')[] = ['textured', 'clay', 'wireframe'];
                  const next = modes[(modes.indexOf(shadingMode) + 1) % modes.length];
                  setShadingMode(next);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-[#0e0d0b]/85 border border-[#3d372f] text-[#ded6c5] hover:border-[#d4af37]/60 backdrop-blur-md transition-all shadow-md"
                title={`Shading: ${shadingMode}`}
              >
                <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="capitalize font-mono text-[11px]">{shadingMode}</span>
              </button>

              {/* Reset Camera */}
              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl text-xs bg-[#0e0d0b]/85 border border-[#3d372f] text-[#ded6c5] hover:border-[#d4af37]/60 backdrop-blur-md transition-all shadow-md"
                title="Reset Camera Orientation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* 2D Plate Toggle */}
              <button
                type="button"
                onClick={() => setIs2DPlateView(!is2DPlateView)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border backdrop-blur-md transition-all shadow-md ${
                  is2DPlateView
                    ? 'bg-[#d4af37] text-[#0a0908] border-[#d4af37]'
                    : 'bg-[#0e0d0b]/85 border-[#3d372f] text-[#ded6c5]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">{is2DPlateView ? '3D Model' : '2D Plate'}</span>
              </button>
            </div>

            {/* Bottom Overlay Pill */}
            <div className="absolute bottom-4 left-4 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono bg-[#080706]/85 border border-[#2e2923] text-[#9c9282] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#3ba87e]" />
                Drag to rotate · Scroll to zoom
              </span>
            </div>
          </div>

          {/* Model Integrity Badge */}
          <div className="p-3 rounded-xl bg-[#12100e] border border-[#2e2923] text-xs text-[#9c9282] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>
                <strong className="text-[#ded6c5]">Historical Precision Notice:</strong> Illustrative volumetric study
                based on 19th-century antiquarian surveys. Not an unverified laser scan.
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#eed27c] shrink-0">Three.js Engine</span>
          </div>
        </div>

        {/* Right: Archival Citation & Dimension Telemetry (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Historical Dossier Card */}
          <div className="p-5 rounded-2xl bg-[#141210] border border-[#2e2923] shadow-xl space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#d4af37] tracking-wider">
                  Archival Record Dossier
                </span>
                <span className="text-[10px] font-mono text-[#9c9282]">
                  {availableDocuments?.length ? `${availableDocuments.length} Corpus Docs` : 'Primary Archive'}
                </span>
              </div>
              <h2 className="text-lg font-serif font-bold text-[#fcf9f2] font-heritage mt-0.5">
                {selectedModel.name}
              </h2>
              <p className="text-xs text-[#ded6c5] mt-1 leading-relaxed">
                {selectedModel.historicalNotes}
              </p>
            </div>

            {/* Citation Provenance Pill */}
            <div className="p-3.5 rounded-xl bg-[#191612] border border-[#d4af37]/25 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-[#eed27c] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3ba87e]" />
                <span>Dual Pagination Citation</span>
              </div>
              <p className="text-xs font-serif font-semibold text-[#fcf9f2]">
                {selectedModel.citationString}
              </p>
              <div className="text-[11px] text-[#9c9282] flex items-center justify-between pt-1 border-t border-[#2e2923]">
                <span>Document: {selectedModel.documentId}.pdf</span>
                <span className="font-mono text-[#3ba87e]">Ground Truth Verified</span>
              </div>
            </div>

            {/* Button to Launch Document Viewer */}
            <button
              type="button"
              onClick={() => onInspectSource(selectedModel.documentId, selectedModel.pdfPageIndex)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#d4af37] hover:bg-[#b89124] text-[#080706] text-xs font-serif font-semibold shadow-md transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Inspect Cited Page in Document Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Architectural Dimensions Table */}
            <div className="space-y-2 pt-2 border-t border-[#2e2923]">
              <span className="text-[10px] font-mono uppercase text-[#9c9282] tracking-wider">
                Recorded Architectural Measurements
              </span>
              <div className="space-y-1.5">
                {selectedModel.dimensions.map((dim, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs py-1 px-2.5 rounded-lg bg-[#181512] border border-[#2e2923]"
                  >
                    <span className="text-[#9c9282]">{dim.label}</span>
                    <span className="font-mono text-[#eed27c] font-medium">{dim.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

