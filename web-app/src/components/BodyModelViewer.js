import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const BRAND_GOLD = '#be9055';
const BRAND_GOLD_EMISSIVE = '#8B6914';
const DIAMOND_BLUE = '#4FC3F7';
const DIAMOND_BLUE_EMISSIVE = '#0277BD';
const DEFAULT_COLOR = '#e8ddd0';
const HOVER_COLOR = '#d4c4b0';
const LANDMARK_COLOR = '#cdc5ba';

/* ---------- Individual clickable body part ---------- */
function BodyPart({ name, category, position, rotation, geometryType, geometryArgs, isSelected, isHovered, isClickable, onClick, onHover }) {
    const geometry = useMemo(() => {
        switch (geometryType) {
            case 'sphere':   return new THREE.SphereGeometry(...geometryArgs);
            case 'capsule':  return new THREE.CapsuleGeometry(...geometryArgs);
            case 'box':      return new THREE.BoxGeometry(...geometryArgs);
            case 'cylinder': return new THREE.CylinderGeometry(...geometryArgs);
            default:         return new THREE.BoxGeometry(0.1, 0.1, 0.1);
        }
    }, [geometryType, geometryArgs]);

    const highlightColor = category === 'piercing' ? DIAMOND_BLUE : BRAND_GOLD;
    const emissiveColor = category === 'piercing' ? DIAMOND_BLUE_EMISSIVE : BRAND_GOLD_EMISSIVE;

    let color = LANDMARK_COLOR;
    if (isClickable) color = isSelected ? highlightColor : (isHovered ? HOVER_COLOR : DEFAULT_COLOR);

    return (
        <mesh
            geometry={geometry}
            position={position}
            rotation={rotation || [0, 0, 0]}
            onClick={(e) => { e.stopPropagation(); if (isClickable) onClick(name, category); }}
            onPointerOver={(e) => { e.stopPropagation(); if (isClickable) { onHover(name); document.body.style.cursor = 'pointer'; } }}
            onPointerOut={(e) => { e.stopPropagation(); if (isClickable) { onHover(null); document.body.style.cursor = 'default'; } }}
        >
            <meshStandardMaterial
                color={color}
                emissive={isSelected ? emissiveColor : '#000000'}
                emissiveIntensity={isSelected ? 0.45 : 0}
                roughness={0.50}
                metalness={isSelected ? 0.25 : 0.05}
            />
        </mesh>
    );
}

