"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function OrbitalGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Groups
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 3. Central Wireframe Globe (Telemetry Emerald)
    const radius = 5.2;
    const globeGeometry = new THREE.SphereGeometry(radius, 28, 22);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const globeMesh = new THREE.Mesh(globeGeometry, wireframeMaterial);
    globeGroup.add(globeMesh);

    // Subtle Inner Dark Core to occlude back wireframes slightly
    const innerCoreGeometry = new THREE.SphereGeometry(radius * 0.98, 24, 24);
    const innerCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0x070a0f,
      transparent: true,
      opacity: 0.85,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial);
    globeGroup.add(innerCoreMesh);

    // Surface Coordinate Nodes (Glowing green dots on vertex grid)
    const nodeCount = 65;
    const nodePositions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      nodePositions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      nodePositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      nodePositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(nodePositions, 3)
    );
    const nodeMaterial = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.18,
      transparent: true,
      opacity: 0.85,
    });
    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    globeGroup.add(nodePoints);

    // 4. Orbital Trajectory Rings (Amber Gold #F5A623)
    function createOrbitRing(radiusX: number, radiusY: number, tiltZ: number, tiltX: number) {
      const curve = new THREE.EllipseCurve(
        0, 0,
        radiusX, radiusY,
        0, 2 * Math.PI,
        false,
        0
      );
      const points = curve.getPoints(120);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, p.y, 0))
      );
      const material = new THREE.LineBasicMaterial({
        color: 0xf5a623,
        transparent: true,
        opacity: 0.45,
      });
      const line = new THREE.Line(geometry, material);
      line.rotation.x = tiltX;
      line.rotation.z = tiltZ;
      return line;
    }

    const orbit1 = createOrbitRing(8.2, 8.2, Math.PI / 6, Math.PI / 3);
    const orbit2 = createOrbitRing(9.5, 9.5, -Math.PI / 4, Math.PI / 2.6);
    globeGroup.add(orbit1);
    globeGroup.add(orbit2);

    // 5. Orbiting Satellites (Glowing amber beads)
    const satGeometry = new THREE.SphereGeometry(0.24, 12, 12);
    const satMaterial = new THREE.MeshBasicMaterial({ color: 0xffb800 });
    const sat1 = new THREE.Mesh(satGeometry, satMaterial);
    const sat2 = new THREE.Mesh(satGeometry, satMaterial);
    scene.add(sat1);
    scene.add(sat2);

    // 6. Ambient Deep Space Starfield
    const starCount = 350;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 60;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 7. Mouse Interaction & Inertia
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseX = (x / width - 0.5) * 2;
      mouseY = -(y / height - 0.5) * 2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 8. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse follow
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Base globe rotation + mouse tilt
      globeGroup.rotation.y = elapsedTime * 0.15 + targetX * 0.4;
      globeGroup.rotation.x = Math.sin(elapsedTime * 0.08) * 0.1 + targetY * 0.25;

      // Orbit 1 satellite calculation
      const angle1 = elapsedTime * 0.45;
      const r1 = 8.2;
      const p1 = new THREE.Vector3(Math.cos(angle1) * r1, Math.sin(angle1) * r1, 0);
      p1.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 3);
      p1.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 6);
      sat1.position.copy(p1);

      // Orbit 2 satellite calculation
      const angle2 = -elapsedTime * 0.35 + 1.2;
      const r2 = 9.5;
      const p2 = new THREE.Vector3(Math.cos(angle2) * r2, Math.sin(angle2) * r2, 0);
      p2.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2.6);
      p2.applyAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4);
      sat2.position.copy(p2);

      // Starfield subtle slow drift
      starField.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // 10. Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      globeGeometry.dispose();
      wireframeMaterial.dispose();
      innerCoreGeometry.dispose();
      innerCoreMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      orbit1.geometry.dispose();
      (orbit1.material as THREE.Material).dispose();
      orbit2.geometry.dispose();
      (orbit2.material as THREE.Material).dispose();
      satGeometry.dispose();
      satMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
