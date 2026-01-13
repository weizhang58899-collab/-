import React from 'react';
import { TrainingStep } from '../types';
import { AlertTriangle, CheckCircle, ChevronRight, BookOpen } from 'lucide-react';

interface TrainingGuideProps {
    currentStep: TrainingStep;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
}

export const TrainingGuide: React.FC<TrainingGuideProps> = ({ currentStep, totalSteps, onNext, onPrev }) => {
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
            <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/50 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="bg-blue-600/20 px-4 py-2 flex justify-between items-center border-b border-blue-500/30">
                    <div className="flex items-center gap-2 text-blue-400 font-bold">
                        <BookOpen size={18} />
                        <span>标准作业流程教学 (M3)</span>
                    </div>
                    <span className="text-xs font-mono text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded">
                        步骤 {currentStep.id} / {totalSteps}
                    </span>
                </div>

                {/* Content */}
                <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2">{currentStep.title}</h3>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                        {currentStep.description}
                    </p>

                    {currentStep.warning && (
                        <div className="bg-amber-900/30 border border-amber-600/50 rounded p-3 flex items-start gap-3 mb-4">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-amber-200 text-xs">{currentStep.warning}</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-1">
                            {Array.from({ length: totalSteps }).map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-1.5 w-8 rounded-full transition-colors ${
                                        idx + 1 === currentStep.id ? 'bg-blue-500' : 
                                        idx + 1 < currentStep.id ? 'bg-green-500' : 'bg-slate-700'
                                    }`}
                                />
                            ))}
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={onPrev}
                                disabled={currentStep.id === 1}
                                className="px-3 py-1.5 rounded text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                            >
                                上一步
                            </button>
                            <button 
                                onClick={onNext}
                                className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-lg shadow-blue-900/50 transition-all hover:scale-105 active:scale-95"
                            >
                                下一步 <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};