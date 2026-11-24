import type { GitCommitDto } from '../../types/git.types';

export const LANE_COLORS = ['#22C55E', '#38BDF8', '#F59E0B', '#A78BFA', '#FB7185', '#2DD4BF'] as const;

export interface GraphCurve {
  fromLane: number;
  toLane: number;
  color: string;
}

export interface GraphPassThrough {
  lane: number;
  color: string;
}

export interface GraphRowLayout {
  lane: number;
  color: string;
  isMerge: boolean;
  hasTop: boolean;
  hasBottom: boolean;
  passThroughs: GraphPassThrough[];
  incomingCurves: GraphCurve[];
  outgoingCurves: GraphCurve[];
}

export interface GitGraphLayout {
  rows: GraphRowLayout[];
  maxLanes: number;
}

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length] ?? '#22C55E';
}

function allocLane(lanes: (string | null)[]): number {
  const free = lanes.indexOf(null);
  if (free >= 0) return free;
  lanes.push(null);
  return lanes.length - 1;
}

function trimTrailingNulls(lanes: (string | null)[]): void {
  while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
    lanes.pop();
  }
}

/** Computes a true multi-lane DAG layout from commit SHAs and parentShas (newest first). */
export function computeGitGraphLayout(commits: GitCommitDto[]): GitGraphLayout {
  const lanes: (string | null)[] = [];
  const rows: GraphRowLayout[] = [];
  let maxLanes = 1;

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]!;
    const parents = commit.parentShas ?? [];

    const matching: number[] = [];
    for (let k = 0; k < lanes.length; k++) {
      if (lanes[k] === commit.sha) matching.push(k);
    }

    const hasTop = matching.length > 0;
    const lane = matching.length > 0 ? matching[0]! : allocLane(lanes);
    const incomingCurves: GraphCurve[] = [];

    for (let m = 1; m < matching.length; m++) {
      const fromLane = matching[m]!;
      incomingCurves.push({ fromLane, toLane: lane, color: laneColor(fromLane) });
      lanes[fromLane] = null;
    }

    const passThroughs: GraphPassThrough[] = [];
    for (let k = 0; k < lanes.length; k++) {
      if (k !== lane && lanes[k] !== null) {
        passThroughs.push({ lane: k, color: laneColor(k) });
      }
    }

    const outgoingCurves: GraphCurve[] = [];
    let hasBottom = false;

    if (parents.length === 0) {
      lanes[lane] = null;
    } else {
      const primary = parents[0]!;
      const existingPrimary = lanes.findIndex((sha, idx) => idx !== lane && sha === primary);
      if (existingPrimary >= 0) {
        outgoingCurves.push({ fromLane: lane, toLane: existingPrimary, color: laneColor(lane) });
        lanes[lane] = null;
      } else {
        lanes[lane] = primary;
        hasBottom = true;
      }

      for (let p = 1; p < parents.length; p++) {
        const pSha = parents[p]!;
        const existing = lanes.indexOf(pSha);
        if (existing >= 0) {
          outgoingCurves.push({ fromLane: lane, toLane: existing, color: laneColor(existing) });
        } else {
          const newLane = allocLane(lanes);
          lanes[newLane] = pSha;
          outgoingCurves.push({ fromLane: lane, toLane: newLane, color: laneColor(newLane) });
        }
      }
    }

    maxLanes = Math.max(maxLanes, lanes.length, lane + 1);
    trimTrailingNulls(lanes);

    rows.push({
      lane,
      color: laneColor(lane),
      isMerge: parents.length > 1,
      hasTop,
      hasBottom,
      passThroughs,
      incomingCurves,
      outgoingCurves,
    });
  }

  return { rows, maxLanes: Math.min(maxLanes, 6) };
}
