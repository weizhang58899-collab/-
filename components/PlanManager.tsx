import React, { useRef } from 'react';
import { DrillHole, HoleStatus } from '../types';
import { Upload, Edit2, Trash2, ArrowRight, FileText } from 'lucide-react';

interface PlanManagerProps {
    holes: DrillHole[];
    onImport: () => void;
    onHoleSelect: (id: string) => void;
    highlightId?: string;
}

export const PlanManager: React.FC<PlanManagerProps> = ({ holes, onImport, onHoleSelect, highlightId }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onImport();
        }
    };

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 h-full flex flex-col">
            <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <FileText size={16} className="text-blue-400" />
                    布孔图管理 (M3)
                </h3>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".dp" 
                        onChange={handleFileChange} 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-200 transition-colors ${highlightId === 'import-btn' ? 'ring-2 ring-white animate-pulse bg-blue-600 text-white' : ''}`}
                    >
                        <Upload size={12} /> 导入 .dp
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                <div className="grid grid-cols-5 text-xs text-slate-500 mb-2 px-2 font-mono font-bold">
                    <span>孔序</span>
                    <span>编号</span>
                    <span className="text-center">深度</span>
                    <span className="text-right">状态</span>
                    <span className="text-right">操作</span>
                </div>
                {holes.map((hole) => (
                    <div 
                        key={hole.id}
                        onClick={() => onHoleSelect(hole.id)}
                        className={`
                            grid grid-cols-5 items-center p-2 rounded cursor-pointer border
                            transition-colors text-sm font-mono
                            ${hole.status === HoleStatus.TARGETED 
                                ? 'bg-blue-900/30 border-blue-500/50 text-blue-100' 
                                : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600 text-slate-300'}
                            ${hole.status === HoleStatus.COMPLETED ? 'text-green-400 opacity-60' : ''}
                        `}
                    >
                        <span className="font-bold">#{hole.sequence}</span>
                        <span>{hole.id}</span>
                        <span className="text-center">{hole.depth}m</span>
                        <span className="text-right">
                            <span className={`
                                inline-block w-2 h-2 rounded-full mr-1
                                ${hole.status === HoleStatus.COMPLETED ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : ''}
                                ${hole.status === HoleStatus.TARGETED ? 'bg-red-500 animate-pulse' : ''}
                                ${hole.status === HoleStatus.PENDING ? 'bg-slate-600' : ''}
                                ${hole.status === HoleStatus.DRILLING ? 'bg-amber-500 animate-bounce' : ''}
                            `}></span>
                        </span>
                        <div className="flex justify-end gap-2 text-slate-500">
                           <Edit2 size={12} className="hover:text-blue-400" />
                           <Trash2 size={12} className="hover:text-red-400" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-slate-700 bg-slate-800/80">
                <div className="text-xs text-slate-400 flex justify-between mb-2 px-1">
                     <span>总孔数: <span className="text-white">{holes.length}</span></span>
                     <span>已完成: <span className="text-green-400">{holes.filter(h => h.status === HoleStatus.COMPLETED).length}</span></span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded shadow-lg shadow-blue-900/20 transition-all">
                   <ArrowRight size={16} /> 自动路径规划
                </button>
            </div>
        </div>
    );
};