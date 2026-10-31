"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface HyperPrismProps {
  onSelectAgent?: (agentIndex: number) => void;
  selectedAgent?: number;
}

export function HyperPrism({ onSelectAgent, selectedAgent = 0 }: HyperPrismProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Main Hyper-Crystal Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 3. Central Dual Polyhedron (Inner Core + Outer Geometric Cage)
    // Inner Solid Crystal with Multi-Colored Specular
    const innerGeom = new THREE.IcosahedronGeometry(3.6, 0);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a0933,
      emissive: 0x240642,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.6,
      ior: 1.5,
      transparent: true,
      opacity: 0.85,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    coreGroup.add(innerMesh);

    // Outer Faceted Wireframe Cage with Chromatic Points
    const outerGeom = new THREE.IcosahedronGeometry(4.8, 1);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    coreGroup.add(outerMesh);

    // Dynamic Vertex Nodes on the Outer Cage
    const vertexPositions = outerGeom.attributes.position.array;
    const vertexPointsGeom = new THREE.BufferGeometry();
    vertexPointsGeom.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(vertexPositions), 3));
    const vertexPointsMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.22,
      transparent: true,
      opacity: 0.9,
    });
    const vertexPoints = new THREE.Points(vertexPointsGeom, vertexPointsMat);
    coreGroup.add(vertexPoints);

    // 4. Intersecting Prismatic Gyroscopic Rings
    function createGlowRing(radius: number, colorHex: number, rotX: number, rotY: number) {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(120);
      const geom = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, p.y, 0)));
      const mat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.45,
      });
      const ring = new THREE.Line(geom, mat);
      ring.rotation.x = rotX;
      ring.rotation.y = rotY;
      return ring;
    }

    const ring1 = createGlowRing(7.2, 0xff0080, Math.PI / 4, 0); // Fuchsia ring
    const ring2 = createGlowRing(8.4, 0x00dfd8, -Math.PI / 3, Math.PI / 6); // Cyan ring
    const ring3 = createGlowRing(9.6, 0x7928ca, Math.PI / 6, Math.PI / 3); // Violet ring
    coreGroup.add(ring1);
    coreGroup.add(ring2);
    coreGroup.add(ring3);

    // 5. 5 Autonomous Agent Orbital Satellites
    const agentColors = [0x00dfd8, 0xa855f7, 0xff0080, 0x3b82f6, 0x10b981];
    const agentMeshes: THREE.Mesh[] = [];
    const agentGroup = new THREE.Group();
    scene.add(agentGroup);

    const agentOrbits = [
      { radius: 6.8, speed: 0.5, tilt: Math.PI / 4, phase: 0 },
      { radius: 7.8, speed: -0.4, tilt: -Math.PI / 5, phase: 1.2 },
      { radius: 8.8, speed: 0.35, tilt: Math.PI / 3, phase: 2.4 },
      { radius: 9.8, speed: -0.3, tilt: -Math.PI / 4, phase: 3.6 },
      { radius: 10.8, speed: 0.25, tilt: Math.PI / 6, phase: 4.8 },
    ];

    for (let i = 0; i < 5; i++) {
      const satGeom = new THREE.SphereGeometry(0.36, 16, 16);
      const satMat = new THREE.MeshBasicMaterial({ color: agentColors[i] });
      const satMesh = new THREE.Mesh(satGeom, satMat);

      // Outer Glow Halo
      const haloGeom = new THREE.SphereGeometry(0.55, 12, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: agentColors[i],
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const haloMesh = new THREE.Mesh(haloGeom, haloMat);
      satMesh.add(haloMesh);

      agentMeshes.push(satMesh);
      agentGroup.add(satMesh);
    }

    // Dynamic Connection Laser Lines between Core and Agents
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x7928ca,
      transparent: true,
      opacity: 0.35,
    });
    const connectionLines: THREE.Line[] = [];
    for (let i = 0; i < 5; i++) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
      const line = new THREE.Line(lineGeom, lineMat);
      connectionLines.push(line);
      scene.add(line);
    }

    // 6. Volumetric Chromatic Particle Synapses (1200 floating embers)
    const particleCount = 1200;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const paletteRGB = [
      [0.47, 0.16, 0.79], // #7928CA Violet
      [1.0, 0.0, 0.5],    // #FF0080 Magenta
      [0.0, 0.87, 0.85],  // #00DFD8 Cyan
      [0.98, 0.98, 1.0],  // Ice White
    ];

    for (let i = 0; i < particleCount; i++) {
      const rad = 5.0 + Math.random() * 24.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = rad * Math.cos(phi);

      const color = paletteRGB[Math.floor(Math.random() * paletteRGB.length)];
      particleColors[i * 3] = color[0];
      particleColors[i * 3 + 1] = color[1];
      particleColors[i * 3 + 2] = color[2];
    }

    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeom.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeom, particleMat);
    scene.add(particleSystem);

    // 7. Interactive Lights
    const pointLight1 = new THREE.PointLight(0xff0080, 2, 40);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00dfd8, 2, 40);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    const ambientLight = new THREE.AmbientLight(0x0a0518, 1.5);
    scene.add(ambientLight);

    // 8. Mouse & Interactive Inertia
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / height) * 2 - 1);
      mouseX = x;
      mouseY = y;

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        coreGroup.rotation.y += deltaX * 0.008;
        coreGroup.rotation.x += deltaY * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // 9. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth inertia rotation if not actively dragging
      if (!isDragging) {
        targetRotX += (mouseY * 0.4 - targetRotX) * 0.04;
        targetRotY += (mouseX * 0.5 - targetRotY) * 0.04;
        coreGroup.rotation.y = t * 0.2 + targetRotY;
        coreGroup.rotation.x = Math.sin(t * 0.15) * 0.2 + targetRotX;
      }

      // Gyroscopic Ring Rotations
      ring1.rotation.z = t * 0.4;
      ring2.rotation.z = -t * 0.35;
      ring3.rotation.z = t * 0.25;

      // Inner Crystal Pulsing
      const scale = 1 + Math.sin(t * 1.5) * 0.05;
      innerMesh.scale.set(scale, scale, scale);

      // Agent Satellite Trajectories
      for (let i = 0; i < 5; i++) {
        const cfg = agentOrbits[i];
        const angle = t * cfg.speed + cfg.phase;
        const x = Math.cos(angle) * cfg.radius;
        const y = Math.sin(angle) * cfg.radius * Math.cos(cfg.tilt);
        const z = Math.sin(angle) * cfg.radius * Math.sin(cfg.tilt);

        agentMeshes[i].position.set(x, y, z);

        // Highlight selected agent scale
        const targetScale = selectedAgent === i ? 1.6 : 1.0;
        agentMeshes[i].scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Update connection line
        const linePos = connectionLines[i].geometry.attributes.position;
        linePos.setXYZ(0, 0, 0, 0);
        linePos.setXYZ(1, x, y, z);
        linePos.needsUpdate = true;
      }

      // Particle Field Slow Drift
      particleSystem.rotation.y = t * 0.03;
      particleSystem.rotation.x = Math.sin(t * 0.02) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // 11. Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      innerGeom.dispose();
      innerMat.dispose();
      outerGeom.dispose();
      outerMat.dispose();
      vertexPointsGeom.dispose();
      vertexPointsMat.dispose();
      ring1.geometry.dispose();
      ring2.geometry.dispose();
      ring3.geometry.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      agentMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      connectionLines.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [selectedAgent]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full z-0 overflow-hidden cursor-grab active:cursor-grabbing"
      aria-hidden="true"
    />
  );
}
