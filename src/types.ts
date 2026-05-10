/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AwardType = 'MVP' | 'BEST_BATTER' | 'ROOKIE_OF_THE_YEAR' | 'HR_KING' | 'SB_KING' | 'MOST_HITS';

export interface Award {
  year: number;
  type: AwardType;
}

export type GrowthType = 'early' | 'average' | 'late';

export type TraitType = 'power' | 'speed' | 'minds_eye' | 'skill' | 'flexible' | 'sleep' | 'protagonist' | 'dual_wield';

export type ItemType = 'gorilla_bat' | 'cheetah_shoes' | 'hawk_glasses' | 'sheep_cushion' | 'owl_talisman' | 'monkey_bat';

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  ageInMonths: number;
  totalMonths: number;
  careerHits: number;
  careerAtBats: number;
  careerHomeRuns: number;
  careerStolenBases: number;
  currentSeasonHits: number;
  currentSeasonAtBats: number;
  currentSeasonHomeRuns: number;
  currentSeasonStolenBases: number;
  peakAvg: number;
  isStarter: boolean;
  isActive: boolean;
  minBaseAvg: number;
  maxBaseAvg: number;
  seasonHistory: { year: number, avg: number }[];
  awards: Award[];
  fatigue: number;
  retiredYear?: number;
  retirementReason?: string;
  growthType: GrowthType;
  peakAgeMonths: number;
  growthRate: number;
  equippedItemIds: string[];
  traits: TraitType[];
}

export interface Team {
  id: string;
  name: string;
  isUserTeam: boolean;
  players: Player[];
  yearlyAvgs: number[]; // History of season averages
  inventory: Item[];
}

export interface SeasonResult {
  year: number;
  standings: {
    teamId: string;
    teamName: string;
    avg: number;
    score: number;
    totalHR: number;
    totalSB: number;
    rank: number;
    prevRank?: number;
  }[];
  awards?: {
    type: AwardType;
    playerName: string;
    teamName: string;
    statValue?: string;
  }[];
  newHistoricalRecords?: {
    type: 'hits' | 'hr' | 'sb' | 'avg';
    playerName: string;
    value: number;
    isNewBest: boolean;
  }[];
  acquiredTraits?: {
    playerName: string;
    trait: TraitType;
    reason: string;
  }[];
  newPlayers?: {
    name: string;
    teamName: string;
    traits: TraitType[];
  }[];
}

export interface HallOfFameEntry {
  id: string;
  playerName: string;
  teamName: string;
  peakAvg: number;
  careerAvg: number;
  totalMonths: number;
  careerHits?: number;
  careerHomeRuns?: number;
  careerStolenBases?: number;
  retirementReason?: string;
  retiredYear?: number;
  awards?: Award[];
  traits?: TraitType[];
  inductionReasons?: string[];
  milestones?: string[];
}

export interface HistoricalRecord {
  playerId: string;
  playerName: string;
  teamName: string;
  value: number;
  year: number;
}

export interface GameState {
  year: number;
  month: number;
  teams: Team[];
  history: SeasonResult[];
  hallOfFame: HallOfFameEntry[];
  logs: { id: string, text: string }[];
  autoManageRoster?: boolean;
  lastReportYearViewed?: number;
  difficulty: 'normal' | 'hard';
  retiredUserPlayerNames?: string[];
  historicalSeasonBest?: {
    hits: HistoricalRecord[];
    hr: HistoricalRecord[];
    sb: HistoricalRecord[];
    avg: HistoricalRecord[];
  };
}
