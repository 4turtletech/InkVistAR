import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const BRAND_GOLD = '#C19A6B';
const BRAND_GOLD_EMISSIVE = '#8B6914';
const DEFAULT_COLOR = '#e8ddd0';
const HOVER_COLOR = '#d4c4b0';
const LANDMARK_COLOR = '#cdc5ba';

/* ---------- Individual clickable body part ---------- */
function BodyPart({ name, position, rotation, geometryType, geometryArgs, isSelected, isHovered, isClickable, onClick, onHover }) {
    const geometry = useMemo(() => {
        switch (geometryType) {
            case 'sphere':   return new THREE.SphereGeometry(...geometryArgs);
            case 'capsule':  return new THREE.CapsuleGeometry(...geometryArgs);
            case 'box':      return new THREE.BoxGeometry(...geometryArgs);
            case 'cylinder': return new THREE.CylinderGeometry(...geometryArgs);
            default:         return new THREE.BoxGeometry(0.1, 0.1, 0.1);
        }
    }, [geometryType, geometryArgs]);

    let color = LANDMARK_COLOR;
    if (isClickable) color = isSelected ? BRAND_GOLD : (isHovered ? HOVER_COLOR : DEFAULT_COLOR);

    return (
        <mesh
            geometry={geometry}
            position={position}
            rotation={rotation || [0, 0, 0]}
            onClick={(e) => { e.stopPropagation(); if (isClickable) onClick(name); }}
            onPointerOver={(e) => { e.stopPropagation(); if (isClickable) { onHover(name); document.body.style.cursor = 'pointer'; } }}
            onPointerOut={(e) => { e.stopPropagation(); if (isClickable) { onHover(null); document.body.style.cursor = 'default'; } }}
        >
            <meshStandardMaterial
                color={color}
                emissive={isSelected ? BRAND_GOLD_EMISSIVE : '#000000'}
                emissiveIntensity={isSelected ? 0.4 : 0}
                roughness={0.55}
                metalness={isSelected ? 0.2 : 0.05}
            />
        </mesh>
    );
}

/* ---------- Body part definitions (procedural mannequin) ---------- */
const BODY_PARTS = [
    // Head (non-clickable landmark)
    { id: 'head',       placement: null,        type: 'sphere',   args: [0.13, 32, 32],       pos: [0, 0.87, 0] },
    // Neck
    { id: 'neck',       placement: 'Neck',      type: 'cylinder', args: [0.05, 0.06, 0.1, 16], pos: [0, 0.72, 0] },
    // Chest (front slab)
    { id: 'chest',      placement: 'Chest',     type: 'box',      args: [0.34, 0.36, 0.08],   pos: [0, 0.47, 0.055] },
    // Back (rear slab)
    { id: 'back',       placement: 'Back',      type: 'box',      args: [0.34, 0.36, 0.08],   pos: [0, 0.47, -0.055] },
    // Ribs (left)
    { id: 'ribs-l',     placement: 'Ribs',      type: 'box',      args: [0.045, 0.28, 0.13],  pos: [-0.18, 0.48, 0] },
    // Ribs (right)
    { id: 'ribs-r',     placement: 'Ribs',      type: 'box',      args: [0.045, 0.28, 0.13],  pos: [0.18, 0.48, 0] },
    // Shoulder (left)
    { id: 'shoulder-l', placement: 'Shoulder',  type: 'sphere',   args: [0.065, 16, 16],      pos: [-0.245, 0.64, 0] },
    // Shoulder (right)
    { id: 'shoulder-r', placement: 'Shoulder',  type: 'sphere',   args: [0.065, 16, 16],      pos: [0.245, 0.64, 0] },
    // Upper Arm (left)
    { id: 'uarm-l',     placement: 'Upper Arm', type: 'capsule',  args: [0.047, 0.17, 8, 16], pos: [-0.28, 0.44, 0] },
    // Upper Arm (right)
    { id: 'uarm-r',     placement: 'Upper Arm', type: 'capsule',  args: [0.047, 0.17, 8, 16], pos: [0.28, 0.44, 0] },
    // Forearm (left)
    { id: 'farm-l',     placement: 'Forearm',   type: 'capsule',  args: [0.04, 0.17, 8, 16],  pos: [-0.30, 0.20, 0] },
    // Forearm (right)
    { id: 'farm-r',     placement: 'Forearm',   type: 'capsule',  args: [0.04, 0.17, 8, 16],  pos: [0.30, 0.20, 0] },
    // Wrist (left)
    { id: 'wrist-l',    placement: 'Wrist',     type: 'sphere',   args: [0.033, 12, 12],      pos: [-0.31, 0.065, 0] },
    // Wrist (right)
    { id: 'wrist-r',    placement: 'Wrist',     type: 'sphere',   args: [0.033, 12, 12],      pos: [0.31, 0.065, 0] },
    // Hand (left)
    { id: 'hand-l',     placement: 'Hand',      type: 'box',      args: [0.05, 0.07, 0.025],  pos: [-0.31, -0.02, 0] },
    // Hand (right)
    { id: 'hand-r',     placement: 'Hand',      type: 'box',      args: [0.05, 0.07, 0.025],  pos: [0.31, -0.02, 0] },
    // Pelvis (non-clickable landmark)
    { id: 'pelvis',     placement: null,        type: 'box',      args: [0.30, 0.12, 0.16],   pos: [0, 0.22, 0] },
    // Thigh (left)
    { id: 'thigh-l',    placement: 'Thigh',     type: 'capsule',  args: [0.068, 0.24, 8, 16], pos: [-0.10, -0.01, 0] },
    // Thigh (right)
    { id: 'thigh-r',    placement: 'Thigh',     type: 'capsule',  args: [0.068, 0.24, 8, 16], pos: [0.10, -0.01, 0] },
    // Calf (left)
    { id: 'calf-l',     placement: 'Calf',      type: 'capsule',  args: [0.05, 0.24, 8, 16],  pos: [-0.10, -0.34, 0] },
    // Calf (right)
    { id: 'calf-r',     placement: 'Calf',      type: 'capsule',  args: [0.05, 0.24, 8, 16],  pos: [0.10, -0.34, 0] },
    // Ankle (left)
    { id: 'ankle-l',    placement: 'Ankle',     type: 'sphere',   args: [0.04, 12, 12],       pos: [-0.10, -0.53, 0] },
    // Ankle (right)
    { id: 'ankle-r',    placement: 'Ankle',     type: 'sphere',   args: [0.04, 12, 12],       pos: [0.10, -0.53, 0] },
];

