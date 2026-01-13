import React, { useState, useEffect } from 'react';
import { Scene3D } from './components/Scene3D';
import { PlanManager } from './components/PlanManager';
import { ControlPanel } from './components/ControlPanel';
import { TrainingGuide } from './components/TrainingGuide';
import { ViewMode, AutoMode, DrillHole, HoleStatus, BoomState, AppMode } from './types';
import { INITIAL_DRILL_PLAN, TRAINING_MODULES } from './constants';
import { Activity, Signal, Clock, Hammer, GraduationCap, PlayCircle, Gamepad2 } from 'lucide-react';

export default function App() {
  // --- State ---
  const [appMode, setAppMode] = useState<AppMode>(AppMode.OPERATION);
  const [trainingStepIndex, setTrainingStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.THREE_D);
  const [drillPlan, setDrillPlan] = useState<DrillHole[]>(INITIAL_DRILL_PLAN);
  const [autoMode, setAutoMode] = useState<AutoMode>(AutoMode.IDLE);
  const [isScanning, setIsScanning] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stabilizersActive, setStabilizersActive] = useState(false);
  
  // Manual Control States
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedBoomId, setSelectedBoomId] = useState<'left' | 'mid' | 'right' | null>(null);

  // Machine Boom State
  // Initial positions are set to hover near the face (Z=0 is face, Boom Base is Z=4)
  // Manual Position (0,0,0) corresponds to idle tip position roughly at Z=1
  const [booms, setBooms] = useState<BoomState[]>([
    { 
        id: 'left', 
        label: '左臂 (No.1)', 
        active: false, 
        targetHoleId: null, 
        progress: 0,
        metrics: { percussionPressure: 0, feedPressure: 0, rotationSpeed: 0, waterFlow: false },
        manualPosition: { x: 0, y: 0, z: 0 } 
    },
    { 
        id: 'mid', 
        label: '中臂 (No.2)', 
        active: false, 
        targetHoleId: null, 
        progress: 0,
        metrics: { percussionPressure: 0, feedPressure: 0, rotationSpeed: 0, waterFlow: false },
        manualPosition: { x: 0, y: 0, z: 0 }
    },
    { 
        id: 'right', 
        label: '右臂 (No.3)', 
        active: false, 
        targetHoleId: null, 
        progress: 0,
        metrics: { percussionPressure: 0, feedPressure: 0, rotationSpeed: 0, waterFlow: false },
        manualPosition: { x: 0, y: 0, z: 0 }
    },
  ]);

  // --- Effects ---

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulation Logic: Drilling Physics and Data Fluctuation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    // Logic for Automatic Mode
    if (autoMode !== AutoMode.IDLE && !manualOverride) {
      interval = setInterval(() => {
        setDrillPlan(currentPlan => {
          const newPlan = [...currentPlan];
          const pending = newPlan.filter(h => h.status === HoleStatus.PENDING);
          
          // 1. Assign booms if idle
          booms.forEach((boom, index) => {
             if (!boom.active && pending.length > 0) {
                 // Simple logic: distribute holes
                 const target = pending[0];
                 
                 // Basic zone assignment logic
                 let assigned = false;
                 if (target.x < -1.5 && boom.id === 'left') assigned = true;
                 else if (target.x > 1.5 && boom.id === 'right') assigned = true;
                 else if (target.x >= -1.5 && target.x <= 1.5 && boom.id === 'mid') assigned = true;
                 
                 // Fallback if zones are empty
                 if (!assigned && pending.length < 3) assigned = true;

                 if (assigned) {
                     const targetIndex = newPlan.findIndex(h => h.id === target.id);
                     if(targetIndex !== -1) {
                         newPlan[targetIndex].status = HoleStatus.DRILLING;
                         setBooms(prev => {
                             const nextBooms = [...prev];
                             nextBooms[index] = { 
                                 ...boom, 
                                 active: true, 
                                 targetHoleId: target.id, 
                                 progress: 0,
                                 metrics: { percussionPressure: 110, feedPressure: 40, rotationSpeed: 180, waterFlow: true }
                             };
                             return nextBooms;
                         });
                     }
                 }
             }
          });
          return newPlan;
        });
      }, 500);
    }

    // Logic for Drilling Progress (Both Auto and Manual)
    const physicsInterval = setInterval(() => {
        setBooms(prevBooms => {
            return prevBooms.map(boom => {
                if (boom.active) {
                    // Simulate metrics fluctuation
                    const pFluctuation = Math.random() * 5;
                    const rFluctuation = Math.random() * 10 - 5;
                    
                    let newProgress = boom.progress;
                    
                    // Increment progress
                    // Speed depends on pressure (simulated)
                    if (newProgress < 100) {
                        newProgress += 0.5; // Drilling speed
                    } 

                    // Completion check
                    if (newProgress >= 100) {
                        // Mark hole as done in plan
                        setDrillPlan(plan => plan.map(h => h.id === boom.targetHoleId ? { ...h, status: HoleStatus.COMPLETED } : h));
                        
                        // If Auto Mode, reset boom. If Manual, keep it active until user stops.
                        if (!manualOverride) {
                            return {
                                ...boom,
                                active: false,
                                targetHoleId: null,
                                progress: 0,
                                metrics: { percussionPressure: 0, feedPressure: 0, rotationSpeed: 0, waterFlow: false }
                            };
                        }
                    }

                    return {
                        ...boom,
                        progress: newProgress,
                        metrics: {
                            percussionPressure: Math.floor(130 + pFluctuation),
                            feedPressure: Math.floor(55 + pFluctuation),
                            rotationSpeed: Math.floor(210 + rFluctuation),
                            waterFlow: true
                        }
                    };
                }
                return boom;
            });
        });
    }, 50);

    return () => {
        clearInterval(interval);
        clearInterval(physicsInterval);
    };
  }, [autoMode, manualOverride]);


  // --- Handlers ---

  const handleHoleClick = (id: string) => {
    // In manual mode, clicking a hole targets it for the selected boom (Auto-Align helper)
    if (manualOverride && selectedBoomId) {
        setBooms(prev => prev.map(b => b.id === selectedBoomId ? { ...b, targetHoleId: id } : b));
        return;
    }

    setDrillPlan(prev => prev.map(h => {
        if (h.id === id) {
            if (h.status === HoleStatus.PENDING) return { ...h, status: HoleStatus.TARGETED };
            if (h.status === HoleStatus.TARGETED) return { ...h, status: HoleStatus.PENDING };
        }
        return h;
    }));
  };

  const handleImportPlan = () => {
      const resetPlan = INITIAL_DRILL_PLAN.map(h => ({...h, status: HoleStatus.PENDING}));
      setDrillPlan(resetPlan);
      if (appMode === AppMode.TRAINING && TRAINING_MODULES[trainingStepIndex].id === 4) {
          setTrainingStepIndex(prev => Math.min(prev + 1, TRAINING_MODULES.length - 1));
      }
  };

  const handleToggleScan = () => {
      setIsScanning(!isScanning);
      if (!isScanning) setTimeout(() => setIsScanning(false), 5000);
  };

  // Cartesian Control Handler
  const handleManualControl = (action: string, value: any) => {
      if (!selectedBoomId) return;

      setBooms(prev => prev.map(b => {
          if (b.id !== selectedBoomId) return b;
          const pos = b.manualPosition;
          
          switch(action) {
              case 'moveX': // Left/Right
                  return { ...b, manualPosition: { ...pos, x: Math.max(-2.5, Math.min(2.5, pos.x + value * 0.05)) } };
              case 'moveY': // Up/Down
                  return { ...b, manualPosition: { ...pos, y: Math.max(-1.5, Math.min(2.5, pos.y + value * 0.05)) } };
              case 'extend': // Boom Extension (Z axis towards face)
                  // target Z moves closer to 0 (face) from positive side
                  // We simulate "pushing" forward
                  return { ...b, manualPosition: { ...pos, z: Math.max(-1, Math.min(3, pos.z + value * 0.05)) } };
              case 'toggleDrill':
                  const isActive = !b.active;
                  return { 
                      ...b, 
                      active: isActive,
                      metrics: isActive ? { percussionPressure: 120, feedPressure: 55, rotationSpeed: 180, waterFlow: true } 
                                        : { percussionPressure: 0, feedPressure: 0, rotationSpeed: 0, waterFlow: false }
                  };
              default: return b;
          }
      }));
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 relative">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-amber-500">
                <Hammer size={24} />
                <div className="text-xl font-black tracking-widest uppercase">TunnelMaster <span className="text-white font-light">Pro</span></div>
            </div>
            <div className="h-6 w-px bg-slate-700 mx-2"></div>
            <div className="text-xs text-slate-400 font-mono flex gap-4">
                <span>PROJECT: <span className="text-white font-bold">ALPINE-WEST</span></span>
                <span>UNIT: <span className="text-white font-bold">DJ3E-057</span></span>
            </div>
        </div>

        {/* App Mode Switcher */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 p-1 rounded-lg flex gap-1 border border-slate-700">
            <button 
                onClick={() => setAppMode(AppMode.OPERATION)}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-md transition-all ${appMode === AppMode.OPERATION ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                <PlayCircle size={14} /> 实操模式
            </button>
            <button 
                onClick={() => setAppMode(AppMode.TRAINING)}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-md transition-all ${appMode === AppMode.TRAINING ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                <GraduationCap size={14} /> 教学模式
            </button>
        </div>

        <div className="flex items-center gap-6 text-sm font-mono text-slate-400">
             <div className="flex items-center gap-2">
                {manualOverride ? <Gamepad2 size={16} className="text-purple-400"/> : <Activity size={16} className={autoMode !== AutoMode.IDLE ? "text-amber-500 animate-pulse" : ""} />}
                <span>{manualOverride ? "手动接管" : (autoMode !== AutoMode.IDLE ? "自动作业" : "系统就绪")}</span>
             </div>
             <div className="flex items-center gap-2">
                <Signal size={16} className={remoteStatus === 'connected' ? "text-blue-400" : "text-slate-600"} />
                <span>{remoteStatus === 'connected' ? "ToDesk在线" : "本地控制"}</span>
             </div>
             <div className="flex items-center gap-2 text-slate-200 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                <Clock size={14} />
                <span>{currentTime.toLocaleTimeString()}</span>
             </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 relative">
        <aside className="w-80 shrink-0 flex flex-col gap-4">
             <PlanManager 
                holes={drillPlan} 
                onImport={handleImportPlan} 
                onHoleSelect={handleHoleClick}
                highlightId={appMode === AppMode.TRAINING ? TRAINING_MODULES[trainingStepIndex].actionTarget : undefined}
             />
             
             {/* Enhanced System Diagnostics (Real-time data) */}
             <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex-1 flex flex-col overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex justify-between items-center">
                    <span>钻臂实时监控</span>
                    {manualOverride && <span className="text-[10px] text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded">虚拟台启用</span>}
                </h3>
                <div className="space-y-4 flex-1">
                    {booms.map(b => (
                        <div 
                            key={b.id} 
                            onClick={() => { setSelectedBoomId(b.id); setManualOverride(true); setAutoMode(AutoMode.IDLE); }}
                            className={`text-xs bg-slate-800/50 p-3 rounded border cursor-pointer transition-all hover:bg-slate-800
                                ${selectedBoomId === b.id && manualOverride ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-700/50'}
                            `}
                        >
                            <div className="flex justify-between mb-2">
                                <span className={`font-bold text-sm ${selectedBoomId === b.id && manualOverride ? 'text-purple-300' : 'text-slate-200'}`}>{b.label}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${b.active ? "bg-amber-900 text-amber-200 animate-pulse" : "bg-slate-700 text-slate-400"}`}>
                                    {b.active ? `钻进中` : "待机"}
                                </span>
                            </div>
                            
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] text-slate-400 font-mono">
                                <div className="flex flex-col bg-slate-900 p-1.5 rounded">
                                    <span className="scale-75 origin-left opacity-70">冲击压力</span>
                                    <span className={`font-bold ${b.active ? 'text-amber-400' : 'text-slate-600'}`}>{b.metrics.percussionPressure} bar</span>
                                </div>
                                <div className="flex flex-col bg-slate-900 p-1.5 rounded">
                                    <span className="scale-75 origin-left opacity-70">推进压力</span>
                                    <span className={`font-bold ${b.active ? 'text-green-400' : 'text-slate-600'}`}>{b.metrics.feedPressure} bar</span>
                                </div>
                            </div>

                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>进度</span>
                                <span>{b.progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-100 ${b.active ? 'bg-amber-500' : 'bg-slate-600'}`} 
                                    style={{ width: `${b.active ? b.progress : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </aside>

        <main className="flex-1 relative flex flex-col min-w-0">
             <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-none">
                 <div className="bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-md text-xs font-bold text-white shadow-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {viewMode === ViewMode.MAIN ? '凿岩主视图' : viewMode === ViewMode.THREE_D ? '凿岩三维图' : '凿岩辅视图'}
                 </div>
                 {manualOverride && (
                     <div className="bg-purple-900/90 backdrop-blur border border-purple-500 px-3 py-1.5 rounded-md text-xs font-bold text-purple-100 shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                        <Gamepad2 size={14} /> 手动模式 (M9虚拟台)
                     </div>
                 )}
                 {autoMode !== AutoMode.IDLE && !manualOverride && (
                     <div className="bg-amber-900/90 backdrop-blur border border-amber-500 px-3 py-1.5 rounded-md text-xs font-bold text-amber-100 shadow-lg border-l-4 border-l-amber-500">
                        {autoMode === AutoMode.PLANAR ? '基准底平齐' : autoMode === AutoMode.EQUAL_DEPTH ? '孔等深' : '按布孔图'}
                     </div>
                 )}
             </div>

             <div className="flex-1 h-full rounded-xl overflow-hidden border-2 border-slate-800 shadow-2xl relative bg-black">
                 <Scene3D 
                    holes={drillPlan} 
                    booms={booms} 
                    onHoleClick={handleHoleClick}
                    showScan={isScanning}
                    viewMode={viewMode}
                    visualTarget={appMode === AppMode.TRAINING ? TRAINING_MODULES[trainingStepIndex].visualTarget : undefined}
                    manualOverride={manualOverride}
                 />
                 
                 {/* Crosshair Overlay for Manual Mode */}
                 {manualOverride && (
                     <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                         <div className="w-8 h-8 border border-white/50 rounded-full flex items-center justify-center">
                             <div className="w-1 h-1 bg-white rounded-full"></div>
                         </div>
                     </div>
                 )}

                 {appMode === AppMode.TRAINING && (
                     <TrainingGuide 
                        currentStep={TRAINING_MODULES[trainingStepIndex]}
                        totalSteps={TRAINING_MODULES.length}
                        onNext={() => setTrainingStepIndex(prev => Math.min(prev + 1, TRAINING_MODULES.length - 1))}
                        onPrev={() => setTrainingStepIndex(prev => Math.max(prev - 1, 0))}
                     />
                 )}
             </div>
        </main>

        <aside className="w-72 shrink-0">
            <ControlPanel 
                currentView={viewMode}
                setView={setViewMode}
                autoMode={autoMode}
                setAutoMode={(m) => { setAutoMode(m); if (m !== AutoMode.IDLE) setManualOverride(false); }}
                toggleScan={handleToggleScan}
                isScanning={isScanning}
                remoteStatus={remoteStatus}
                toggleRemote={() => setRemoteStatus(prev => prev === 'connected' ? 'disconnected' : 'connected')}
                highlightId={appMode === AppMode.TRAINING ? TRAINING_MODULES[trainingStepIndex].actionTarget : undefined}
                onStabilizerToggle={() => setStabilizersActive(!stabilizersActive)}
                stabilizersActive={stabilizersActive}
                manualOverride={manualOverride}
                onManualControl={handleManualControl}
                selectedBoomId={selectedBoomId}
            />
        </aside>

      </div>
    </div>
  );
}