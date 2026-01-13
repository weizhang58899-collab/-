export enum ViewMode {
  MAIN = 'Main View', // 凿岩主视图
  THREE_D = '3D Analysis', // 凿岩三维图
  AUX = 'Auxiliary' // 凿岩辅视图
}

export enum HoleStatus {
  PENDING = 'PENDING',
  TARGETED = 'TARGETED',
  DRILLING = 'DRILLING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface DrillHole {
  id: string;
  x: number;
  y: number;
  depth: number;
  status: HoleStatus;
  sequence: number; // Order in path
}

export enum AutoMode {
  IDLE = 'IDLE',
  PLANAR = 'PLANAR_BASE', // 基准底平齐
  EQUAL_DEPTH = 'EQUAL_DEPTH', // 孔等深
  PATTERN = 'PATTERN_MATCH' // 按布孔图
}

export interface BoomState {
  id: 'left' | 'mid' | 'right';
  label: string;
  active: boolean;
  targetHoleId: string | null;
  progress: number;
  // Real-time simulated metrics
  metrics: {
    percussionPressure: number; // 冲击压力 (bar)
    feedPressure: number;       // 推进压力 (bar)
    rotationSpeed: number;      // 回转速度 (r/min)
    waterFlow: boolean;         // 水流量状态
  };
  // Manual control state (Cartesian coordinates relative to boom base default)
  manualPosition: {
      x: number; // Horizontal offset
      y: number; // Vertical offset
      z: number; // Depth offset (Extension towards face)
  }
}

// --- Training Types ---
export enum AppMode {
  OPERATION = 'OPERATION', // 自由操作模式
  TRAINING = 'TRAINING'    // 教学模式
}

export interface TrainingStep {
  id: number;
  title: string;
  description: string;
  warning?: string; // From PDF warnings
  actionTarget?: string; // ID of the button/element to highlight
  visualTarget?: 'stabilizers' | 'engine' | 'booms' | 'zone'; // For 3D highlighting
  requiredAction?: () => boolean; // Predicate to check if step is done
}