"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function AgentConstellation() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 24);

    // Renderer (Performance-tuned: no shadows, powerPreference high-performance)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    container.appendChild(renderer.domElement);

    // 5 Swarm Agent Core Nodes
    const agentPositions = [
      new THREE.Vector3(-6, 3, 2),   // Orchestrator
      new THREE.Vector3(-2, -3, 0),  // Research
      new THREE.Vector3(2, 4, -1),   // Verification
      new THREE.Vector3(5, -2, 1),   // Analysis
      new THREE.Vector3(7, 2, -2),   // Report / Synthesis
    ];

    const group = new THREE.Group();
    scene.add(group);

    // Node spheres
    const nodeGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const nodeMatGold = new THREE.MeshBasicMaterial({ color: 0xd4a373 });
    const nodeMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

    agentPositions.forEach((pos, idx) => {
      const mesh = new THREE.Mesh(nodeGeo, idx === 2 ? nodeMatGold : nodeMatWhite);
      mesh.position.copy(pos);
      group.add(mesh);

      // Outer ring for each agent
      const ringGeo = new THREE.RingGeometry(0.5, 0.58, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 2 ? 0xd4a373 : 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      group.add(ring);
    });

    // Connecting Lines
    const lineIndices = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 2],
      [1, 3],
    ];

    const linePoints: THREE.Vector3[] = [];
    lineIndices.forEach(([a, b]) => {
      linePoints.push(agentPositions[a], agentPositions[b]);
    });

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    // Floating Background Evidence Particles
    const particleCount = 120;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 36;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particleMat = new THREE.PointsMaterial({
      color: 0xd4a373,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Traveling Data Packets along the DAG
    const packetCount = 8;
    const packetGeo = new THREE.BufferGeometry();
    const packetPositions = new Float32Array(packetCount * 3);
    packetGeo.setAttribute("position", new THREE.BufferAttribute(packetPositions, 3));
    const packetMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.9,
    });
    const packets = new THREE.Points(packetGeo, packetMat);
    group.add(packets);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Resize
    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    // Render Loop
    let animId: number;
    let time = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.015;

      // Smooth camera damping
      targetX += (mouseX * 1.5 - targetX) * 0.04;
      targetY += (mouseY * 1.2 - targetY) * 0.04;

      group.rotation.y = time * 0.12 + targetX * 0.25;
      group.rotation.x = Math.sin(time * 0.08) * 0.08 - targetY * 0.2;

      particles.rotation.y = time * 0.03;

      // Update traveling packets along line segments
      const posAttr = packetGeo.attributes.position as THREE.BufferAttribute;
      for (let p = 0; p < packetCount; p++) {
        const segIdx = p % lineIndices.length;
        const [startIdx, endIdx] = lineIndices[segIdx];
        const progress = (time * 0.4 + p * 0.25) % 1;
        const pA = agentPositions[startIdx];
        const pB = agentPositions[endIdx];

        posAttr.setXYZ(
          p,
          pA.x + (pB.x - pA.x) * progress,
          pA.y + (pB.y - pA.y) * progress,
          pA.z + (pB.z - pA.z) * progress
        );
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      nodeGeo.dispose();
      nodeMatGold.dispose();
      nodeMatWhite.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      packetGeo.dispose();
      packetMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden"
    />
  );
}
