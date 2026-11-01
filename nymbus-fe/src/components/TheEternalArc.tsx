"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface TheEternalArcProps {
  mode?: "spline" | "three";
  splineUrl?: string;
  onDialClick?: () => void;
}

export function TheEternalArc({
  mode = "spline",
  splineUrl = "https://app.spline.design/ui/bad965c8-bed5-46e5-8927-43c65923040b",
}: TheEternalArcProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [currentMode, setCurrentMode] = useState<"spline" | "three">(mode);

  // High-performance Three.js WebGL fallback & native interactive Torus
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.025);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. The Torus Arc Geometry (The Eternal Arc)
    // Radius ~6.5, Tube ~0.55
    const torusGeometry = new THREE.TorusGeometry(6.2, 0.52, 64, 200);
    
    // High-fidelity dark chrome / obsidian titanium material
    const torusMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x12141a,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      reflectivity: 0.9,
    });

    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    // Initial tilt matching the reference screenshot:
    torus.rotation.set(0.68, 0.38, -0.42);
    torus.position.set(2.8, -0.2, 0);
    scene.add(torus);

    // Outer subtle faint wire halo
    const haloGeometry = new THREE.TorusGeometry(6.28, 0.02, 16, 120);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.copy(torus.rotation);
    halo.position.copy(torus.position);
    scene.add(halo);

    // 3. Volumetric Ray Particle Streaks (streaming from top-right across center)
    const rayCount = 180;
    const rayGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rayCount * 3);
    const opacities = new Float32Array(rayCount);

    for (let i = 0; i < rayCount; i++) {
      // Slanted line strip in the direction of the light ray (angle ~ -55 deg)
      const spreadX = (Math.random() - 0.2) * 28;
      const spreadY = (Math.random() - 0.1) * 22;
      const spreadZ = (Math.random() - 0.5) * 15;
      positions[i * 3] = spreadX;
      positions[i * 3 + 1] = spreadY;
      positions[i * 3 + 2] = spreadZ;
      opacities[i] = Math.random() * 0.45;
    }
    rayGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const rayMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const rayParticles = new THREE.Points(rayGeometry, rayMaterial);
    scene.add(rayParticles);

    // 4. Lighting Setup (Dramatic Volumetric Caustics)
    // Ambient Light (subtle void glow)
    const ambientLight = new THREE.AmbientLight(0x0a0c10, 0.8);
    scene.add(ambientLight);

    // Key Light from Top-Right (Brilliant white rim highlight)
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.5);
    keyLight.position.set(16, 20, 12);
    scene.add(keyLight);

    // Secondary Soft Rim Light
    const fillLight = new THREE.DirectionalLight(0xa5b4fc, 1.2);
    fillLight.position.set(-14, -8, -10);
    scene.add(fillLight);

    // Point Light near top of Torus to recreate the hot specular crescent
    const specularPoint = new THREE.PointLight(0xffffff, 3.5, 20);
    specularPoint.position.set(5.5, 5.0, 4.5);
    scene.add(specularPoint);

    // 5. Mouse Parallax & Smooth Physics
    let targetRotX = torus.rotation.x;
    let targetRotY = torus.rotation.y;
    let targetPosX = torus.position.x;
    let targetPosY = torus.position.y;

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;

      targetRotX = 0.68 + normY * 0.15;
      targetRotY = 0.38 + normX * 0.22;
      targetPosX = 2.8 + normX * 0.45;
      targetPosY = -0.2 + normY * 0.35;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // 7. Animation Loop with buttery smooth interpolation
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Subtle resting rotation & float
      const restingFloatY = Math.sin(elapsedTime * 0.7) * 0.12;
      const restingRotZ = -0.42 + Math.cos(elapsedTime * 0.5) * 0.04;

      torus.rotation.x += (targetRotX - torus.rotation.x) * 0.04;
      torus.rotation.y += (targetRotY - torus.rotation.y) * 0.04;
      torus.rotation.z = restingRotZ;

      torus.position.x += (targetPosX - torus.position.x) * 0.04;
      torus.position.y += (targetPosY + restingFloatY - torus.position.y) * 0.04;

      halo.rotation.copy(torus.rotation);
      halo.position.copy(torus.position);

      // Drift ray particles gently
      rayParticles.rotation.y = elapsedTime * 0.02;
      rayParticles.rotation.z = elapsedTime * 0.01;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      torusGeometry.dispose();
      torusMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      rayGeometry.dispose();
      rayMaterial.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Cinematic Diagonal Volumetric Caustic Beam (CSS & SVG Gradient layer) */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-90 transition-opacity duration-1000"
        style={{
          background: `
            radial-gradient(circle at 82% 15%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.18) 18%, rgba(255, 255, 255, 0.06) 42%, transparent 70%),
            linear-gradient(135deg, transparent 20%, rgba(255, 255, 255, 0.14) 48%, rgba(255, 255, 255, 0.28) 54%, rgba(255, 255, 255, 0.08) 62%, transparent 80%)
          `,
        }}
      />

      {/* Volumetric Light Beam Streak overlay */}
      <div 
        className="absolute -top-1/4 -right-1/4 w-[140%] h-[140%] pointer-events-none transform -rotate-12 opacity-80"
        style={{
          background: "radial-gradient(ellipse 65% 35% at 75% 25%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 35%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* 2. Interactive Spline Iframe (Active when currentMode === 'spline') */}
      {currentMode === "spline" && (
        <div className="absolute inset-0 z-[1] pointer-events-auto">
          <iframe
            src={splineUrl}
            title="The Eternal ARC - Spline 3D Scene"
            className={`w-full h-full border-0 transition-opacity duration-700 ${
              splineLoaded ? "opacity-100" : "opacity-0"
            }`}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            onLoad={() => setSplineLoaded(true)}
          />
        </div>
      )}

      {/* 3. High-performance Three.js WebGL fallback & native render */}
      <div
        ref={mountRef}
        className={`absolute inset-0 z-0 transition-opacity duration-700 ${
          currentMode === "three" || !splineLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 4. Fine-grain Cinematic Film Texture / Micro-noise */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* 5. Vignette darkening edges for cinematic depth */}
      <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-[#050505]/30 to-[#030303]/90" />
    </div>
  );
}