/* ---------- Body part definitions (remodeled humanoid) ---------- */
const BODY_PARTS = [
    // ========== HEAD & SKULL ==========
    { id: 'skull',      placement: null,       category: null,      type: 'sphere',   args: [0.155, 32, 32],       pos: [0, 0.92, 0] },
    { id: 'face',       placement: 'Face',     category: 'tattoo',  type: 'sphere',   args: [0.10, 24, 24],        pos: [0, 0.89, 0.10] },

    // ========== PIERCING LANDMARKS (face/ear) ==========
    // Ears
    { id: 'earlobe-l',    placement: 'Ear Lobe',    category: 'piercing', type: 'sphere', args: [0.025, 12, 12], pos: [-0.17, 0.84, 0] },
    { id: 'earlobe-r',    placement: 'Ear Lobe',    category: 'piercing', type: 'sphere', args: [0.025, 12, 12], pos: [0.17, 0.84, 0] },
    { id: 'helix-l',      placement: 'Helix',       category: 'piercing', type: 'sphere', args: [0.02, 10, 10],  pos: [-0.17, 0.97, 0] },
    { id: 'helix-r',      placement: 'Helix',       category: 'piercing', type: 'sphere', args: [0.02, 10, 10],  pos: [0.17, 0.97, 0] },
    { id: 'tragus-l',     placement: 'Tragus',      category: 'piercing', type: 'sphere', args: [0.018, 10, 10], pos: [-0.14, 0.89, 0.05] },
    { id: 'tragus-r',     placement: 'Tragus',      category: 'piercing', type: 'sphere', args: [0.018, 10, 10], pos: [0.14, 0.89, 0.05] },
    { id: 'conch-l',      placement: 'Conch',       category: 'piercing', type: 'sphere', args: [0.02, 10, 10],  pos: [-0.17, 0.90, 0] },
    { id: 'conch-r',      placement: 'Conch',       category: 'piercing', type: 'sphere', args: [0.02, 10, 10],  pos: [0.17, 0.90, 0] },
    { id: 'industrial-l', placement: 'Industrial',  category: 'piercing', type: 'capsule', args: [0.012, 0.04, 6, 8], pos: [-0.165, 0.95, 0.01], rot: [0, 0, 0.3] },
    { id: 'industrial-r', placement: 'Industrial',  category: 'piercing', type: 'capsule', args: [0.012, 0.04, 6, 8], pos: [0.165, 0.95, 0.01], rot: [0, 0, -0.3] },
    // Face piercings
    { id: 'nostril-l',    placement: 'Nostril',     category: 'piercing', type: 'sphere', args: [0.016, 10, 10], pos: [-0.03, 0.86, 0.145] },
    { id: 'nostril-r',    placement: 'Nostril',     category: 'piercing', type: 'sphere', args: [0.016, 10, 10], pos: [0.03, 0.86, 0.145] },
    { id: 'septum',       placement: 'Septum',      category: 'piercing', type: 'sphere', args: [0.014, 10, 10], pos: [0, 0.845, 0.15] },
    { id: 'eyebrow-l',    placement: 'Eyebrow',     category: 'piercing', type: 'sphere', args: [0.018, 10, 10], pos: [-0.06, 0.95, 0.12] },
    { id: 'eyebrow-r',    placement: 'Eyebrow',     category: 'piercing', type: 'sphere', args: [0.018, 10, 10], pos: [0.06, 0.95, 0.12] },
    { id: 'lip',          placement: 'Lip/Oral',    category: 'piercing', type: 'sphere', args: [0.02, 10, 10],  pos: [0, 0.81, 0.13] },

    // ========== NECK ==========
    { id: 'neck',       placement: 'Neck',     category: 'tattoo',  type: 'cylinder', args: [0.055, 0.065, 0.10, 16], pos: [0, 0.74, 0] },

    // ========== TORSO (wider, more anatomical) ==========
    { id: 'chest',      placement: 'Chest',    category: 'tattoo',  type: 'box', args: [0.42, 0.34, 0.09], pos: [0, 0.50, 0.06] },
    { id: 'back',       placement: 'Back',     category: 'tattoo',  type: 'box', args: [0.42, 0.34, 0.09], pos: [0, 0.50, -0.06] },
    { id: 'ribs-l',     placement: 'Ribs',     category: 'tattoo',  type: 'box', args: [0.05, 0.26, 0.14], pos: [-0.22, 0.51, 0] },
    { id: 'ribs-r',     placement: 'Ribs',     category: 'tattoo',  type: 'box', args: [0.05, 0.26, 0.14], pos: [0.22, 0.51, 0] },

    // Torso piercing landmarks
    { id: 'nipple-l',   placement: 'Nipple',   category: 'piercing', type: 'sphere', args: [0.018, 10, 10], pos: [-0.11, 0.56, 0.105] },
    { id: 'nipple-r',   placement: 'Nipple',   category: 'piercing', type: 'sphere', args: [0.018, 10, 10], pos: [0.11, 0.56, 0.105] },
    { id: 'navel',      placement: 'Navel',    category: 'piercing', type: 'sphere', args: [0.022, 12, 12], pos: [0, 0.30, 0.10] },

    // ========== SHOULDERS & ARMS ==========
    { id: 'shoulder-l', placement: 'Shoulder', category: 'tattoo', type: 'sphere',  args: [0.075, 16, 16],      pos: [-0.295, 0.66, 0] },
    { id: 'shoulder-r', placement: 'Shoulder', category: 'tattoo', type: 'sphere',  args: [0.075, 16, 16],      pos: [0.295, 0.66, 0] },
    { id: 'uarm-l',     placement: 'Upper Arm', category: 'tattoo', type: 'capsule', args: [0.052, 0.18, 8, 16], pos: [-0.33, 0.45, 0] },
    { id: 'uarm-r',     placement: 'Upper Arm', category: 'tattoo', type: 'capsule', args: [0.052, 0.18, 8, 16], pos: [0.33, 0.45, 0] },
    { id: 'farm-l',     placement: 'Forearm',  category: 'tattoo', type: 'capsule', args: [0.044, 0.18, 8, 16], pos: [-0.35, 0.20, 0] },
    { id: 'farm-r',     placement: 'Forearm',  category: 'tattoo', type: 'capsule', args: [0.044, 0.18, 8, 16], pos: [0.35, 0.20, 0] },
    { id: 'wrist-l',    placement: 'Wrist',    category: 'tattoo', type: 'sphere',  args: [0.036, 12, 12],      pos: [-0.36, 0.06, 0] },
    { id: 'wrist-r',    placement: 'Wrist',    category: 'tattoo', type: 'sphere',  args: [0.036, 12, 12],      pos: [0.36, 0.06, 0] },
    { id: 'hand-l',     placement: 'Hand',     category: 'tattoo', type: 'box',     args: [0.055, 0.075, 0.028], pos: [-0.36, -0.025, 0] },
    { id: 'hand-r',     placement: 'Hand',     category: 'tattoo', type: 'box',     args: [0.055, 0.075, 0.028], pos: [0.36, -0.025, 0] },

    // ========== PELVIS (non-clickable landmark, wider) ==========
    { id: 'pelvis', placement: null, category: null, type: 'box', args: [0.36, 0.12, 0.18], pos: [0, 0.24, 0] },

    // ========== LEGS ==========
    { id: 'thigh-l',  placement: 'Thigh', category: 'tattoo', type: 'capsule', args: [0.072, 0.25, 8, 16], pos: [-0.12, -0.01, 0] },
    { id: 'thigh-r',  placement: 'Thigh', category: 'tattoo', type: 'capsule', args: [0.072, 0.25, 8, 16], pos: [0.12, -0.01, 0] },
    { id: 'calf-l',   placement: 'Calf',  category: 'tattoo', type: 'capsule', args: [0.054, 0.25, 8, 16], pos: [-0.12, -0.35, 0] },
    { id: 'calf-r',   placement: 'Calf',  category: 'tattoo', type: 'capsule', args: [0.054, 0.25, 8, 16], pos: [0.12, -0.35, 0] },
    { id: 'ankle-l',  placement: 'Ankle', category: 'tattoo', type: 'sphere',  args: [0.042, 12, 12],      pos: [-0.12, -0.55, 0] },
    { id: 'ankle-r',  placement: 'Ankle', category: 'tattoo', type: 'sphere',  args: [0.042, 12, 12],      pos: [0.12, -0.55, 0] },
    // Feet (non-clickable landmarks)
    { id: 'foot-l',   placement: null,    category: null,     type: 'box',     args: [0.055, 0.03, 0.10],  pos: [-0.12, -0.60, 0.025] },
    { id: 'foot-r',   placement: null,    category: null,     type: 'box',     args: [0.055, 0.03, 0.10],  pos: [0.12, -0.60, 0.025] },
];

