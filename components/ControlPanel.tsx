import React, { useRef } from 'react';
import { ViewMode, AutoMode } from '../types';
import { 
    Layout, Box, Layers, Settings, AlignEndHorizontal, Grid3X3, ArrowDownToLine,
    ScanLine, StopCircle, Wifi, Gamepad, RotateCw, Power, 
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MoveHorizontal, MoveVertical
} from 'lucide-react';

interface ControlPanelProps {
    currentView: ViewMode;
    setView: (v: ViewMode) => void;
    autoMode: AutoMode;
    setAutoMode: (m: AutoMode) => void;
    toggleScan: () => void;
    isScanning: boolean;
    remoteStatus: 'connected' | 'disconnected';
    toggleRemote: () => void;
    highlightId?: string; 
    onStabilizerToggle: () => void; 
    stabilizersActive: boolean;
    manualOverride: boolean;
    onManualControl: (action: string, value: any) => void;
    selectedBoomId: string | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    currentView,
    setView,
    autoMode,
    setAutoMode,
    toggleScan,
    isScanning,
    remoteStatus,
    toggleRemote,
    highlightId,
    onStabilizerToggle,
    stabilizersActive,
    manualOverride,
    onManualControl,
    selectedBoomId
}) => {

    const viewButtonClass = (mode: ViewMode) => `
        flex flex-col items-center justify-center p-2 rounded border transition-all duration-200 h-16
        ${currentView === mode 
            ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}
    `;

    // Long press handler helper
    const useLongPress = (action: string, value: any, interval = 50) => {
        const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

        const start = () => {
            if (timerRef.current) return;
            onManualControl(action, value);
            timerRef.current = setInterval(() => {
                onManualControl(action, value);
            }, interval);
        };

        const stop = () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };

        return {
            onMouseDown: start,
            onMouseUp: stop,
            onMouseLeave: stop,
            onTouchStart: start,
            onTouchEnd: stop
        };
    };

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* 1. View Selection (M1 Top Bar) */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-wider flex items-center gap-2">
                    <Layout size={12} /> 视图切换 (View)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setView(ViewMode.MAIN)} className={viewButtonClass(ViewMode.MAIN)}>
                        <div className="border-2 border-current w-5 h-3 mb-1 rounded-sm"></div>
                        <span className="text-[9px] font-bold text-center">主视图</span>
                    </button>
                    <button onClick={() => setView(ViewMode.THREE_D)} className={viewButtonClass(ViewMode.THREE_D)}>
                        <Box size={16} className="mb-1" />
                        <span className="text-[9px] font-bold text-center">三维图</span>
                    </button>
                    <button onClick={() => setView(ViewMode.AUX)} className={viewButtonClass(ViewMode.AUX)}>
                        <Layers size={16} className="mb-1" />
                        <span className="text-[9px] font-bold text-center">辅视图</span>
                    </button>
                </div>
            </div>

            {/* 2. Main Operation Area (Switches between Auto / Manual Console) */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 flex-1 flex flex-col overflow-hidden relative">
                
                {manualOverride ? (
                    // --- M9 VIRTUAL CONSOLE (Manual Mode) ---
                    <div className="flex flex-col h-full bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-purple-500/30 bg-purple-900/10 flex justify-between items-center">
                            <h4 className="text-xs text-purple-400 font-bold uppercase flex items-center gap-2">
                                <Gamepad size={14} /> 虚拟操控台 (Manual)
                            </h4>
                            <div className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-300">
                                {selectedBoomId ? `控制中: ${selectedBoomId === 'left' ? '左臂' : selectedBoomId === 'mid' ? '中臂' : '右臂'}` : '请选择钻臂'}
                            </div>
                        </div>

                        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                            {/* Position Controls */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* D-Pad for X/Y Position */}
                                <div className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex flex-col items-center gap-2">
                                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><MoveHorizontal size={10}/> 臂架移位 (Move)</span>
                                    <div className="grid grid-cols-3 gap-1 w-full aspect-square max-w-[100px]">
                                        <div></div>
                                        <button {...useLongPress('moveY', 1)} className="bg-slate-700 hover:bg-purple-600 rounded flex items-center justify-center active:bg-purple-500 transition-colors shadow-inner"><ArrowUp size={14}/></button>
                                        <div></div>
                                        <button {...useLongPress('moveX', -1)} className="bg-slate-700 hover:bg-purple-600 rounded flex items-center justify-center active:bg-purple-500 transition-colors shadow-inner"><ArrowLeft size={14}/></button>
                                        <div className="bg-slate-900 rounded-full border border-slate-600 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div></div>
                                        <button {...useLongPress('moveX', 1)} className="bg-slate-700 hover:bg-purple-600 rounded flex items-center justify-center active:bg-purple-500 transition-colors shadow-inner"><ArrowRight size={14}/></button>
                                        <div></div>
                                        <button {...useLongPress('moveY', -1)} className="bg-slate-700 hover:bg-purple-600 rounded flex items-center justify-center active:bg-purple-500 transition-colors shadow-inner"><ArrowDown size={14}/></button>
                                        <div></div>
                                    </div>
                                </div>

                                {/* Extension Controls */}
                                <div className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex flex-col items-center gap-2">
                                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><MoveVertical size={10}/> 伸缩/推进 (Feed)</span>
                                    <div className="flex flex-col gap-1.5 w-full h-full justify-center px-1">
                                        <button {...useLongPress('extend', 1)} className="flex-1 bg-slate-700 hover:bg-purple-600 rounded flex flex-col items-center justify-center active:bg-purple-500 transition-colors group">
                                            <ArrowUp size={14} className="group-active:-translate-y-1 transition-transform"/>
                                            <span className="text-[8px] mt-1">推进 (In)</span>
                                        </button>
                                        <button {...useLongPress('extend', -1)} className="flex-1 bg-slate-700 hover:bg-purple-600 rounded flex flex-col items-center justify-center active:bg-purple-500 transition-colors group">
                                            <span className="text-[8px] mb-1">退回 (Out)</span>
                                            <ArrowDown size={14} className="group-active:translate-y-1 transition-transform"/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 mt-auto">
                                <span className="text-[9px] text-slate-400 font-bold block mb-2">作业控制 (Action)</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => onManualControl('toggleDrill', null)} 
                                        className="col-span-2 py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <RotateCw size={18} className="animate-spin-slow" />
                                        冲击 / 旋转
                                    </button>
                                </div>
                            </div>

                            <button 
                                onClick={() => setAutoMode(AutoMode.IDLE)} 
                                className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded flex items-center justify-center gap-2 transition-colors text-xs"
                            >
                                <Power size={12} /> 退出手动模式
                            </button>
                        </div>
                    </div>
                ) : (
                    // --- M3 AUTO MODE PANEL ---
                    <div className="p-4 flex flex-col h-full">
                        <h4 className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wider flex justify-between items-center">
                            <span className="flex items-center gap-2"><Settings size={14}/> 自动化作业 (Auto)</span>
                            {autoMode !== AutoMode.IDLE && <span className="text-amber-500 text-[10px] animate-pulse">● 运行中</span>}
                        </h4>
                        
                        <div className="flex flex-col gap-2 mb-auto">
                            <button 
                                onClick={onStabilizerToggle}
                                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold border transition-all ${stabilizersActive ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-300 border-slate-700'} ${highlightId === 'stabilizer-btn' ? 'ring-2 ring-white animate-pulse' : ''}`}
                            >
                                <ArrowDownToLine size={18} />
                                {stabilizersActive ? '收回支腿' : '伸出支腿'}
                            </button>

                            <div className="h-px bg-slate-700 my-2"></div>

                            <button 
                                onClick={() => setAutoMode(autoMode === AutoMode.PLANAR ? AutoMode.IDLE : AutoMode.PLANAR)}
                                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold border transition-all ${autoMode === AutoMode.PLANAR ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                            >
                                <AlignEndHorizontal size={18} />
                                基准底平齐
                            </button>
                            <button 
                                onClick={() => setAutoMode(autoMode === AutoMode.EQUAL_DEPTH ? AutoMode.IDLE : AutoMode.EQUAL_DEPTH)}
                                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold border transition-all ${autoMode === AutoMode.EQUAL_DEPTH ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                            >
                                <Layers size={18} />
                                孔等深
                            </button>
                            <button 
                                onClick={() => setAutoMode(autoMode === AutoMode.PATTERN ? AutoMode.IDLE : AutoMode.PATTERN)}
                                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold border transition-all ${autoMode === AutoMode.PATTERN ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'} ${highlightId === 'auto-pattern-btn' ? 'ring-2 ring-white animate-pulse' : ''}`}
                            >
                                <Grid3X3 size={18} />
                                按布孔图
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button 
                                onClick={toggleScan}
                                className={`flex items-center justify-center gap-2 p-3 rounded font-bold border transition-all ${
                                    isScanning 
                                    ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400 animate-pulse' 
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-cyan-400'
                                } ${highlightId === 'scan-btn' ? 'ring-2 ring-white animate-pulse' : ''}`}
                            >
                                <ScanLine size={18} />
                                {isScanning ? '扫描中' : '3D扫描'}
                            </button>
                            
                            <button className="flex items-center justify-center gap-2 p-3 bg-red-900/20 border border-red-800 text-red-500 rounded font-bold hover:bg-red-900/40 hover:text-red-400 transition-colors">
                                <StopCircle size={18} />
                                急停
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Status Bar (M8 Remote) */}
            <div className={`bg-slate-900 p-2 rounded-xl border border-slate-800 ${highlightId === 'remote-toggle' ? 'ring-2 ring-white' : ''}`}>
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${remoteStatus === 'connected' ? 'bg-green-900 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Wifi size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">ToDesk 远程运维</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer scale-75">
                        <input type="checkbox" checked={remoteStatus === 'connected'} onChange={toggleRemote} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};