/* ---------- Assembled mannequin ---------- */
function Mannequin({ selectedPlacements, onTogglePlacement, availablePlacements }) {
    const [hoveredPart, setHoveredPart] = useState(null);

    return (
        <group>
            {BODY_PARTS.map((part) => {
                const isClickable = !!part.placement && availablePlacements.includes(part.placement);
                const isSelected = !!part.placement && selectedPlacements.includes(part.placement);
                const isHovered = hoveredPart === part.placement;

                return (
                    <BodyPart
                        key={part.id}
                        name={part.placement || part.id}
                        position={part.pos}
                        geometryType={part.type}
                        geometryArgs={part.args}
                        isSelected={isSelected}
                        isHovered={isHovered && isClickable}
                        isClickable={isClickable}
                        onClick={onTogglePlacement}
                        onHover={(name) => setHoveredPart(name)}
                    />
                );
            })}
        </group>
    );
}

/* ---------- Exported viewer ---------- */
export default function BodyModelViewer({ selectedPlacements = [], onTogglePlacement, availablePlacements = [], height = 340 }) {
    return (
        <div style={{
            width: '100%',
            height: `${height}px`,
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
            position: 'relative',
            boxShadow: 'inset 0 0 40px rgba(193, 154, 107, 0.06)'
        }}>
            <Canvas
                camera={{ position: [0, 0.3, 2.1], fov: 38 }}
                style={{ width: '100%', height: '100%' }}
                gl={{ antialias: true }}
            >
                <ambientLight intensity={0.55} />
                <directionalLight position={[3, 4, 5]} intensity={0.75} />
                <directionalLight position={[-3, 2, -4]} intensity={0.3} />
                <pointLight position={[0, 1, 2.5]} intensity={0.35} color={BRAND_GOLD} />

                <Mannequin
                    selectedPlacements={selectedPlacements}
                    onTogglePlacement={onTogglePlacement}
                    availablePlacements={availablePlacements}
                />

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI * 3 / 4}
                    autoRotate
                    autoRotateSpeed={0.5}
                />
            </Canvas>

            {/* Hint label */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.35)',
                pointerEvents: 'none',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap'
            }}>
                Drag to rotate · Click body to select
            </div>
        </div>
    );
}