/* ---------- Assembled mannequin ---------- */
function Mannequin({ selectedTattoo, selectedPiercing, onToggle, tattooParts, piercingParts }) {
    const [hoveredPart, setHoveredPart] = useState(null);

    return (
        <group>
            {BODY_PARTS.map((part) => {
                const isTattooPart = part.category === 'tattoo' && tattooParts.includes(part.placement);
                const isPiercingPart = part.category === 'piercing' && piercingParts.includes(part.placement);
                const isClickable = isTattooPart || isPiercingPart;

                const isSelected = (isTattooPart && selectedTattoo.includes(part.placement))
                    || (isPiercingPart && selectedPiercing.includes(part.placement));
                const isHovered = hoveredPart === part.placement;

                return (
                    <BodyPart
                        key={part.id}
                        name={part.placement || part.id}
                        category={part.category}
                        position={part.pos}
                        rotation={part.rot}
                        geometryType={part.type}
                        geometryArgs={part.args}
                        isSelected={isSelected}
                        isHovered={isHovered && isClickable}
                        isClickable={isClickable}
                        onClick={onToggle}
                        onHover={(name) => setHoveredPart(name)}
                    />
                );
            })}
        </group>
    );
}

/* ---------- Exported viewer ---------- */
export default function BodyModelViewer({
    selectedTattoo = [],
    selectedPiercing = [],
    onToggle,
    tattooParts = [],
    piercingParts = [],
    height = 340
}) {
    return (
        <div style={{
            width: '100%',
            height: `${height}px`,
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #1e1e1e 0%, #141414 50%, #0d0d0d 100%)',
            position: 'relative',
            boxShadow: 'inset 0 0 40px rgba(193, 154, 107, 0.04)'
        }}>
            <Canvas
                camera={{ position: [0, 0.15, 3.0], fov: 40 }}
                style={{ width: '100%', height: '100%' }}
                gl={{ antialias: true }}
            >
                <ambientLight intensity={0.55} />
                <directionalLight position={[3, 4, 5]} intensity={0.75} />
                <directionalLight position={[-3, 2, -4]} intensity={0.3} />
                <pointLight position={[0, 1, 2.5]} intensity={0.35} color={BRAND_GOLD} />

                <Mannequin
                    selectedTattoo={selectedTattoo}
                    selectedPiercing={selectedPiercing}
                    onToggle={onToggle}
                    tattooParts={tattooParts}
                    piercingParts={piercingParts}
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
