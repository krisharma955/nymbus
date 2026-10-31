"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function TopologicalWave() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 14, 24);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Plane Geometry for Topological Wave
    const cols = 60;
    const rows = 45;
    const planeWidth = 48;
    const planeDepth = 36;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeDepth, cols - 1, rows - 1);
    geometry.rotateX(-Math.PI / 2);

    const originalPositions = Float32Array.from(geometry.attributes.position.array);

    // Wireframe Mesh (Subtle architectural lines)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x334155,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    scene.add(wireframeMesh);

    // Point Cloud Vertices on top of the lattice
    const pointCount = geometry.attributes.position.count;
    const pointColors = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      if (Math.random() > 0.88) {
        // Laser Cyan highlight points (#00F0FF)
        pointColors[i * 3] = 0.0;
        pointColors[i * 3 + 1] = 0.94;
        pointColors[i * 3 + 2] = 1.0;
      } else if (Math.random() > 0.7) {
        // Ice Blue secondary points (#38BDF8)
        pointColors[i * 3] = 0.22;
        pointColors[i * 3 + 1] = 0.74;
        pointColors[i * 3 + 2] = 0.97;
      } else {
        // Subtle Titanium slate points
        pointColors[i * 3] = 0.45;
        pointColors[i * 3 + 1] = 0.52;
        pointColors[i * 3 + 2] = 0.62;
      }
    }
    const pointsGeometry = geometry.clone();
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(pointColors, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(pointsMesh);

    // 3. Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 14;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseX = (x / width - 0.5) * 2;
      mouseY = (y / height - 0.5) * 2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 4. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Camera smooth inertia
      targetCameraX += (mouseX * 4 - targetCameraX) * 0.04;
      targetCameraY += (14 - mouseY * 3 - targetCameraY) * 0.04;
      camera.position.x = targetCameraX;
      camera.position.y = targetCameraY;
      camera.lookAt(0, 0, 0);

      // Wave calculation
      const pos = geometry.attributes.position;
      const pointsPos = pointsGeometry.attributes.position;
      const count = pos.count;

      for (let i = 0; i < count; i++) {
        const ox = originalPositions[i * 3];
        const oz = originalPositions[i * 3 + 2];

        // Multi-frequency topological elevation wave
        const d = Math.sqrt(ox * ox + oz * oz);
        const mouseDist = Math.hypot(ox - mouseX * 12, oz - mouseY * 10);
        const cursorDip = Math.max(0, 2.5 - mouseDist * 0.4);

        const elevation =
          Math.sin(ox * 0.25 + t * 0.9) * Math.cos(oz * 0.28 + t * 0.7) * 1.8 +
          Math.sin(d * 0.18 - t * 1.1) * 0.9 +
          cursorDip;

        pos.setY(i, elevation);
        pointsPos.setY(i, elevation);
      }

      pos.needsUpdate = true;
      pointsPos.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 5. Resize Handling
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // 6. Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      geometry.dispose();
      pointsGeometry.dispose();
      wireframeMaterial.dispose();
      pointsMaterial.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-80"
      aria-hidden="true"
    />
  );
}
