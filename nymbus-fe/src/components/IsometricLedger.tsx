"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface IsometricLedgerProps {
  onHoverCard?: (cardIndex: number | null) => void;
  activeCardIndex?: number | null;
}

// Ground aura halo to give the slab floating depth
function createGroundAuraTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 256;
  const cy = 256;
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 240);
  grad.addColorStop(0, "rgba(212, 163, 115, 0.40)"); // Warm gold glow
  grad.addColorStop(0.3, "rgba(56, 189, 248, 0.22)"); // Tech cyan aura
  grad.addColorStop(0.65, "rgba(28, 36, 52, 0.08)");
  grad.addColorStop(1, "rgba(9, 10, 13, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// High-resolution canvas texture for the 4 architectural panels
function createPanelTexture(config: {
  header: string;
  badge: string;
  badgeAccent?: boolean;
  rows?: string[];
  bodyText?: string;
  quoteAuthor?: string;
  meta: string;
  submeta?: string;
  accentColor?: string;
}): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const isGold = config.badgeAccent ?? false;
  const accent = config.accentColor || (isGold ? "#D4A373" : "#38BDF8");

  // 1. Deep Obsidian Card Plate Background
  ctx.fillStyle = "#111520";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle interior micro-grid (CAD blueprint grid)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 32; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 32; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // 2. High-precision Inset Border
  ctx.strokeStyle = isGold ? "#D4A373" : "#38BDF8";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  // Corner Caliper Ticks
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  const tick = 24;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(6, 6 + tick);
  ctx.lineTo(6, 6);
  ctx.lineTo(6 + tick, 6);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(canvas.width - 6 - tick, 6);
  ctx.lineTo(canvas.width - 6, 6);
  ctx.lineTo(canvas.width - 6, 6 + tick);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(6, canvas.height - 6 - tick);
  ctx.lineTo(6, canvas.height - 6);
  ctx.lineTo(6 + tick, canvas.height - 6);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(canvas.width - 6 - tick, canvas.height - 6);
  ctx.lineTo(canvas.width - 6, canvas.height - 6);
  ctx.lineTo(canvas.width - 6, canvas.height - 6 - tick);
  ctx.stroke();

  // 3. Header Bar
  ctx.fillStyle = isGold ? "rgba(212, 163, 115, 0.18)" : "rgba(56, 189, 248, 0.12)";
  ctx.fillRect(6, 6, canvas.width - 12, 84);

  // Status Indicator Bead
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(40, 48, 7, 0, Math.PI * 2);
  ctx.fill();

  // Header Title
  ctx.font = "bold 26px 'Geist Mono', 'SF Mono', monospace, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.fillText(config.header, 62, 48);

  // Badge Pill
  ctx.font = "bold 20px 'Geist Mono', monospace, sans-serif";
  const badgeText = config.badge;
  const badgeWidth = ctx.measureText(badgeText).width + 36;
  const badgeX = canvas.width - badgeWidth - 36;

  ctx.fillStyle = isGold ? "#D4A373" : "#38BDF8";
  ctx.beginPath();
  ctx.roundRect(badgeX, 24, badgeWidth, 48, 4);
  ctx.fill();

  ctx.fillStyle = "#090A0D";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, 48);
  ctx.textAlign = "left";

  // Dividing Hairline under Header
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, 90);
  ctx.lineTo(canvas.width - 6, 90);
  ctx.stroke();

  // 4. Content Area
  if (config.rows && config.rows.length > 0) {
    let yPos = 148;
    config.rows.forEach((row, idx) => {
      // Step pill background
      ctx.fillStyle = idx === 0 ? "rgba(212, 163, 115, 0.12)" : "rgba(255, 255, 255, 0.04)";
      ctx.strokeStyle = idx === 0 ? "#D4A373" : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(36, yPos - 30, canvas.width - 72, 68, 6);
      ctx.fill();
      ctx.stroke();

      // Step bullet bead
      ctx.fillStyle = idx === 0 ? "#D4A373" : "#64748B";
      ctx.beginPath();
      ctx.arc(70, yPos + 4, 8, 0, Math.PI * 2);
      ctx.fill();

      // Step number
      ctx.font = "bold 19px 'Geist Mono', monospace, sans-serif";
      ctx.fillStyle = idx === 0 ? "#D4A373" : "#94A3B8";
      ctx.fillText(`0${idx + 1}`, 94, yPos + 6);

      // Step text
      ctx.font = "600 23px 'Geist Sans', system-ui, sans-serif";
      ctx.fillStyle = idx === 0 ? "#FFFFFF" : "#CBD5E1";
      ctx.fillText(row, 146, yPos + 6);

      yPos += 96;
    });
  } else if (config.bodyText) {
    const isQuote = !!config.quoteAuthor;

    if (isQuote) {
      ctx.fillStyle = "rgba(212, 163, 115, 0.08)";
      ctx.fillRect(36, 116, canvas.width - 72, 230);
      ctx.fillStyle = "#D4A373";
      ctx.fillRect(36, 116, 6, 230);
    }

    ctx.font = "400 25px 'Geist Sans', system-ui, sans-serif";
    ctx.fillStyle = isQuote ? "#FFFFFF" : "#E2E8F0";

    const words = config.bodyText.split(" ");
    let line = "";
    let y = 152;
    const startX = isQuote ? 66 : 46;
    const maxWidth = canvas.width - (isQuote ? 124 : 92);
    const lineHeight = 42;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, startX, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, startX, y);

    if (config.quoteAuthor) {
      ctx.font = "bold 20px 'Geist Mono', monospace, sans-serif";
      ctx.fillStyle = "#D4A373";
      ctx.fillText(config.quoteAuthor, startX, y + 44);
    }
  }

  // 5. Footer Metadata
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, canvas.height - 68);
  ctx.lineTo(canvas.width - 6, canvas.height - 68);
  ctx.stroke();

  ctx.font = "bold 20px 'Geist Mono', monospace, sans-serif";
  ctx.fillStyle = isGold ? "#D4A373" : "#38BDF8";
  ctx.fillText(config.meta, 40, canvas.height - 34);

  if (config.submeta) {
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "right";
    ctx.fillText(config.submeta, canvas.width - 40, canvas.height - 34);
    ctx.textAlign = "left";
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

export function IsometricLedger({ onHoverCard }: IsometricLedgerProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth || 1440;
    let height = container.clientHeight || window.innerHeight || 900;
    const isMobile = width < 768;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 1000);
    // Camera looking down towards the center-right stage
    const camBaseX = isMobile ? 0 : 3.5;
    const camBaseY = isMobile ? 26 : 23;
    const camBaseZ = isMobile ? 36 : 29;
    camera.position.set(camBaseX, camBaseY, camBaseZ);
    camera.lookAt(isMobile ? 0 : 4.5, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    // 2. Main Architectural Ledger Group (Tilted Slab)
    const ledgerGroup = new THREE.Group();
    // Corrected Architectural Incline:
    // pitch (rotation.x): +20.6 deg tilts the top face towards the camera
    // yaw (rotation.y): -14.3 deg angles the slab so the near corner faces center-left
    // roll (rotation.z): +2.3 deg provides subtle dynamic axonometric balance
    ledgerGroup.rotation.x = 0.36;
    ledgerGroup.rotation.y = -0.25;
    ledgerGroup.rotation.z = 0.04;
    // Positioned in the right half of the viewport, leaving the left for typography
    ledgerGroup.position.set(isMobile ? 0 : 8.5, isMobile ? -3.5 : -0.2, 0);
    scene.add(ledgerGroup);

    // 3. Ambient Ground Glow Plane (Lifts slab off the dark ground)
    const auraTexture = createGroundAuraTexture();
    const auraGeom = new THREE.PlaneGeometry(42, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      map: auraTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const auraMesh = new THREE.Mesh(auraGeom, auraMat);
    auraMesh.rotation.x = -Math.PI / 2;
    auraMesh.position.y = -1.0;
    ledgerGroup.add(auraMesh);

    // 4. Solid Obsidian Monolith Slab Platform Base
    const slabWidth = 30;
    const slabHeight = 1.0;
    const slabDepth = 22;

    const slabTopMat = new THREE.MeshStandardMaterial({
      color: 0x151924,
      metalness: 0.5,
      roughness: 0.25,
    });
    const slabSideMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      metalness: 0.7,
      roughness: 0.3,
    });

    const slabGeom = new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth);
    const slabMaterials = [
      slabSideMat,
      slabSideMat,
      slabTopMat,
      slabSideMat,
      slabSideMat,
      slabSideMat,
    ];
    const slabMesh = new THREE.Mesh(slabGeom, slabMaterials);
    slabMesh.position.y = -slabHeight / 2;
    ledgerGroup.add(slabMesh);

    // Slab Rim Wireframe Border
    const slabEdgesGeom = new THREE.EdgesGeometry(slabGeom);
    const slabEdgesMat = new THREE.LineBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.85,
    });
    const slabEdges = new THREE.LineSegments(slabEdgesGeom, slabEdgesMat);
    slabMesh.add(slabEdges);

    // Top Surface Precision Caliper Border in Warm Gold
    const borderGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-slabWidth / 2 + 0.3, 0.12, -slabDepth / 2 + 0.3),
      new THREE.Vector3(slabWidth / 2 - 0.3, 0.12, -slabDepth / 2 + 0.3),
      new THREE.Vector3(slabWidth / 2 - 0.3, 0.12, slabDepth / 2 - 0.3),
      new THREE.Vector3(-slabWidth / 2 + 0.3, 0.12, slabDepth / 2 - 0.3),
      new THREE.Vector3(-slabWidth / 2 + 0.3, 0.12, -slabDepth / 2 + 0.3),
    ]);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0xd4a373,
      transparent: true,
      opacity: 0.95,
    });
    const borderLine = new THREE.Line(borderGeom, borderMat);
    ledgerGroup.add(borderLine);

    // Drafting Caliper Grid on Top of Slab
    const gridDivisions = 30;
    const gridHelper = new THREE.GridHelper(slabWidth - 1, gridDivisions, 0xd4a373, 0x222b3d);
    gridHelper.position.y = 0.08;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.55;
    ledgerGroup.add(gridHelper);

    // Corner Caliper Brackets
    const bracketSize = 2.2;
    const corners = [
      { x: -slabWidth / 2 + 0.3, z: -slabDepth / 2 + 0.3, dx: 1, dz: 1 },
      { x: slabWidth / 2 - 0.3, z: -slabDepth / 2 + 0.3, dx: -1, dz: 1 },
      { x: slabWidth / 2 - 0.3, z: slabDepth / 2 - 0.3, dx: -1, dz: -1 },
      { x: -slabWidth / 2 + 0.3, z: slabDepth / 2 - 0.3, dx: 1, dz: -1 },
    ];
    corners.forEach((c) => {
      const bGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(c.x + c.dx * bracketSize, 0.15, c.z),
        new THREE.Vector3(c.x, 0.15, c.z),
        new THREE.Vector3(c.x, 0.15, c.z + c.dz * bracketSize),
      ]);
      const bMat = new THREE.LineBasicMaterial({
        color: 0xd4a373,
        opacity: 0.95,
        transparent: true,
      });
      ledgerGroup.add(new THREE.Line(bGeom, bMat));
    });

    // 5. The 4 Distinct Elevated Architectural Panels
    const panelConfigs = [
      // Panel 0: Top Subtask DAG
      {
        id: "top-subtasks",
        x: -3.0,
        z: -5.4,
        w: 12.4,
        d: 5.4,
        h: 0.6,
        elevation: 0.65,
        header: "ACTIVE SUBTASK DAG // 01",
        badge: "3/3 VERIFIED",
        badgeAccent: true,
        rows: [
          "Corpus Ingestion & Tavily Web Extraction",
          "Claim Isolation & Passage Decomposition",
          "Adversarial Entailment Verification Gate",
        ],
        meta: "TOPOLOGICAL EXECUTION GRAPH",
        submeta: "STRICT CONVERGENCE",
        accentColor: "#D4A373",
      },
      // Panel 1: Left Hypothesis Panel
      {
        id: "left-hypothesis",
        x: -8.2,
        z: 2.0,
        w: 10.0,
        d: 5.6,
        h: 0.6,
        elevation: 0.55,
        header: "HYPOTHESIS & CLAIM",
        badge: "ASSERTION C-104",
        badgeAccent: false,
        bodyText:
          "SPARC toroidal field coils sustained 20.1 Tesla without quench during Cryo-10 run at 18.5 kA excitation current under nominal vacuum.",
        meta: "PREDICTION · ENTAILMENT GATE",
        submeta: "STRICT (0.994)",
        accentColor: "#38BDF8",
      },
      // Panel 2: Right Verified Source Excerpt (Hero Node)
      {
        id: "right-source",
        x: 6.4,
        z: -1.4,
        w: 11.2,
        d: 6.2,
        h: 0.7,
        elevation: 0.8,
        header: "VERIFIED SOURCE EXCERPT",
        badge: "§ 14.2 · REF-502",
        badgeAccent: true,
        bodyText:
          "High-temperature superconducting REBCO magnet attained peak central field strength of 20.1 T under 18.5 kA excitation, verifying non-insulation winding stability.",
        quoteAuthor: "IEEE Trans. Applied Superconductivity (Vol. 34)",
        meta: "NATURE ENERGY · DOI: 10.1038/s41560-025",
        submeta: "PARAGRAPH 4 VERIFIED",
        accentColor: "#D4A373",
      },
      // Panel 3: Bottom Cryptographic Provenance Ledger
      {
        id: "bottom-ledger",
        x: 2.0,
        z: 6.2,
        w: 12.8,
        d: 4.8,
        h: 0.6,
        elevation: 0.55,
        header: "PROVENANCE & AUDIT LEDGER",
        badge: "SHA-256 CONFIRMED",
        badgeAccent: true,
        bodyText:
          "Immutable Digest: 0a56b1986683477589c673a668765655c38cdab3ac9826354890282638402846",
        meta: "RECORD BOUND · DOSSIER #492",
        submeta: "15:20:25 UTC · GROUND TRUTH",
        accentColor: "#D4A373",
      },
    ];

    const cardMeshes: THREE.Mesh[] = [];
    const cardBorderMeshes: THREE.LineSegments[] = [];
    const baseElevations = panelConfigs.map((p) => p.elevation);

    panelConfigs.forEach((pc) => {
      const boxGeom = new THREE.BoxGeometry(pc.w, pc.h, pc.d);
      const texture = createPanelTexture(pc);

      const sideMat = new THREE.MeshStandardMaterial({
        color: 0x1b2333,
        metalness: 0.8,
        roughness: 0.2,
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.15,
        metalness: 0.1,
      });

      const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
      const box = new THREE.Mesh(boxGeom, materials);
      box.position.set(pc.x, pc.elevation + pc.h / 2, pc.z);
      ledgerGroup.add(box);
      cardMeshes.push(box);

      const edgesGeom = new THREE.EdgesGeometry(boxGeom);
      const edgesMat = new THREE.LineBasicMaterial({
        color: pc.badgeAccent ? 0xd4a373 : 0x38bdf8,
        transparent: true,
        opacity: pc.badgeAccent ? 0.95 : 0.8,
      });
      const edges = new THREE.LineSegments(edgesGeom, edgesMat);
      box.add(edges);
      cardBorderMeshes.push(edges);
    });

    // 6. Orthogonal Circuit Traces Connecting Panels
    const flowPaths = [
      // Flow 1: Top DAG -> Left Hypothesis
      [
        new THREE.Vector3(-4.5, 0.2, -2.7),
        new THREE.Vector3(-8.2, 0.2, -2.7),
        new THREE.Vector3(-8.2, 0.2, -0.8),
      ],
      // Flow 2: Top DAG -> Right Verified Source
      [
        new THREE.Vector3(1.5, 0.2, -2.7),
        new THREE.Vector3(6.4, 0.2, -2.7),
        new THREE.Vector3(6.4, 0.2, -4.5),
      ],
      // Flow 3: Left Hypothesis -> Bottom Provenance Ledger
      [
        new THREE.Vector3(-3.5, 0.2, 3.8),
        new THREE.Vector3(-3.5, 0.2, 6.2),
        new THREE.Vector3(-4.4, 0.2, 6.2),
      ],
      // Flow 4: Right Verified Source -> Bottom Provenance Ledger
      [
        new THREE.Vector3(2.5, 0.2, 1.7),
        new THREE.Vector3(2.0, 0.2, 3.2),
        new THREE.Vector3(2.0, 0.2, 3.8),
      ],
      // Flow 5: Provenance Return Loop -> Top DAG
      [
        new THREE.Vector3(8.4, 0.2, 6.2),
        new THREE.Vector3(12.5, 0.2, 6.2),
        new THREE.Vector3(12.5, 0.2, -5.4),
        new THREE.Vector3(3.2, 0.2, -5.4),
      ],
    ];

    flowPaths.forEach((points, idx) => {
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: idx === 4 ? 0x64748b : 0xd4a373,
        transparent: true,
        opacity: idx === 4 ? 0.5 : 0.9,
      });
      const line = new THREE.Line(geom, mat);
      ledgerGroup.add(line);

      [points[0], points[points.length - 1]].forEach((pt) => {
        const padGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12);
        const padMat = new THREE.MeshBasicMaterial({ color: 0xd4a373 });
        const pad = new THREE.Mesh(padGeom, padMat);
        pad.position.copy(pt);
        ledgerGroup.add(pad);
      });
    });

    // 7. Animated Glowing Data Packets
    const pulseCount = 10;
    const pulseSpheres: {
      mesh: THREE.Mesh;
      pathIdx: number;
      progress: number;
      speed: number;
    }[] = [];

    const pulseGeom = new THREE.SphereGeometry(0.22, 14, 14);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xfff6eb });

    for (let i = 0; i < pulseCount; i++) {
      const pathIdx = i % flowPaths.length;
      const mesh = new THREE.Mesh(pulseGeom, pulseMat);
      ledgerGroup.add(mesh);
      pulseSpheres.push({
        mesh,
        pathIdx,
        progress: (i / pulseCount) * 1.0,
        speed: 0.16 + (i % 3) * 0.04,
      });
    }

    function getPointOnPolyline(points: THREE.Vector3[], t: number): THREE.Vector3 {
      if (points.length < 2) return points[0] || new THREE.Vector3();
      const clampedT = Math.max(0, Math.min(1, t));
      const segmentCount = points.length - 1;
      const totalT = clampedT * segmentCount;
      const segIndex = Math.min(Math.floor(totalT), segmentCount - 1);
      const segFraction = totalT - segIndex;
      const p1 = points[segIndex];
      const p2 = points[segIndex + 1];
      return new THREE.Vector3().lerpVectors(p1, p2, segFraction);
    }

    // 8. High-Contrast Architectural Lighting
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 4.0);
    keyLight.position.set(18, 30, 24);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    fillLight.position.set(-22, 16, -10);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0x1a2130, 3.0);
    scene.add(ambientLight);

    const goldAccentLight = new THREE.PointLight(0xd4a373, 5.5, 34);
    goldAccentLight.position.set(6.4, 5.0, -1.4);
    ledgerGroup.add(goldAccentLight);

    const cyanAccentLight = new THREE.PointLight(0x38bdf8, 3.2, 28);
    cyanAccentLight.position.set(-3.0, 4.5, -5.4);
    ledgerGroup.add(cyanAccentLight);

    // 9. Interactive Parallax & Raycasting
    // Separate parallax mouse (starts at 0, 0) from raycast mouse (inactive until user moves)
    const raycaster = new THREE.Raycaster();
    const raycastMouse = new THREE.Vector2(-1000, -1000);
    const parallaxMouse = new THREE.Vector2(0, 0);
    let hasMouseMoved = false;

    let targetCameraX = camBaseX;
    let targetCameraY = camBaseY;
    let hoveredIndex: number | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      hasMouseMoved = true;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      raycastMouse.x = (x / width) * 2 - 1;
      raycastMouse.y = -(y / height) * 2 + 1;
      parallaxMouse.x = raycastMouse.x;
      parallaxMouse.y = raycastMouse.y;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 10. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth Camera Parallax responding to cursor
      targetCameraX += (camBaseX + parallaxMouse.x * 2.2 - targetCameraX) * 0.05;
      targetCameraY += (camBaseY - parallaxMouse.y * 1.8 - targetCameraY) * 0.05;
      camera.position.x = targetCameraX;
      camera.position.y = targetCameraY;
      camera.lookAt(isMobile ? 0 : 4.5, 0, 0);

      // Gentle Breathing Oscillation on the slab
      ledgerGroup.position.y = (isMobile ? -3.5 : -0.2) + Math.sin(elapsed * 0.5) * 0.12;

      // Update Flow Pulses along circuit traces
      pulseSpheres.forEach((p) => {
        p.progress += delta * p.speed;
        if (p.progress > 1.0) {
          p.progress = 0;
        }
        const currentPath = flowPaths[p.pathIdx];
        const pos = getPointOnPolyline(currentPath, p.progress);
        p.mesh.position.copy(pos);

        const pulseScale = 1.0 + Math.sin(elapsed * 6 + p.pathIdx) * 0.25;
        p.mesh.scale.set(pulseScale, pulseScale, pulseScale);
      });

      // Raycast for card hover only if mouse moved
      if (hasMouseMoved) {
        raycaster.setFromCamera(raycastMouse, camera);
        const intersects = raycaster.intersectObjects(cardMeshes);

        if (intersects.length > 0) {
          const hitIdx = cardMeshes.indexOf(intersects[0].object as THREE.Mesh);
          if (hitIdx !== -1 && hitIdx !== hoveredIndex) {
            hoveredIndex = hitIdx;
            if (onHoverCard) onHoverCard(hitIdx);
          }
        } else {
          if (hoveredIndex !== null) {
            hoveredIndex = null;
            if (onHoverCard) onHoverCard(null);
          }
        }
      }

      // Smooth Elevation Bounce for active / hovered card
      cardMeshes.forEach((mesh, idx) => {
        const isHovered = hoveredIndex === idx;
        const targetElevation = isHovered ? baseElevations[idx] + 0.6 : baseElevations[idx];
        const targetY = targetElevation + panelConfigs[idx].h / 2;
        mesh.position.y += (targetY - mesh.position.y) * 0.12;

        const border = cardBorderMeshes[idx];
        const borderMat = border.material as THREE.LineBasicMaterial;
        const targetOpacity = isHovered
          ? 1.0
          : panelConfigs[idx].badgeAccent
          ? 0.95
          : 0.7;
        borderMat.opacity += (targetOpacity - borderMat.opacity) * 0.12;
      });

      renderer.render(scene, camera);
    };

    animate();

    // 11. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      if (height === 0) height = 800;
      if (width === 0) width = 1200;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      const mobile = width < 768;
      ledgerGroup.position.set(mobile ? 0 : 8.5, mobile ? -3.5 : -0.2, 0);
      camera.position.set(mobile ? 0 : 3.5, mobile ? 26 : 23, mobile ? 36 : 29);
      camera.lookAt(mobile ? 0 : 4.5, 0, 0);
    };

    window.addEventListener("resize", handleResize);

    // 12. Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      slabGeom.dispose();
      slabSideMat.dispose();
      slabTopMat.dispose();
      slabEdgesGeom.dispose();
      slabEdgesMat.dispose();
      borderGeom.dispose();
      borderMat.dispose();
      gridHelper.geometry.dispose();
      (gridHelper.material as THREE.Material).dispose();
      auraGeom.dispose();
      auraMat.dispose();
      auraTexture.dispose();
      pulseGeom.dispose();
      pulseMat.dispose();

      cardMeshes.forEach((m) => {
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => {
            if ("map" in mat && mat.map) (mat.map as THREE.CanvasTexture).dispose();
            mat.dispose();
          });
        } else {
          m.material.dispose();
        }
      });

      cardBorderMeshes.forEach((e) => {
        e.geometry.dispose();
        (e.material as THREE.Material).dispose();
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onHoverCard]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full z-0 overflow-hidden cursor-crosshair pointer-events-auto"
      aria-hidden="true"
    />
  );
}
