import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { DrillHole, HoleStatus, BoomState, ViewMode } from '../types';
import { TUNNEL_DEPTH } from '../constants';

// --- Visual Effects ---

const DrillingEffects = ({ active, waterFlow }: { active: boolean; waterFlow: boolean }) => {
    const count = 40;
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8,
                Math.random() * 0.5 + 0.5 
            ),
            position: new THREE.Vector3(0, 0, 0),
            life: Math.random()
        }));
    }, []);

    useFrame(() => {
        if (!mesh.current) return;

        particles.forEach((particle, i) => {
            if (active) {
                if (particle.life <= 0) {
                    particle.life = 1;
                    particle.position.set(0, 0, -4.5); // Emit from drill tip
                }
                particle.position.add(particle.velocity);
                particle.life -= 0.05;
                dummy.position.copy(particle.position);
                const scale = particle.life * 0.2;
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial 
                color={waterFlow ? "#a5f3fc" : "#a8a29e"} 
                transparent 
                opacity={0.5} 
            />
        </instancedMesh>
    );
};

// --- Sub-components ---

const CameraController = ({ mode }: { mode: ViewMode }) => {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);

    React.useEffect(() => {
        if (mode === ViewMode.MAIN) {
            camera.position.set(0, 0, 14);
            controlsRef.current?.target.set(0, 0, 0);
        } else if (mode === ViewMode.THREE_D) {
            camera.position.set(8, 5, 12);
            controlsRef.current?.target.set(0, 0, -2);
        } else if (mode === ViewMode.AUX) {
            camera.position.set(0, 10, 5);
            controlsRef.current?.target.set(0, 0, -5);
        }
    }, [mode, camera]);

    return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />;
};

const TunnelWireframe: React.FC<{ scanMode: boolean }> = ({ scanMode }) => {
  const points = useMemo(() => {
    const pts = [];
    const radius = 4.5;
    const segments = 32;
    for (let z = 0; z > -TUNNEL_DEPTH; z -= 2) {
        const loop = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (Math.PI / segments) * i;
            loop.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z));
        }
        pts.push(loop);
    }
    return pts;
  }, []);

  return (
    <group>
      {points.map((loop, idx) => (
        <Line key={idx} points={loop} color={scanMode ? "#22d3ee" : "#334155"} lineWidth={1} />
      ))}
       <gridHelper args={[10, 10, 0x1e293b, 0x0f172a]} position={[0, -0.1, -TUNNEL_DEPTH/2]} scale={[1, 1, 1]} />
    </group>
  );
};

