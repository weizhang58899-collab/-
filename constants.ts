import { DrillHole, HoleStatus, TrainingStep } from './types';

// Generate a tunnel face pattern (simple semi-circle arch)
export const INITIAL_DRILL_PLAN: DrillHole[] = (() => {
  const holes: DrillHole[] = [];
  const radius = 4;
  const steps = 12;
  let idCounter = 1;

  // Outer arch
  for (let i = 0; i <= steps; i++) {
    const angle = (Math.PI / steps) * i;
    holes.push({
      id: `H-${idCounter++}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      depth: 3.5,
      status: HoleStatus.PENDING,
      sequence: idCounter
    });
  }

  // Inner arch
  for (let i = 1; i < steps; i++) {
    const angle = (Math.PI / steps) * i;
    holes.push({
      id: `H-${idCounter++}`,
      x: Math.cos(angle) * (radius * 0.7),
      y: Math.sin(angle) * (radius * 0.7),
      depth: 3.5,
      status: HoleStatus.PENDING,
      sequence: idCounter
    });
  }

  // Bottom cuts
  holes.push({ id: `H-${idCounter++}`, x: -3, y: 0, depth: 4, status: HoleStatus.PENDING, sequence: idCounter });
  holes.push({ id: `H-${idCounter++}`, x: 0, y: 0, depth: 4, status: HoleStatus.PENDING, sequence: idCounter });
  holes.push({ id: `H-${idCounter++}`, x: 3, y: 0, depth: 4, status: HoleStatus.PENDING, sequence: idCounter });

  return holes;
})();

export const TUNNEL_DEPTH = 10;
export const TUNNEL_WIDTH = 10;
export const TUNNEL_HEIGHT = 6;

// Based on PDF Manual Content
export const TRAINING_MODULES: TrainingStep[] = [
  {
    id: 1,
    title: "1. 安全区域检查 (M1.4)",
    description: "在启动设备前，必须确认凿岩台车危险区域（前后左右2米范围内）无人员逗留。",
    warning: "⚠️ 警告：发动机运行时保持通风良好。靠近正在作业的凿岩台车时必须佩带安全帽。",
    actionTarget: "scan-btn",
    visualTarget: "zone"
  },
  {
    id: 2,
    title: "2. 启动前准备 (M2.6.2)",
    description: "打开蓄电池隔离开关，检查仪表盘状态。确认系统连接正常。",
    actionTarget: "remote-toggle",
    visualTarget: "engine"
  },
  {
    id: 3,
    title: "3. 车体定位与调平 (M3.1)",
    description: "伸出前后支腿，直至车轮完全离开地面。调整车体直至水平（观测驾驶室水平仪）。",
    warning: "⚠️ 注意：钻进时，凿岩台车必须稳固支撑，以避免干扰导航。",
    actionTarget: "stabilizer-btn", // We will add this mock button
    visualTarget: "stabilizers"
  },
  {
    id: 4,
    title: "4. 导入布孔图 (M3.3/M3.4)",
    description: "在‘布孔管理’中选择本循环使用的布孔图 (.dp 文件)。",
    actionTarget: "import-btn",
    visualTarget: "booms"
  },
  {
    id: 5,
    title: "5. 启动自动凿岩 (M3.8)",
    description: "选择‘按布孔图’模式，系统将自动规划路径并开始作业。",
    actionTarget: "auto-pattern-btn",
    visualTarget: "booms"
  }
];
