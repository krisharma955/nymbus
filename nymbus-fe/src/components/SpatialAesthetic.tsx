"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function SpatialAesthetic({ hideBottomFade = true }: { hideBottomFade?: boolean } = {}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // 1. Butter-Smooth 60/120fps Cursor Spotlight (Decoupled from React)
  useEffect(() => {
    let animId: number;
    let targetX = -1000;
    let targetY = -1000;
    let currentX = -1000;
    let currentY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const updateSpotlight = () => {
      animId = requestAnimationFrame(updateSpotlight);
      if (currentX === -1000) {
        currentX = targetX;
        currentY = targetY;
      } else {
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
      }

      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(600px circle at ${currentX}px ${currentY}px, rgba(212, 163, 115, 0.09), transparent 70%)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    updateSpotlight();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 2. Hyper-Optimized 60/120 FPS Three.js Caliper Engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 80);
    camera.position.set(0, 0, 20);

    // Optimized Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    // Balanced pixel ratio: crisp visuals without 4x Retina fragment lag
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Studio Specular Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaee, 3.8);
    keyLight.position.set(12, 15, 12);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.4);
    rimLight.position.set(-12, -10, -8);
    scene.add(rimLight);

    // Core Caliper Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Primary Luxury Brushed Champagne Gold Torus (Streamlined polygon count for 120 FPS)
    const primaryGeo = new THREE.TorusGeometry(6.2, 0.085, 16, 96);
    const primaryMat = new THREE.MeshStandardMaterial({
      color: 0xdfb488,
      metalness: 0.92,
      roughness: 0.18,
      emissive: 0x3d2812,
      emissiveIntensity: 0.28,
    });
    const primaryTorus = new THREE.Mesh(primaryGeo, primaryMat);
    coreGroup.add(primaryTorus);

    // 2. Subtle Precision Inner Hairline Wire
    const innerGeo = new THREE.TorusGeometry(4.8, 0.03, 12, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.95,
      roughness: 0.15,
      transparent: true,
      opacity: 0.7,
    });
    const innerRing = new THREE.Mesh(innerGeo, innerMat);
    innerRing.rotation.x = Math.PI / 2.35;
    coreGroup.add(innerRing);

    // 3. Coordinate Notches: Single InstancedMesh (1 Draw Call instead of 20)
    const notchCount = 16;
    const notchGeo = new THREE.BoxGeometry(0.025, 0.35, 0.025);
    const notchMat = new THREE.MeshBasicMaterial({
      color: 0xd4a373,
      transparent: true,
      opacity: 0.4,
    });
    const instancedNotches = new THREE.InstancedMesh(notchGeo, notchMat, notchCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < notchCount; i++) {
      const angle = (i / notchCount) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * 5.4, Math.sin(angle) * 5.4, 0);
      dummy.rotation.set(0, 0, angle + Math.PI / 2);
      dummy.updateMatrix();
      instancedNotches.setMatrixAt(i, dummy.matrix);
    }
    instancedNotches.instanceMatrix.needsUpdate = true;
    coreGroup.add(instancedNotches);

    // Initial orientation
    coreGroup.rotation.set(0.92, 0.36, -0.42);
    coreGroup.position.set(0.6, 0.3, -1);

    // Mouse Tracking with Inertial Spring
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    // Delta-Time Independent Render Loop (Solid 60-120fps on any screen)
    let animId: number;
    let isVisible = true;
    const clock = new THREE.Clock();
    let totalTime = 0;

    // Visibility observer to pause rendering when scrolled out of view
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      totalTime += delta;

      // Butter-smooth lerp interpolation
      targetX += (mouseX * 0.22 - targetX) * (delta * 3.5);
      targetY += (mouseY * 0.18 - targetY) * (delta * 3.5);

      coreGroup.rotation.z = -0.42 + totalTime * 0.2;
      coreGroup.rotation.x = 0.92 + targetY;
      coreGroup.rotation.y = 0.36 + targetX;

      innerRing.rotation.z = totalTime * 0.35;
      instancedNotches.rotation.z = -totalTime * 0.12;

      // Subtle breathing float
      coreGroup.position.y = 0.3 + Math.sin(totalTime * 1.5) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      primaryGeo.dispose();
      primaryMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      notchGeo.dispose();
      notchMat.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden will-change-transform">
      {/* 1. Dynamic Cursor Spotlight (zero React re-renders, 120fps) */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 pointer-events-none will-change-[background]"
      />

      {/* 2. Top-center Ambient Architectural Halo */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[850px] h-[450px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212, 163, 115, 0.13) 0%, transparent 75%)",
          filter: "blur(50px)",
        }}
      />

      {/* 3. Three.js Caliper Canvas */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* 4. Fine Horizon Caliper Gradient */}
      {!hideBottomFade && (
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