const HoleMarker: React.FC<{ hole: DrillHole; onClick: (id: string) => void }> = ({ hole, onClick }) => {
    const color = useMemo(() => {
        switch (hole.status) {
            case HoleStatus.COMPLETED: return '#22c55e';
            case HoleStatus.TARGETED: return '#ef4444';
            case HoleStatus.DRILLING: return '#f59e0b';
            default: return '#64748b';
        }
    }, [hole.status]);

    return (
        <group position={[hole.x, hole.y, 0]}>
            <mesh onClick={(e) => { e.stopPropagation(); onClick(hole.id); }}>
                <ringGeometry args={[0.1, 0.15, 16]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
            <Line 
                points={[[0, 0, 0], [0, 0, -hole.depth]]} 
                color={color} 
                opacity={0.3} 
                transparent 
                lineWidth={1} 
                dashed
            />
            {hole.status === HoleStatus.TARGETED && (
                 <Text position={[0, 0.25, 0]} fontSize={0.2} color="#ef4444" anchorX="center" anchorY="middle">
                    {hole.sequence}
                 </Text>
            )}
        </group>
    );
};

// --- Robotic Arm Component with Parallel Holding IK ---
interface BoomArmProps {
    state: BoomState;
    baseX: number;
    targetHole?: DrillHole;
    manualOverride: boolean;
}

const BoomArm: React.FC<BoomArmProps> = ({ state, baseX, targetHole, manualOverride }) => {
    const armRef = useRef<THREE.Mesh>(null);
    const feedBeamGroupRef = useRef<THREE.Group>(null);
    const drifterRef = useRef<THREE.Mesh>(null);
    const drillSteelRef = useRef<THREE.Group>(null);

    useFrame((stateCtx) => {
        // --- 1. Determine Target Tip Position ---
        const targetTip = new THREE.Vector3();
        
        if (manualOverride && state.manualPosition) {
            // Manual: Base default + offset
            // Base default tip roughly at (baseX, 0, 1) when neutral
            targetTip.set(
                baseX + state.manualPosition.x,
                state.manualPosition.y,
                1 - state.manualPosition.z // Z decreases (goes to 0) as we extend
            );
        } else if (targetHole) {
            // Auto: Target is the hole center
            targetTip.set(targetHole.x, targetHole.y, 0);
        } else {
            // Idle
            targetTip.set(baseX, -0.5, 2 + Math.sin(stateCtx.clock.elapsedTime)*0.1);
        }

        // --- 2. Position Feed Beam (Parallel Holding) ---
        // The beam is 4.5m long. The drill tip is near the end.
        // We assume beam is parallel to Z axis for face drilling.
        // If Tip is at targetTip, and Beam is parallel to Z,
        // The center of the beam group needs to be placed such that the tip lands on targetTip.
        // Let's say Drill Tip is at local (0, 0, -4.2) inside the FeedBeamGroup.
        // To put Tip at targetTip, FeedBeamGroup pos = targetTip + (0,0,4.2)
        
        const drillTipOffset = 4.2;
        
        if (feedBeamGroupRef.current) {
            feedBeamGroupRef.current.position.set(
                targetTip.x,
                targetTip.y,
                targetTip.z + drillTipOffset
            );
            // Ensure parallel holding (Straight into face)
            feedBeamGroupRef.current.rotation.set(0, 0, 0);
        }

        // --- 3. Position & Scale Main Arm (Connecting Base to Beam) ---
        // Base Pivot is at (baseX, -1.5, 4)
        if (armRef.current && feedBeamGroupRef.current) {
            const basePos = new THREE.Vector3(baseX, -1.5, 4);
            const beamMountPos = feedBeamGroupRef.current.position.clone().add(new THREE.Vector3(0, 0, 0)); // Connect to beam center
            
            // Position arm halfway
            const mid = new THREE.Vector3().addVectors(basePos, beamMountPos).multiplyScalar(0.5);
            armRef.current.position.copy(mid);
            
            // Point arm at beam
            armRef.current.lookAt(beamMountPos);
            
            // Scale to fit
            const len = basePos.distanceTo(beamMountPos);
            armRef.current.scale.z = len;
        }

        // --- 4. Drill Animation (Penetration) ---
        if (drifterRef.current && drillSteelRef.current) {
            if (state.active) {
                // Rotation
                drillSteelRef.current.rotation.z += 0.3;
                // Vibration
                drillSteelRef.current.position.x = Math.sin(stateCtx.clock.elapsedTime * 50) * 0.005;
                
                // Feed Stroke: Move from 0 to -3.5 (Max depth)
                // -Z is forward/into rock in local space here
                const stroke = (state.progress / 100) * 3.5;
                drifterRef.current.position.z = -stroke;
                drillSteelRef.current.position.z = -stroke;
            } else {
                // Retract
                drifterRef.current.position.z = THREE.MathUtils.lerp(drifterRef.current.position.z, 0, 0.1);
                drillSteelRef.current.position.z = THREE.MathUtils.lerp(drillSteelRef.current.position.z, 0, 0.1);
            }
        }
    });

    return (
        <group>
            {/* Boom Base Fixed */}
            <mesh position={[baseX, -1.5, 4]}>
                <sphereGeometry args={[0.4]} />
                <meshStandardMaterial color="#334155" />
            </mesh>

            {/* Telescopic/Main Arm (Visual Link) */}
            <mesh ref={armRef}>
                <boxGeometry args={[0.35, 0.35, 1]} /> {/* Length 1, scaled dynamically */}
                <meshStandardMaterial color="#eab308" />
            </mesh>

            {/* Feed Beam Group */}
            <group ref={feedBeamGroupRef}>
                {/* Joint at mount point */}
                <mesh>
                    <sphereGeometry args={[0.3]} />
                    <meshStandardMaterial color="#475569" />
                </mesh>

                {/* The Beam Rail */}
                <mesh position={[0, -0.3, -2]}>
                    <boxGeometry args={[0.4, 0.15, 4.8]} />
                    <meshStandardMaterial color="#334155" />
                </mesh>

                {/* Drifter (Hammer) */}
                <mesh ref={drifterRef} position={[0, 0, 0]}>
                    <boxGeometry args={[0.35, 0.35, 0.9]} />
                    <meshStandardMaterial color="#dc2626" />
                </mesh>

                {/* Drill Steel & Bit */}
                <group ref={drillSteelRef}>
                    <mesh position={[0, 0, -2]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
                        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
                    </mesh>
                    {/* Drill Bit */}
                    <mesh position={[0, 0, -4.1]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.08, 0.08, 0.25, 6]} />
                        <meshStandardMaterial color="#cbd5e1" />
                    </mesh>
                    <DrillingEffects active={state.active} waterFlow={state.metrics.waterFlow} />
                </group>

                {/* Label */}
                <Html position={[0, 0.8, 0]}>
                    <div className={`px-2 py-1 text-[9px] font-mono rounded border backdrop-blur-sm whitespace-nowrap ${state.active ? 'bg-amber-900/80 border-amber-500 text-amber-100' : 'bg-slate-800/60 border-slate-600 text-slate-400'}`}>
                        {state.label}
                    </div>
                </Html>
            </group>
        </group>
    );
};

interface Scene3DProps {
  holes: DrillHole[];
  booms: BoomState[];
  onHoleClick: (id: string) => void;
  showScan: boolean;
  viewMode: ViewMode;
  visualTarget?: 'stabilizers' | 'engine' | 'booms' | 'zone';
  manualOverride: boolean;
}

export const Scene3D: React.FC<Scene3DProps> = ({ holes, booms, onHoleClick, showScan, viewMode, visualTarget, manualOverride }) => {
    return (
        <div className="w-full h-full bg-gradient-to-b from-slate-900 to-black rounded-lg overflow-hidden border border-slate-700 shadow-inner relative">
            <Canvas camera={{ position: [0, 2, 12], fov: 40 }} shadows>
                <ambientLight intensity={0.4} />
                <pointLight position={[5, 5, 5]} intensity={0.8} />
                <spotLight position={[0, 5, 10]} angle={0.5} penumbra={1} intensity={1} castShadow />
                
                <CameraController mode={viewMode} />
                <TunnelWireframe scanMode={showScan} />
                
                {showScan && <points>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={1000}
                            array={new Float32Array(3000).map(() => (Math.random() - 0.5) * 10)}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <pointsMaterial size={0.05} color="#00ffcc" transparent opacity={0.5} />
                </points>}

                {holes.map(hole => (
                    <HoleMarker key={hole.id} hole={hole} onClick={onHoleClick} />
                ))}

                <BoomArm state={booms[0]} baseX={-1.8} targetHole={holes.find(h => h.id === booms[0].targetHoleId)} manualOverride={manualOverride} />
                <BoomArm state={booms[1]} baseX={0} targetHole={holes.find(h => h.id === booms[1].targetHoleId)} manualOverride={manualOverride} />
                <BoomArm state={booms[2]} baseX={1.8} targetHole={holes.find(h => h.id === booms[2].targetHoleId)} manualOverride={manualOverride} />

                {visualTarget === 'zone' && (
                    <mesh position={[0, -2, 4]} rotation={[-Math.PI/2, 0, 0]}>
                        <ringGeometry args={[2, 3.5, 32]} />
                        <meshBasicMaterial color="red" opacity={0.2} transparent side={THREE.DoubleSide} />
                    </mesh>
                )}
                
                <gridHelper args={[20, 20, 0x1e293b, 0x0f172a]} position={[0, -2, -5]} />
            </Canvas>
            
            <div className="absolute bottom-4 right-4 pointer-events-none">
                <div className="flex flex-col items-end gap-1">
                    <div className="h-px w-24 bg-slate-500 relative">
                        <div className="absolute -top-4 right-0 text-[10px] text-slate-500 font-mono">2m</div>
                        <div className="absolute h-2 w-px bg-slate-500 left-0 -top-1"></div>
                        <div className="absolute h-2 w-px bg-slate-500 right-0 -top-1"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};