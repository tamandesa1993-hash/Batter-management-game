/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  PlayCircle, 
  History, 
  BookOpen, 
  Settings, 
  UserPlus, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Hash,
  Award,
  X,
  Star,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Package,
  Plus,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Player, 
  Team, 
  GameState, 
  HallOfFameEntry, 
  SeasonResult,
  Item,
  ItemType,
  GrowthType,
  AwardType
} from './types';
import { 
  INITIAL_TEAMS_COUNT, 
  TEAM_TOTAL_PLAYERS, 
  TEAM_STARTER_COUNT,
  HOF_MIN_MONTHS_FOR_RANKING,
  HOF_MIN_PEAK_AVG,
  HOF_MIN_CAREER_AVG,
  ZODIAC_TEAMS,
  ITEM_TYPES
} from './constants';
import { 
  generateInitialTeam, 
  simulateMonthlyBatting, 
  checkRetirement, 
  createPlayer, 
  generatePlayerName,
  getHOFInduction
} from './gameLogic';
import { TraitType } from './types';

const STORAGE_KEY = 'batting_simulator_state';

const TRAIT_DATA: Record<TraitType, { name: string, color: string, desc: string }> = {
  power: { name: '剛腕', color: 'bg-orange-500', desc: 'HR確率UP' },
  speed: { name: '俊足', color: 'bg-emerald-500', desc: '盗塁確率UP' },
  minds_eye: { name: '心眼', color: 'bg-indigo-500', desc: '打率UP' },
  skill: { name: '巧打', color: 'bg-blue-500', desc: 'ヒット確率UP' },
  flexible: { name: '柔軟', color: 'bg-teal-500', desc: '疲労蓄積半減' },
  sleep: { name: '快眠', color: 'bg-purple-500', desc: 'ベンチ回復量2倍' },
  dual_wield: { name: '二刀流', color: 'bg-amber-600', desc: 'アイテムを2つ装備可能' },
  protagonist: { name: '主人公', color: 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]', desc: '全ての特性の力を宿し、重複して強化される' }
};

const getZodiacIndex = (month: number, day: number) => {
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 0; // Aquarius
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 1; // Pisces
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 2; // Aries
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 3; // Taurus
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 4; // Gemini
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 5; // Cancer
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 6; // Leo
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 7; // Virgo
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 8; // Libra
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 9; // Scorpio
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 10; // Sagittarius
  return 11; // Capricorn (Dec 22 - Jan 19)
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return null;
  });

  const [showTeamSelection, setShowTeamSelection] = useState(() => !localStorage.getItem(STORAGE_KEY));

  const [historyPage, setHistoryPage] = useState(0);
  const itemsPerHistoryPage = 20;

  const [activeTab, setActiveTab] = useState<'status' | 'others' | 'history' | 'hof'>('status');
  const [hofViewMode, setHofViewMode] = useState<'legend' | 'season_records'>('legend');
  const [hofSortKey, setHofSortKey] = useState<'peak' | 'career' | 'years' | 'hr' | 'sb' | 'awards' | 'team' | 'retiredYear' | 'hits'>('retiredYear');
  const [hofSortOrder, setHofSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isNamingPlayer, setIsNamingPlayer] = useState(false);
  const [isForceRetireReplacement, setIsForceRetireReplacement] = useState(false);
  const [pendingReplacement, setPendingReplacement] = useState<{teamId: string, index: number} | null>(null);
  const [newName, setNewName] = useState('');
  const logs = gameState?.logs || [];
  const [isLogCollapsed, setIsLogCollapsed] = useState(false);
  const [selectedStatsTeamId, setSelectedStatsTeamId] = useState<string | null>(null);
  const [statusViewMode, setStatusViewMode] = useState<'grid' | 'analytics'>('grid');
  const [othersViewMode, setOthersViewMode] = useState<'grid' | 'analytics'>('grid');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [seasonReport, setSeasonReport] = useState<SeasonResult | null>(null);
  const [retirementReport, setRetirementReport] = useState<{
    retiredPlayers: { player: Player, inducted: boolean, teamName: string, inductionReasons?: string[] }[],
    year: number,
    month: number
  } | null>(null);
  const [pendingRetirementReport, setPendingRetirementReport] = useState<{
    retiredPlayers: { player: Player, inducted: boolean, teamName: string, inductionReasons?: string[] }[],
    year: number,
    month: number
  } | null>(null);

  // Auto-save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  const addNotification = (text: string) => {
    const id = Math.random().toString(36).substring(7);
    setGameState(prev => {
      if (!prev) return prev;
      const currentLogs = prev.logs || [];
      const newLogs = [{ id, text }, ...currentLogs].slice(0, 100);
      return { ...prev, logs: newLogs };
    });
  };

  const teamStats = useMemo(() => {
    const stats: Record<string, {
      championships: number;
      name: string;
      ranks: Record<number, number>;
    }> = {};

    gameState?.teams.forEach(t => {
      stats[t.id] = { championships: 0, name: t.name, ranks: {} };
    });

    gameState?.history.forEach(h => {
      h.standings.forEach(s => {
        if (stats[s.teamId]) {
          stats[s.teamId].ranks[s.rank] = (stats[s.teamId].ranks[s.rank] || 0) + 1;
          if (s.rank === 1) {
            stats[s.teamId].championships++;
          }
        }
      });
    });

    return Object.entries(stats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.championships - a.championships);
  }, [gameState?.history, gameState?.teams]);

  const advanceMonth = () => {
    if (!gameState) return;
    const userTeam = gameState.teams.find(t => t.isUserTeam)!;
    if (userTeam.players.length < TEAM_TOTAL_PLAYERS) {
      addNotification("不足している選手を補充してください。");
      return;
    }

    const prev = gameState;
    let localRetired: { player: Player, inducted: boolean, teamName: string, inductionReasons?: string[] }[] = [];
    let retiredUserNames: string[] = [];
    let localSeasonReport: SeasonResult | null = null;
    let nextMonth = prev.month + 1;
    let nextYear = prev.year;
    let nextHistory = [...prev.history];
    let nextHOF = [...prev.hallOfFame];
    let nextLogs = [...(prev.logs || [])];

    const addLog = (text: string) => {
      const id = Math.random().toString(36).substring(7);
      nextLogs = [{ id, text }, ...nextLogs].slice(0, 100);
    };

    let awardsToAssign: Record<string, string[]> = {};
    
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
      
      const seasonStandings = prev.teams.map(t => {
        const totalHits = t.players.reduce((sum, p) => sum + p.currentSeasonHits, 0);
        const totalAtBats = t.players.reduce((sum, p) => sum + p.currentSeasonAtBats, 0);
        const totalHR = t.players.reduce((sum, p) => sum + (p.currentSeasonHomeRuns || 0), 0);
        const totalSB = t.players.reduce((sum, p) => sum + (p.currentSeasonStolenBases || 0), 0);
        
        const avg = totalAtBats > 0 ? totalHits / totalAtBats : 0;
        const score = (avg * 1000) + (totalHR * 0.5) + (totalSB * 0.5) + (totalHits * 0.1);
        
        return { teamId: t.id, teamName: t.name, avg, score, totalHR, totalSB, totalHits };
      }).sort((a, b) => b.score - a.score);

      const allPlayersInLeague: Player[] = prev.teams.flatMap(t => t.players);
      const qualifiedPlayers = allPlayersInLeague.filter(p => p.currentSeasonAtBats >= 300);

      let mvp: Player | null = null;
      let bestBatter: Player | null = null;
      let rookieOfTheYear: Player | null = null;
      let hrKing: Player | null = null;
      let sbKing: Player | null = null;
      let mostHits: Player | null = null;

      if (allPlayersInLeague.length > 0) {
        mvp = [...allPlayersInLeague].sort((a, b) => {
          const scoreA = a.currentSeasonHits + (a.currentSeasonHomeRuns * 5) + (a.currentSeasonStolenBases * 2);
          const scoreB = b.currentSeasonHits + (b.currentSeasonHomeRuns * 5) + (b.currentSeasonStolenBases * 2);
          return scoreB - scoreA;
        })[0];
        mostHits = [...allPlayersInLeague].sort((a, b) => b.currentSeasonHits - a.currentSeasonHits)[0];
        hrKing = [...allPlayersInLeague].sort((a, b) => b.currentSeasonHomeRuns - a.currentSeasonHomeRuns)[0];
        sbKing = [...allPlayersInLeague].sort((a, b) => b.currentSeasonStolenBases - a.currentSeasonStolenBases)[0];
      }

      if (qualifiedPlayers.length > 0) {
        bestBatter = [...qualifiedPlayers].sort((a, b) => {
          const avgA = a.currentSeasonHits / a.currentSeasonAtBats;
          const avgB = b.currentSeasonHits / b.currentSeasonAtBats;
          return avgB - avgA;
        })[0];
      }

      const rookies = allPlayersInLeague.filter(p => p.totalMonths <= 12);
      if (rookies.length > 0) {
        rookieOfTheYear = [...rookies].sort((a, b) => b.currentSeasonHits - a.currentSeasonHits)[0];
      }

      // Track acquired traits and milestones
      const acquiredTraitsInSeason: SeasonResult['acquiredTraits'] = [];
      const milestonesInSeason: string[] = [];

      allPlayersInLeague.forEach(p => {
        // Potential Trait Acquisition
        if (p.currentSeasonHomeRuns >= 30 && !p.traits.includes('power')) {
          acquiredTraitsInSeason.push({ playerName: p.name, trait: 'power', reason: 'シーズン30本塁打達成' });
          p.traits.push('power'); // Side effect: update in place for now as we recreate teams below
        }
        if (p.currentSeasonStolenBases >= 40 && !p.traits.includes('speed')) {
          acquiredTraitsInSeason.push({ playerName: p.name, trait: 'speed', reason: 'シーズン40盗塁達成' });
          p.traits.push('speed');
        }
        const seasonAvg = p.currentSeasonAtBats > 0 ? p.currentSeasonHits / p.currentSeasonAtBats : 0;
        if (seasonAvg >= 0.350 && p.currentSeasonAtBats >= 300 && !p.traits.includes('minds_eye')) {
          acquiredTraitsInSeason.push({ playerName: p.name, trait: 'minds_eye', reason: 'シーズン打率.350達成' });
          p.traits.push('minds_eye');
        }
        
        // Milestone checks
        const oldHits = p.careerHits;
        const newHits = p.careerHits + p.currentSeasonHits;
        [1000, 2000, 3000, 4000, 5000, 6000].forEach(m => {
          if (oldHits < m && newHits >= m) {
            milestonesInSeason.push(`${p.name} (通算${m}安打達成${m === 2000 ? ' - 名球会へ' : ''})`);
          }
        });
        
        const oldHR = p.careerHomeRuns || 0;
        const newHR = oldHR + (p.currentSeasonHomeRuns || 0);
        [300, 400, 500, 600, 700, 800].forEach(m => {
          if (oldHR < m && newHR >= m) milestonesInSeason.push(`${p.name} (通算${m}本塁打達成)`);
        });

        const oldSB = p.careerStolenBases || 0;
        const newSB = oldSB + (p.currentSeasonStolenBases || 0);
        [200, 300, 400, 500, 600, 700, 800, 900].forEach(m => {
          if (oldSB < m && newSB >= m) milestonesInSeason.push(`${p.name} (通算${m}盗塁達成)`);
        });
      });

      const getTeamNameForPlayer = (playerId: string) => {
        const team = prev.teams.find(t => t.players.some(p => p.id === playerId));
        return team ? team.name : "不明";
      };

      const seasonAwards: SeasonResult['awards'] = [];
      if (mvp) {
        const mvpScore = mvp.currentSeasonHits + (mvp.currentSeasonHomeRuns * 5) + (mvp.currentSeasonStolenBases * 2);
        seasonAwards.push({ type: 'MVP', playerName: mvp.name, teamName: getTeamNameForPlayer(mvp.id), statValue: `${Math.round(mvpScore)}pt` });
      }
      if (mostHits) {
        seasonAwards.push({ type: 'MOST_HITS', playerName: mostHits.name, teamName: getTeamNameForPlayer(mostHits.id), statValue: `${mostHits.currentSeasonHits}H` });
      }
      if (bestBatter) {
        const avg = bestBatter.currentSeasonHits / bestBatter.currentSeasonAtBats;
        seasonAwards.push({ type: 'BEST_BATTER', playerName: bestBatter.name, teamName: getTeamNameForPlayer(bestBatter.id), statValue: `.${Math.round(avg * 1000).toString().padStart(3, '0')}` });
      }
      if (rookieOfTheYear) seasonAwards.push({ type: 'ROOKIE_OF_THE_YEAR', playerName: rookieOfTheYear.name, teamName: getTeamNameForPlayer(rookieOfTheYear.id) });
      if (hrKing) seasonAwards.push({ type: 'HR_KING', playerName: hrKing.name, teamName: getTeamNameForPlayer(hrKing.id), statValue: `${hrKing.currentSeasonHomeRuns}HR` });
      if (sbKing) seasonAwards.push({ type: 'SB_KING', playerName: sbKing.name, teamName: getTeamNameForPlayer(sbKing.id), statValue: `${sbKing.currentSeasonStolenBases}SB` });

      // Track historical season records
      const currentBest = prev.historicalSeasonBest || { hits: [], hr: [], sb: [], avg: [] };
      const newBest = { ...currentBest };
      if (!newBest.avg) newBest.avg = [];
      const newRecordsInReport: SeasonResult['newHistoricalRecords'] = [];

      const updateHistoricalCategory = (
        category: 'hits' | 'hr' | 'sb' | 'avg',
        player: Player,
        val: number
      ) => {
        if (val <= 0) return;
        const list = [...(newBest[category] || [])];
        const existingIdx = list.findIndex(r => r.playerId === player.id);
        
        if (existingIdx !== -1) {
          if (val > list[existingIdx].value) {
            list[existingIdx] = {
              playerId: player.id,
              playerName: player.name,
              teamName: getTeamNameForPlayer(player.id),
              value: val,
              year: prev.year
            };
          } else {
            return;
          }
        } else {
          list.push({
            playerId: player.id,
            playerName: player.name,
            teamName: getTeamNameForPlayer(player.id),
            value: val,
            year: prev.year
          });
        }
        
        list.sort((a, b) => b.value - a.value);
        newBest[category] = list.slice(0, 10);
        
        const newIdx = newBest[category].findIndex(r => r.playerId === player.id && r.year === prev.year && r.value === val);
        if (newIdx !== -1) {
          newRecordsInReport.push({
            type: category,
            playerName: player.name,
            value: val,
            isNewBest: newIdx === 0
          });
        }
      };

      allPlayersInLeague.forEach(p => {
        updateHistoricalCategory('hits', p, p.currentSeasonHits);
        updateHistoricalCategory('hr', p, p.currentSeasonHomeRuns || 0);
        updateHistoricalCategory('sb', p, p.currentSeasonStolenBases || 0);
        
        if (p.currentSeasonAtBats >= 1) { // Basic minimum at-bats to qualify for records
          updateHistoricalCategory('avg', p, p.currentSeasonHits / p.currentSeasonAtBats);
        }
      });

      const lastSeason = prev.history[0];
      const seasonResult: SeasonResult = {
        year: prev.year,
        standings: seasonStandings.map((s, i) => {
          const lastRank = lastSeason?.standings.find(st => st.teamId === s.teamId)?.rank;
          return { ...s, rank: i + 1, prevRank: lastRank };
        }),
        awards: seasonAwards,
        newHistoricalRecords: newRecordsInReport,
        acquiredTraits: acquiredTraitsInSeason,
      };

      if (mvp) {
        const isProtagonist = mvp.traits.includes('protagonist');
        if (!isProtagonist && Math.random() < 0.5) {
          acquiredTraitsInSeason.push({ playerName: mvp.name, trait: 'protagonist', reason: 'MVP獲得による自覚' });
          mvp.traits.push('protagonist');
        }
      }

      nextHistory.unshift(seasonResult);
      localSeasonReport = seasonResult;

      // Update GameState with new historical records
      setTimeout(() => {
        setGameState(current => {
          if (!current) return current;
          return { ...current, historicalSeasonBest: newBest };
        });
      }, 0);

      if (mvp) {
        const mvpScore = mvp.currentSeasonHits + (mvp.currentSeasonHomeRuns * 5) + (mvp.currentSeasonStolenBases * 2);
        addLog(`年度MVP: ${mvp.name} (${Math.round(mvpScore)}ポイント)`);
        awardsToAssign[mvp.id] = (awardsToAssign[mvp.id] || []).concat('MVP');
      }
      if (mostHits) {
        addLog(`最多安打: ${mostHits.name} (${mostHits.currentSeasonHits}安打)`);
        awardsToAssign[mostHits.id] = (awardsToAssign[mostHits.id] || []).concat('MOST_HITS');
      }
      if (bestBatter) {
        const avg = bestBatter.currentSeasonHits / bestBatter.currentSeasonAtBats;
        addLog(`首位打者: ${bestBatter.name} (打率: .${Math.round(avg * 1000).toString().padStart(3, '0')})`);
        awardsToAssign[bestBatter.id] = (awardsToAssign[bestBatter.id] || []).concat('BEST_BATTER');
      }
      if (hrKing) {
        addLog(`本塁打王: ${hrKing.name} (${hrKing.currentSeasonHomeRuns}本)`);
        awardsToAssign[hrKing.id] = (awardsToAssign[hrKing.id] || []).concat('HR_KING');
      }
      if (sbKing) {
        addLog(`盗塁王: ${sbKing.name} (${sbKing.currentSeasonStolenBases}盗塁)`);
        awardsToAssign[sbKing.id] = (awardsToAssign[sbKing.id] || []).concat('SB_KING');
      }
      if (rookieOfTheYear) {
        addLog(`新人王: ${rookieOfTheYear.name}`);
        awardsToAssign[rookieOfTheYear.id] = (awardsToAssign[rookieOfTheYear.id] || []).concat('ROOKIE_OF_THE_YEAR');
      }
    }

    const updatedTeams = prev.teams.map(team => {
      let teamInventory = [...(team.inventory || [])];
      let newPlayers = team.players.map(p => {
        const minBaseAvg = p.minBaseAvg || 0.180;
        const maxBaseAvg = p.maxBaseAvg || 0.300;
        const growthType = p.growthType || 'average';
        const peakAgeMonths = p.peakAgeMonths || 336;
        const growthRate = p.growthRate || 1.0;
        
        return {
          ...p,
          minBaseAvg,
          maxBaseAvg,
          growthType,
          peakAgeMonths,
          growthRate,
          fatigue: p.fatigue || 0
        };
      });

      if (!teamInventory.length && team.isUserTeam !== undefined) {
        ITEM_TYPES.forEach(it => {
          for (let i = 0; i < 5; i++) {
            teamInventory.push({
              id: Math.random().toString(36).substring(2, 9),
              type: it.type,
              name: it.name,
              description: it.desc
            });
          }
        });
      }
      
      if (nextMonth === 1) {
        newPlayers = newPlayers.map(p => {
          const seasonAvg = p.currentSeasonAtBats > 0 ? p.currentSeasonHits / p.currentSeasonAtBats : 0;
          const playerAwards = awardsToAssign[p.id] || [];
          const newAwardsList = playerAwards.map(t => ({ year: prev.year, type: t as any }));

          return {
            ...p,
            seasonHistory: [...(p.seasonHistory || []), { year: prev.year, avg: seasonAvg }],
            awards: [...(p.awards || []), ...newAwardsList],
            peakAvg: p.currentSeasonAtBats >= 300 ? Math.max(p.peakAvg, seasonAvg) : p.peakAvg,
            currentSeasonHits: 0,
            currentSeasonAtBats: 0,
            currentSeasonHomeRuns: 0,
            currentSeasonStolenBases: 0
          };
        });
      }

      if (!team.isUserTeam) {
        // Auto-equip items for CPU teams
        const difficulty = prev.difficulty || 'normal';
        
        if (difficulty === 'hard') {
          // Hard Mode Strategy: Re-assign items for maximum efficiency
          // 1. Gather all items (teamInventory is the total pool)
          let availableItems = [...teamInventory];
          
          // Clear current equipment for re-assignment
          newPlayers = newPlayers.map(p => ({ ...p, equippedItemIds: [] }));
          
          // 2. Prioritize "Owl Talisman" (ふくろうのおまもり) for young players
          const owlTalismans = availableItems.filter(i => i.type === 'owl_talisman');
          availableItems = availableItems.filter(i => i.type !== 'owl_talisman');
          
          // Sort young players by growth rate and distance to peak
          const youngPlayers = [...newPlayers]
            .filter(p => p.ageInMonths < p.peakAgeMonths)
            .sort((a, b) => {
               // Higher growth rate first
               if ((b.growthRate || 1.0) !== (a.growthRate || 1.0)) return (b.growthRate || 1.0) - (a.growthRate || 1.0);
               // Younger first if growth rate is same
               return a.ageInMonths - b.ageInMonths;
            });
            
          let talismanIdx = 0;
          for (let p of youngPlayers) {
            if (talismanIdx < owlTalismans.length) {
              const playerIndex = newPlayers.findIndex(pl => pl.id === p.id);
              if (playerIndex !== -1) {
                newPlayers[playerIndex] = {
                  ...newPlayers[playerIndex],
                  equippedItemIds: [...newPlayers[playerIndex].equippedItemIds, owlTalismans[talismanIdx].id]
                };
                talismanIdx++;
              }
            }
          }
          
          // 3. Assign other items to maximize performance (Starters first)
          const typePriority: Record<ItemType, number> = {
            'monkey_bat': 5,
            'hawk_glasses': 4,
            'gorilla_bat': 3,
            'cheetah_shoes': 2,
            'sheep_cushion': 1,
            'owl_talisman': 0
          };
          
          let performanceItems = availableItems.sort((a, b) => (typePriority[b.type] || 0) - (typePriority[a.type] || 0));
          
          const priorityPlayers = [...newPlayers].sort((a, b) => {
             // Starters first
             if (a.isStarter && !b.isStarter) return -1;
             if (!a.isStarter && b.isStarter) return 1;
             // Then by quality (avg potential)
             return (b.minBaseAvg + b.maxBaseAvg) - (a.minBaseAvg + a.maxBaseAvg);
          });
          
          let itemIdx = 0;
          for (let p of priorityPlayers) {
            const playerIndex = newPlayers.findIndex(pl => pl.id === p.id);
            const player = newPlayers[playerIndex];
            let maxSlots = 1;
            if (player.traits?.includes('dual_wield')) maxSlots += 1;
            if (player.traits?.includes('protagonist')) maxSlots += 1;
            
            while (player.equippedItemIds.length < maxSlots && itemIdx < performanceItems.length) {
              player.equippedItemIds.push(performanceItems[itemIdx].id);
              itemIdx++;
            }
            newPlayers[playerIndex] = { ...player };
          }
        } else {
          // Normal Mode: Passive auto-equip (only fill empty slots)
          const alreadyEquippedIds = new Set(newPlayers.flatMap(p => p.equippedItemIds || []));
          let availableItems = teamInventory.filter(item => !alreadyEquippedIds.has(item.id));
          
          newPlayers = newPlayers.map(p => {
            const currentIds = p.equippedItemIds || [];
            let maxSlots = 1;
            if (p.traits?.includes('dual_wield')) maxSlots += 1;
            if (p.traits?.includes('protagonist')) maxSlots += 1;
            
            if (currentIds.length < maxSlots && availableItems.length > 0) {
              const needed = maxSlots - currentIds.length;
              const toEquip = availableItems.slice(0, needed);
              availableItems = availableItems.slice(needed);
              return { ...p, equippedItemIds: [...currentIds, ...toEquip.map(i => i.id)] };
            }
            return p;
          });
        }
      }

      if (!team.isUserTeam || (team.isUserTeam && prev.autoManageRoster !== false)) {
        const currentMonth = prev.month;
        const sortedByFitness = [...newPlayers].sort((a, b) => {
          const getScore = (p: Player) => {
            let opportunityBonus = 0;
            if (p.currentSeasonAtBats === 0) {
              if (currentMonth >= 11) opportunityBonus = 2.0; 
              else if (currentMonth >= 8) opportunityBonus = 0.5;
              else if (currentMonth >= 4) opportunityBonus = 0.1;
            }
            const ability = (p.minBaseAvg + p.maxBaseAvg) / 2;
            let performance = ability;
            if (p.currentSeasonAtBats >= 40) {
              const currentAvg = p.currentSeasonHits / p.currentSeasonAtBats;
              performance = (currentAvg * 0.7) + (ability * 0.3);
            }
            const fitness = performance * Math.pow(1 - (p.fatigue || 0), 2);
            return fitness + opportunityBonus;
          };
          return getScore(b) - getScore(a);
        });
        const top10Ids = new Set(sortedByFitness.slice(0, TEAM_STARTER_COUNT).map(p => p.id));
        newPlayers = newPlayers.map(p => ({ ...p, isStarter: top10Ids.has(p.id) }));
      } else if (newPlayers.filter(p => p.isStarter).length === 0) {
        const count = Math.min(TEAM_STARTER_COUNT, newPlayers.length);
        for (let i = 0; i < count; i++) newPlayers[i].isStarter = true;
      }

      newPlayers = newPlayers.map(p => {
        let minBaseAvg = p.minBaseAvg;
        let maxBaseAvg = p.maxBaseAvg;
        const equippedItems = (p.equippedItemIds || []).map(id => teamInventory.find(item => item.id === id)).filter(Boolean) as Item[];
        const isGrowthPhase = p.ageInMonths < p.peakAgeMonths;
        if (isGrowthPhase) {
          const ageProgress = p.ageInMonths / p.peakAgeMonths;
          let growthBase = (1.1 - ageProgress) * 0.0005 * (p.growthRate || 1.0);
          if (equippedItems.some(item => item.type === 'owl_talisman')) growthBase *= 1.5;
          minBaseAvg = p.minBaseAvg + growthBase;
          maxBaseAvg = p.maxBaseAvg + growthBase;
        } else {
          const yearsPostPeak = (p.ageInMonths - p.peakAgeMonths) / 12;
          const declineFactor = 0.0004 + (yearsPostPeak * 0.0001);
          minBaseAvg = Math.max(0.080, p.minBaseAvg - declineFactor);
          maxBaseAvg = Math.max(0.120, p.maxBaseAvg - declineFactor);
        }

        const pGrowth = { ...p, minBaseAvg, maxBaseAvg };
        if (p.isStarter) {
          const { hits, atBats, homeRuns, stolenBases } = simulateMonthlyBatting(pGrowth, equippedItems);
          const totalHits = p.careerHits + hits;
          const totalAtBats = p.careerAtBats + atBats;
          const totalHomeRuns = (p.careerHomeRuns || 0) + homeRuns;
          const totalStolenBases = (p.careerStolenBases || 0) + stolenBases;
          let nextFatigue = p.fatigue || 0;
          if (!equippedItems.some(item => item.type === 'sheep_cushion')) {
            let fatigueInc = 0.08;
            if (p.traits?.includes('flexible')) fatigueInc *= 0.5;
            if (p.traits?.includes('protagonist')) fatigueInc *= 0.5;
            nextFatigue = Math.min(1.0, nextFatigue + fatigueInc);
          }
          return {
            ...pGrowth,
            careerHits: totalHits, careerAtBats: totalAtBats, careerHomeRuns: totalHomeRuns, careerStolenBases: totalStolenBases,
            currentSeasonHits: p.currentSeasonHits + hits, currentSeasonAtBats: p.currentSeasonAtBats + atBats,
            currentSeasonHomeRuns: (p.currentSeasonHomeRuns || 0) + homeRuns, currentSeasonStolenBases: (p.currentSeasonStolenBases || 0) + stolenBases,
            ageInMonths: p.ageInMonths + 1, totalMonths: p.totalMonths + 1, fatigue: nextFatigue
          };
        } else {
          let fatigueDec = 0.30;
          if (p.traits?.includes('sleep')) fatigueDec *= 2;
          if (p.traits?.includes('protagonist')) fatigueDec *= 2;
          return { ...pGrowth, ageInMonths: p.ageInMonths + 1, totalMonths: p.totalMonths + 1, fatigue: Math.max(0, (p.fatigue || 0) - fatigueDec) };
        }
      });

      const remainingPlayers: Player[] = [];
      const turnRetired: Player[] = [];
      const draftedPlayersInSeason: SeasonResult['newPlayers'] = [];
      newPlayers.forEach(p => {
        const status = checkRetirement(p, prev.month);
        if (status.retires) turnRetired.push({ ...p, isActive: false, retiredYear: prev.year, retirementReason: status.reason });
        else remainingPlayers.push(p);
      });

      turnRetired.forEach(p => {
        const { isInducted, reasons } = getHOFInduction(p);
        const cAvg = p.careerAtBats > 0 ? p.careerHits / p.careerAtBats : 0;
        if (isInducted) {
          nextHOF.unshift({
            id: p.id, playerName: p.name, teamName: team.name, peakAvg: p.peakAvg, careerAvg: cAvg,
            totalMonths: p.totalMonths, careerHits: p.careerHits, careerHomeRuns: p.careerHomeRuns,
            careerStolenBases: p.careerStolenBases, retirementReason: p.retirementReason,
            retiredYear: p.retiredYear, awards: p.awards, traits: p.traits, inductionReasons: reasons,
            milestones: [
              (() => {
                const thresholds = [6000, 5000, 4000, 3000, 2000, 1000];
                const milestone = thresholds.find(t => p.careerHits >= t);
                return milestone ? `${milestone}安打達成` : "";
              })(),
              (() => {
                const thresholds = [800, 700, 600, 500, 400, 300];
                const milestone = thresholds.find(t => (p.careerHomeRuns || 0) >= t);
                return milestone ? `${milestone}本塁打達成` : "";
              })(),
              (() => {
                const thresholds = [900, 800, 700, 600, 500, 400, 300, 200];
                const milestone = thresholds.find(t => (p.careerStolenBases || 0) >= t);
                return milestone ? `${milestone}盗塁達成` : "";
              })(),
            ].filter(m => m !== "")
          });
        }
        localRetired.push({ player: p, inducted: isInducted, teamName: team.name, inductionReasons: reasons });
        if (team.isUserTeam) {
          addLog(`${p.name}選手が引退しました。${isInducted ? '殿堂入り！' : ''}`);
          retiredUserNames.push(p.name);
        }
      });

      if (!team.isUserTeam) {
        while (remainingPlayers.length < TEAM_TOTAL_PLAYERS) {
          const newPlayer = createPlayer(team.id, generatePlayerName());
          remainingPlayers.push(newPlayer);
          draftedPlayersInSeason.push({ name: newPlayer.name, teamName: team.name, traits: newPlayer.traits });
        }
      }
      
      if (localSeasonReport) {
        if (!localSeasonReport.newPlayers) localSeasonReport.newPlayers = [];
        localSeasonReport.newPlayers.push(...draftedPlayersInSeason);
      }

      return { ...team, players: remainingPlayers, inventory: teamInventory };
    });

    const newState: GameState = {
      ...prev,
      month: nextMonth,
      year: nextYear,
      teams: updatedTeams,
      history: nextHistory,
      hallOfFame: nextHOF,
      logs: nextLogs,
      retiredUserPlayerNames: [...(prev.retiredUserPlayerNames || []), ...retiredUserNames]
    };

    setGameState(newState);

    if (localRetired.length > 0) {
      const rep = { retiredPlayers: localRetired, year: prev.year, month: prev.month };
      if (localSeasonReport) setPendingRetirementReport(rep);
      else setRetirementReport(rep);
    }
  };

  const [isSeasonReportOpen, setIsSeasonReportOpen] = useState(false);
  
  // Update: Show season report when it's set
  useEffect(() => {
    if (seasonReport) {
      setIsSeasonReportOpen(true);
    }
  }, [seasonReport]);

  // Update: Show season report when month becomes 1 (start of new year)
  useEffect(() => {
    if (gameState?.month === 1 && gameState.year > 0 && gameState.history.length > 0) {
      const latestReport = gameState.history[0];
      // If we are in Year X, latest report should be for Year X-1
      if (latestReport.year === gameState.year - 1 && gameState.lastReportYearViewed !== latestReport.year) {
        setSeasonReport(latestReport);
        setIsSeasonReportOpen(true);
        // We don't update lastReportYearViewed here yet, because if they refresh before closing, we might want to show it again
        // Actually, let's update it when the modal is set to open to avoid loops
        setGameState(prev => prev ? { ...prev, lastReportYearViewed: latestReport.year } : prev);
      }
    }
  }, [gameState?.month, gameState?.year, gameState?.history, gameState?.lastReportYearViewed]);

  const handleTeamSelect = (month: number, day: number) => {
    const zodiacIndex = getZodiacIndex(month, day);
    const teams: Team[] = [];
    for (let i = 0; i < INITIAL_TEAMS_COUNT; i++) {
      const isUser = i === zodiacIndex;
      teams.push(generateInitialTeam(`team-${i}`, ZODIAC_TEAMS[i], isUser));
    }

    const newState: GameState = {
      year: 0,
      month: 0,
      teams,
      history: [],
      hallOfFame: [],
      logs: [],
      autoManageRoster: true,
      lastReportYearViewed: 0,
      difficulty: 'normal',
      retiredUserPlayerNames: []
    };

    setGameState(newState);
    setShowTeamSelection(false);
    setSelectedTeamId(teams[zodiacIndex].id);
    addNotification(`${ZODIAC_TEAMS[zodiacIndex]}をあなたのチームとして設定しました！`);
  };

  if (showTeamSelection || !gameState) {
    return <TeamSelectionScreen onSelect={handleTeamSelect} />;
  }

  const userTeam = gameState.teams.find(t => t.isUserTeam)!;
  const currentTeam = gameState.teams.find(t => t.id === (selectedTeamId || userTeam.id)) || userTeam;

  const handleNamePlayer = () => {
    if (!newName.trim()) return;
    
    setGameState(prev => {
      if (!prev) return prev;
      const updatedTeams = prev.teams.map(t => {
        if (t.isUserTeam) {
          return {
            ...t,
            players: [...t.players, createPlayer(t.id, newName, 216, !isForceRetireReplacement)]
          };
        }
        return t;
      });
      
      const newRetiredUserPlayerNames = [...(prev.retiredUserPlayerNames || [])];
      newRetiredUserPlayerNames.shift();

      return { ...prev, teams: updatedTeams, retiredUserPlayerNames: newRetiredUserPlayerNames };
    });
    
    setNewName('');
    // If we only need one more, it's about to be added, so check if we need even more
    if (userTeam.players.length + 1 >= TEAM_TOTAL_PLAYERS) {
      setIsNamingPlayer(false);
      setIsForceRetireReplacement(false);
    }
  };

  const handleForceRetire = (playerId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const userTeam = prev.teams.find(t => t.isUserTeam);
      if (!userTeam) return prev;
      
      const playerToRetire = userTeam.players.find(p => p.id === playerId);
      if (!playerToRetire) return prev;

      // Hall of Fame check for forced retirement
      const { isInducted, reasons } = getHOFInduction(playerToRetire);
      let nextHOF = [...prev.hallOfFame];
      
      if (isInducted) {
        const careerAvg = playerToRetire.careerAtBats > 0 ? playerToRetire.careerHits / playerToRetire.careerAtBats : 0;
        nextHOF.unshift({
          id: playerToRetire.id,
          playerName: playerToRetire.name,
          teamName: userTeam.name,
          peakAvg: playerToRetire.peakAvg,
          careerAvg,
          totalMonths: playerToRetire.totalMonths,
          careerHits: playerToRetire.careerHits,
          careerHomeRuns: (playerToRetire.careerHomeRuns || 0),
          careerStolenBases: (playerToRetire.careerStolenBases || 0),
          retirementReason: "強制引退",
          retiredYear: prev.year,
          awards: playerToRetire.awards,
          traits: playerToRetire.traits,
          inductionReasons: reasons
        });
      }

      const updatedTeams = prev.teams.map(t => {
        if (t.isUserTeam) {
          return {
            ...t,
            players: t.players.filter(p => p.id !== playerId)
          };
        }
        return t;
      });

      const id = Math.random().toString(36).substring(7);
      const text = `${playerToRetire.name}選手が強制引退しました。${isInducted ? '殿堂入り！' : ''}`;
      const newLogs = [{ id, text }, ...(prev.logs || [])].slice(0, 100);

      return {
        ...prev,
        teams: updatedTeams,
        hallOfFame: nextHOF,
        logs: newLogs,
        retiredUserPlayerNames: [...(prev.retiredUserPlayerNames || []), playerToRetire.name]
      };
    });
    
    setIsForceRetireReplacement(true);
    setIsNamingPlayer(true);
  };

  const changeTeamName = (name: string) => {
    setGameState(prev => {
      const updatedTeams = prev.teams.map(t => t.isUserTeam ? { ...t, name } : t);
      return { ...prev, teams: updatedTeams };
    });
  };

  const renameTeam = (teamId: string, newName: string) => {
    if (!newName.trim()) return;
    setGameState(prev => {
      const updatedTeams = prev.teams.map(t => t.id === teamId ? { ...t, name: newName } : t);
      return { ...prev, teams: updatedTeams };
    });
  };

  const setDifficulty = (difficulty: 'normal' | 'hard') => {
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, difficulty };
    });
    addNotification(`難易度を${difficulty === 'normal' ? 'ノーマル' : 'ハード'}に変更しました。`);
  };
  
  const handleToggleStarter = (playerId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const updatedTeams = prev.teams.map(t => {
        if (t.isUserTeam) {
          const player = t.players.find(p => p.id === playerId);
          if (!player) return t;
          
          const starterCount = t.players.filter(p => p.isStarter).length;
          const isCurrentlyStarter = player.isStarter;
          
          if (!isCurrentlyStarter && starterCount >= TEAM_STARTER_COUNT) {
            addNotification(`スターターは最大${TEAM_STARTER_COUNT}名までです。`);
            return t;
          }

          return {
            ...t,
            players: t.players.map(p => 
              p.id === playerId ? { ...p, isStarter: !p.isStarter } : p
            )
          };
        }
        return t;
      });
      return { ...prev, teams: updatedTeams };
    });
  };

  const handleEquipItem = (playerId: string, itemId: string | null, action: 'equip' | 'unequip' = 'equip') => {
    setGameState(prev => {
      if (!prev) return prev;
      const updatedTeams = prev.teams.map(t => {
        if (t.isUserTeam) {
          let newPlayers = [...t.players];
          const player = newPlayers.find(p => p.id === playerId);
          if (!player) return t;

          const isDualWield = player.traits?.includes('dual_wield') || player.traits?.includes('protagonist');
          const maxSlots = isDualWield ? 2 : 1;

          if (itemId !== null) {
            if (action === 'equip') {
              // Check if item is already equipped by anyone else
              const alreadyEquippedIdx = newPlayers.findIndex(p => (p.equippedItemIds || []).includes(itemId));
              if (alreadyEquippedIdx !== -1) {
                const other = newPlayers[alreadyEquippedIdx];
                newPlayers[alreadyEquippedIdx] = { 
                  ...other, 
                  equippedItemIds: (other.equippedItemIds || []).filter(id => id !== itemId)
                };
              }

              // Equip to player
              newPlayers = newPlayers.map(p => {
                if (p.id === playerId) {
                  const currentIds = p.equippedItemIds || [];
                  if (currentIds.includes(itemId)) return p;
                  
                  let nextIds = [...currentIds];
                  if (nextIds.length >= maxSlots) {
                    if (maxSlots === 2) {
                      if (nextIds.length >= 2) nextIds = [nextIds[0], itemId];
                      else nextIds.push(itemId);
                    } else {
                      nextIds = [itemId];
                    }
                  } else {
                    nextIds.push(itemId);
                  }
                  return { ...p, equippedItemIds: nextIds };
                }
                return p;
              });
            } else {
              // Unequip specific item
              newPlayers = newPlayers.map(p => 
                p.id === playerId ? { ...p, equippedItemIds: (p.equippedItemIds || []).filter(id => id !== itemId) } : p
              );
            }
          } else {
            // Unequip all if itemId is null
            newPlayers = newPlayers.map(p => 
              p.id === playerId ? { ...p, equippedItemIds: [] } : p
            );
          }

          return { ...t, players: newPlayers };
        }
        return t;
      });
      return { ...prev, teams: updatedTeams };
    });
  };

  const handleAutoEquipItems = () => {
    setGameState(prev => {
      if (!prev) return prev;
      const updatedTeams = prev.teams.map(t => {
        if (t.isUserTeam) {
          const inventory = t.inventory || [];
          const players = [...t.players];
          
          // Clear all current assignments first
          players.forEach(p => { p.equippedItemIds = []; });

          const availableItems = [...inventory];
          let itemIdx = 0;

          // Priority 1: Protagonists and Dual Wielders (2 slots)
          players.forEach(p => {
            const isDual = p.traits?.includes('dual_wield') || p.traits?.includes('protagonist');
            if (isDual) {
              for (let i = 0; i < 2 && itemIdx < availableItems.length; i++) {
                p.equippedItemIds!.push(availableItems[itemIdx++].id);
              }
            }
          });

          // Priority 2: Starters (1 slot)
          players.forEach(p => {
            if (p.isStarter && (p.equippedItemIds?.length || 0) === 0 && itemIdx < availableItems.length) {
              if (!p.equippedItemIds) p.equippedItemIds = [];
              p.equippedItemIds.push(availableItems[itemIdx++].id);
            }
          });

          // Priority 3: Rest
          players.forEach(p => {
            if ((p.equippedItemIds?.length || 0) === 0 && itemIdx < availableItems.length) {
              if (!p.equippedItemIds) p.equippedItemIds = [];
              p.equippedItemIds.push(availableItems[itemIdx++].id);
            }
          });

          return { ...t, players };
        }
        return t;
      });
      return { ...prev, teams: updatedTeams };
    });
  };

  const handleResetGame = () => {
    setGameState(null);
    setShowTeamSelection(true);
    setHistoryPage(0);
    setActiveTab('status');
    setIsSettingsOpen(false);
    localStorage.removeItem(STORAGE_KEY);
    addNotification("データをリセットしました。新たなチームを選んでください。");
  };

  return (
    <div className="h-screen w-screen bg-[#0f172a] text-[#f1f5f9] font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[60px] bg-[#1e293b] border-b border-[#334155] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            打率シミュレーター <span className="text-[#3b82f6] text-xs font-semibold px-2 py-0.5 border border-[#3b82f6]/30 rounded">v2.4</span>
          </h1>
          <span className="text-xs text-[#94a3b8] px-4 hidden md:block">Team: {userTeam.name}</span>
        </div>
        <div className="flex gap-4">
          <div className="bg-[#334155] px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">YEAR {gameState.year.toString().padStart(2, '0')}</div>
          <div className="bg-[#334155] px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">MONTH {gameState.month.toString().padStart(2, '0')} / 12</div>
        </div>
      </header>

      {/* Middle Section: Sidebars and Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Team Roster */}
        <aside className="w-[240px] border-r border-[#334155] p-4 overflow-y-auto hidden xl:block bg-[#0f172a]">
          <h2 className="text-[10px] uppercase tracking-widest text-[#94a3b8] mb-4 font-bold">Team Roster (15)</h2>
          <SidebarRoster players={userTeam.players} inventory={userTeam.inventory || []} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-radial-[circle_at_center,_#1e293b_0%,_#0f172a_100%] shadow-2xl">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative">
            <AnimatePresence mode="wait">
              {userTeam.players.length < TEAM_TOTAL_PLAYERS && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-6 left-6 right-6 bg-[#3b82f6]/10 border border-[#3b82f6]/30 p-4 rounded-lg flex items-center justify-between z-10 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 text-blue-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">選手が15名未満です。新戦力が必要です。</span>
                  </div>
                  <button 
                    onClick={() => setIsNamingPlayer(true)}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-1.5 rounded text-xs font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  >
                    選手命名
                  </button>
                </motion.div>
              )}

              {activeTab === 'status' && (
                <motion.div 
                  key="status"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col">
                        <h2 className="text-4xl font-black italic text-white tracking-tighter uppercase leading-none">{userTeam.name}</h2>
                        <button 
                          onClick={() => setIsInventoryOpen(true)}
                          className="mt-1 flex items-center gap-1 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-[0.2em] transition-colors w-fit"
                        >
                          <Package className="w-3 h-3" />
                          Inventory Overview
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-[#1e293b]/30 px-3 py-1 rounded-xl border border-[#334155]/30 w-fit">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]">Roster</span>
                        <div className="flex bg-[#1e293b]/50 p-1 rounded-lg border border-[#334155]/50">
                          <button 
                            onClick={() => setGameState(prev => prev ? {...prev, autoManageRoster: false} : prev)}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${gameState?.autoManageRoster === false ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Manual
                          </button>
                          <button 
                            onClick={() => setGameState(prev => prev ? {...prev, autoManageRoster: true} : prev)}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${gameState?.autoManageRoster !== false ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Auto
                          </button>
                        </div>
                      </div>

                      <div className="flex bg-[#1e293b]/50 p-1 rounded-lg border border-[#334155]/50 w-fit">
                        <button 
                          onClick={() => setStatusViewMode('grid')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${statusViewMode === 'grid' ? 'bg-[#3b82f6] text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Grid
                        </button>
                        <button 
                          onClick={() => setStatusViewMode('analytics')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${statusViewMode === 'analytics' ? 'bg-[#3b82f6] text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Analytics
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 bg-[#1e293b] rounded-full border border-[#334155] text-slate-500 hover:text-blue-400 hover:bg-[#334155] transition-all"
                        title="設定"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      
                      <button 
                        onClick={advanceMonth}
                        disabled={(userTeam?.players?.length || 0) < TEAM_TOTAL_PLAYERS}
                        className="bg-[#10b981] hover:bg-[#059669] text-white px-10 py-3 rounded-full font-black text-sm tracking-[0.2em] shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] transition-all active:scale-95 disabled:grayscale disabled:opacity-50 uppercase flex items-center gap-2 whitespace-nowrap"
                      >
                        <PlayCircle className="w-5 h-5" />
                        試合開始
                      </button>

                      <button 
                        onClick={() => setIsHelpOpen(true)}
                        className="text-[#64748b] hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors group"
                      >
                        <HelpCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        How to Play / Help
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {statusViewMode === 'grid' ? (
                      <PlayerGrid 
                        players={userTeam.players} 
                        isUserTeam={true} 
                        onToggleStarter={handleToggleStarter}
                        onEquipItem={handleEquipItem} 
                        onAutoEquip={handleAutoEquipItems}
                        autoManageRoster={gameState.autoManageRoster} 
                        userTeam={userTeam}
                        onForceRetire={handleForceRetire}
                      />
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <TeamSuccessTrend history={gameState.history} teamId={userTeam.id} />
                        <PlayerPerformanceHeatmap players={userTeam.players} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'others' && (
                <motion.div 
                  key="others"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="w-full h-full flex flex-col"
                >
                  <div className="flex flex-wrap gap-2 mb-6 bg-[#1e293b]/50 p-2 rounded-xl">
                    {gameState.teams.filter(t => !t.isUserTeam).map(team => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeamId(team.id)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all ${
                          selectedTeamId === team.id 
                            ? 'bg-[#3b82f6] text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                            : 'bg-transparent text-[#94a3b8] hover:text-white border border-[#334155]'
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                         <div className="w-8 h-1 bg-[#3b82f6]"></div>
                         {currentTeam.name}
                      </h2>
                      <div className="flex bg-[#1e293b]/50 p-1 rounded-lg border border-[#334155]/50">
                        <button 
                          onClick={() => setOthersViewMode('grid')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${othersViewMode === 'grid' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Grid
                        </button>
                        <button 
                          onClick={() => setOthersViewMode('analytics')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${othersViewMode === 'analytics' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Analytics
                        </button>
                      </div>
                    </div>
                    
                    {othersViewMode === 'grid' ? (
                      <PlayerGrid 
                        players={currentTeam.players} 
                        isUserTeam={false} 
                        userTeam={currentTeam}
                      />
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <TeamSuccessTrend history={gameState.history} teamId={currentTeam.id} />
                        <PlayerPerformanceHeatmap players={currentTeam.players} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide pt-4"
                >
                  {gameState.history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#64748b]">
                       <History className="w-16 h-16 mb-4 opacity-20" />
                       <p className="text-sm font-bold uppercase tracking-widest">No History Recorded Yet</p>
                    </div>
                  ) : (
                    <>
                      {/* Championship Summary */}
                      <div className="shrink-0 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Trophy className="w-5 h-5 text-amber-500" />
                          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Championship Leaderboard</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                          {teamStats.map((stat, idx) => {
                            const isSelected = selectedStatsTeamId === stat.id;
                            return (
                              <div key={stat.id} className={`flex flex-col gap-2 transition-all duration-300 ${isSelected ? 'sm:col-span-2 lg:col-span-4' : ''}`}>
                                <button
                                  onClick={() => setSelectedStatsTeamId(isSelected ? null : stat.id)}
                                  className={`p-3 rounded-lg border transition-all text-left relative overflow-hidden group w-full ${
                                    isSelected 
                                      ? 'bg-[#3b82f6]/20 border-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                                      : 'bg-[#1e293b]/30 border-[#334155] hover:border-[#3b82f6]/50'
                                  }`}
                                >
                                  {idx === 0 && stat.championships > 0 && (
                                    <div className="absolute -right-2 -top-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                      <Trophy className="w-16 h-16 text-amber-500" />
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between relative z-10">
                                    <div>
                                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${idx === 0 && stat.championships > 0 ? 'text-amber-500' : 'text-[#64748b]'}`}>
                                        {idx === 0 && stat.championships > 0 ? 'Current Leader' : `Rank #${idx + 1}`}
                                      </p>
                                      <h4 className="font-bold text-white text-sm truncate max-w-[120px]">{stat.name}</h4>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] text-[#64748b] font-bold uppercase">Wins</p>
                                      <p className="text-lg font-mono font-black text-white">{stat.championships}</p>
                                    </div>
                                  </div>
                                </button>
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-[#0f172a] border border-[#3b82f6]/30 rounded-lg p-5">
                                        <div className="flex items-center justify-between mb-4">
                                          <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            {stat.name} Ranking Distribution
                                          </h3>
                                          <button onClick={() => setSelectedStatsTeamId(null)} className="text-[10px] text-[#64748b] hover:text-white underline">閉じる</button>
                                        </div>
                                        <div className="flex flex-col lg:flex-row gap-6">
                                          {/* Ranking Distribution */}
                                          <div className="flex-1">
                                            <p className="text-[10px] text-[#64748b] font-black uppercase tracking-widest mb-3">Ranking Distribution</p>
                                            <div className="grid grid-cols-3 gap-3">
                                              {Array.from({ length: 12 }, (_, i) => i + 1).map(rank => {
                                                const count = stat.ranks[rank] || 0;
                                                return (
                                                  <div key={rank} className="flex flex-col bg-black/40 rounded p-2 border border-[#334155]/30">
                                                    <div className="flex justify-between items-center">
                                                      <span className={`text-[10px] font-black font-mono ${rank === 1 ? 'text-amber-500' : 'text-[#64748b]'}`}> RANK #{rank.toString().padStart(2, '0')}</span>
                                                      <span className="text-[14px] font-mono font-black text-white">{count}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
                                                      <div 
                                                        className={`h-full transition-all ${rank === 1 ? 'bg-amber-500' : 'bg-[#3b82f6]/60'}`}
                                                        style={{ width: `${gameState.history.length > 0 ? (count / gameState.history.length) * 100 : 0}%` }}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Ranking Transition Chart */}
                                          <div className="flex-1 min-h-[250px] bg-black/20 rounded-lg p-4 border border-[#334155]/30">
                                            <p className="text-[10px] text-[#64748b] font-black uppercase tracking-widest mb-4">Ranking Transition (History)</p>
                                            <div className="w-full h-[200px]">
                                              <ResponsiveContainer width="100%" height="100%">
                                                <LineChart 
                                                  data={[...gameState.history].reverse().map((h, i) => ({
                                                    year: `Y${h.year}`,
                                                    rank: h.standings.find(s => s.teamId === stat.id)?.rank || 12
                                                  }))}
                                                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                                                >
                                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                  <XAxis 
                                                    dataKey="year" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                                                  />
                                                  <YAxis 
                                                    reversed 
                                                    domain={[1, 12]} 
                                                    ticks={[1, 3, 6, 9, 12]} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                                                  />
                                                  <Tooltip 
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '12px' }}
                                                    labelStyle={{ color: '#fff', fontSize: '10px', marginBottom: '4px' }}
                                                  />
                                                  <Line 
                                                    type="monotone" 
                                                    dataKey="rank" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth={3} 
                                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} 
                                                    activeDot={{ r: 6, fill: '#fff', strokeWidth: 0, shadow: '0 0 10px rgba(59,130,246,0.8)' }}
                                                    animationDuration={1000}
                                                  />
                                                </LineChart>
                                              </ResponsiveContainer>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent shrink-0"></div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-[#3b82f6]" />
                          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Season Archives</h2>
                        </div>
                        
                        {gameState.history.length > itemsPerHistoryPage && (
                          <div className="flex items-center gap-2 bg-[#1e293b]/50 p-1 rounded-lg border border-[#334155]">
                            <button 
                              disabled={historyPage === 0}
                              onClick={() => setHistoryPage(p => p - 1)}
                              className="p-1 text-[#3b82f6] disabled:text-slate-600 hover:text-white transition-colors"
                            >
                              <ArrowRight className="w-4 h-4 rotate-180" />
                            </button>
                            <span className="text-[10px] font-black text-white w-12 text-center uppercase tracking-tighter">
                              Page {historyPage + 1}
                            </span>
                            <button 
                              disabled={(historyPage + 1) * itemsPerHistoryPage >= gameState.history.length}
                              onClick={() => setHistoryPage(p => p + 1)}
                              className="p-1 text-[#3b82f6] disabled:text-slate-600 hover:text-white transition-colors"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12 items-start">
                        {gameState.history
                          .slice(historyPage * itemsPerHistoryPage, (historyPage + 1) * itemsPerHistoryPage)
                          .map((result) => (
                             <HistorySeasonCard key={result.year} result={result} userTeamId={userTeam.id} />
                          ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'hof' && (
                <motion.div 
                  key="hof"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full bg-[#1e293b]/20 border border-[#334155] p-6 rounded-lg overflow-hidden flex flex-col"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-[#3b82f6] text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Legendary Hall of Fame
                      </h2>
                      <div className="flex bg-[#0f172a] rounded-lg p-1 border border-[#334155] self-start mt-2">
                        <button 
                          onClick={() => setHofViewMode('legend')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${hofViewMode === 'legend' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          選手名鑑
                        </button>
                        <button 
                          onClick={() => setHofViewMode('season_records')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all ${hofViewMode === 'season_records' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          歴代シーズン記録
                        </button>
                      </div>
                    </div>
                    
                    {hofViewMode === 'legend' && (
                      <div className="flex items-center gap-3 text-[10px] font-bold">
                        {hofSortKey === 'career' && (
                          <span className="text-amber-500/80 animate-pulse hidden sm:block">※ 通算打率は現役5年以上の選手のみ表示</span>
                        )}
                        <span className="text-slate-500 uppercase tracking-widest">Sort By:</span>
                        <div className="flex bg-[#0f172a] rounded-lg p-1 border border-[#334155]">
                          {[
                            { key: 'peak', label: '最高打率' },
                            { key: 'career', label: '通算打率' },
                            { key: 'hits', label: '通算安打' },
                            { key: 'hr', label: '通算本塁打' },
                            { key: 'sb', label: '通算盗塁' },
                            { key: 'awards', label: '表彰数' },
                            { key: 'years', label: '現役年数' },
                            { key: 'team', label: 'チーム名' },
                            { key: 'retiredYear', label: '引退年度' }
                          ].map((option) => (
                            <button
                              key={option.key}
                              onClick={() => {
                                if (hofSortKey === option.key) {
                                  setHofSortOrder(hofSortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setHofSortKey(option.key as any);
                                  setHofSortOrder('desc');
                                }
                              }}
                              className={`px-2 py-1 rounded transition-all ${
                                hofSortKey === option.key 
                                  ? 'bg-[#3b82f6] text-white shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {option.label}
                              {hofSortKey === option.key && (
                                <span className="ml-1 opacity-60">
                                  {hofSortOrder === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {hofViewMode === 'legend' ? (
                    gameState.hallOfFame.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-[#64748b]">
                         <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                         <p className="text-sm font-bold uppercase tracking-widest">Archives Are Empty</p>
                      </div>
                    ) : (
                      <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                        {[...gameState.hallOfFame]
                          .filter(e => hofSortKey !== 'career' || e.totalMonths >= HOF_MIN_MONTHS_FOR_RANKING)
                          .sort((a, b) => {
                            let valA: any = 0;
                            let valB: any = 0;
                            
                            if (hofSortKey === 'peak') { valA = a.peakAvg; valB = b.peakAvg; }
                            else if (hofSortKey === 'career') { valA = a.careerAvg; valB = b.careerAvg; }
                            else if (hofSortKey === 'team') { valA = a.teamName; valB = b.teamName; }
                            else if (hofSortKey === 'years') { valA = a.totalMonths; valB = b.totalMonths; }
                            else if (hofSortKey === 'hr') { valA = a.careerHomeRuns || 0; valB = b.careerHomeRuns || 0; }
                            else if (hofSortKey === 'sb') { valA = a.careerStolenBases || 0; valB = b.careerStolenBases || 0; }
                            else if (hofSortKey === 'awards') { valA = a.awards?.length || 0; valB = b.awards?.length || 0; }
                            else if (hofSortKey === 'retiredYear') { valA = a.retiredYear || 0; valB = b.retiredYear || 0; }
                            else if (hofSortKey === 'hits') { valA = a.careerHits || 0; valB = b.careerHits || 0; }
                            
                            if (valA < valB) return hofSortOrder === 'asc' ? -1 : 1;
                            if (valA > valB) return hofSortOrder === 'asc' ? 1 : -1;
                            return 0;
                          }).map((entry) => (
                          <div key={entry.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#0a0f1d] border border-[#334155]/50 rounded hover:border-[#3b82f6]/30 transition-colors gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <p className="text-white font-bold text-lg leading-tight">{entry.playerName}</p>
                                {entry.traits && entry.traits.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.traits.map(trait => (
                                      <span 
                                        key={trait} 
                                        className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-sm ${TRAIT_DATA[trait]?.color || 'bg-slate-500'}`}
                                        title={TRAIT_DATA[trait]?.desc}
                                      >
                                        {TRAIT_DATA[trait]?.name || trait}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {entry.retirementReason && (
                                  <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    {entry.retirementReason}
                                  </span>
                                )}
                                {entry.milestones && entry.milestones.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.milestones.map((m, i) => (
                                      <span key={i} className="text-[9px] text-amber-400 font-bold bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                                        <Trophy className="w-2.5 h-2.5" />
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {entry.inductionReasons && entry.inductionReasons.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.inductionReasons.map((reason, i) => (
                                      <span key={i} className="text-[10px] text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                        <Star className="w-2.5 h-2.5 fill-emerald-500/30" />
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {entry.awards && entry.awards.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {entry.awards.map((award, i) => (
                                      <AwardBadge key={`${award.type}-${award.year}-${i}`} type={award.type} year={award.year} size="sm" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-9 gap-4 md:gap-4 text-center shrink-0 min-w-fit">
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1">最高打率</p>
                                 <p className="text-amber-500 font-mono text-sm font-bold">.{Math.round(entry.peakAvg * 1000).toString().padStart(3, '0')}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1">通算打率</p>
                                 <p className="text-[#3b82f6] font-mono text-sm font-bold">.{Math.round(entry.careerAvg * 1000).toString().padStart(3, '0')}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1 text-blue-400/80">通算安打</p>
                                 <p className="text-blue-300 font-bold text-sm tracking-tighter">{(entry.careerHits || 0)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1 text-rose-500/80">通算本塁打</p>
                                 <p className="text-rose-400 font-bold text-sm tracking-tighter">{(entry.careerHomeRuns || 0)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1 text-blue-500/80">通算盗塁</p>
                                 <p className="text-blue-400 font-bold text-sm tracking-tighter">{(entry.careerStolenBases || 0)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1 text-emerald-500/80">表彰数</p>
                                 <p className="text-emerald-400 font-bold text-sm tracking-tighter">{(entry.awards?.length || 0)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1">現役年数</p>
                                 <p className="text-slate-300 font-bold text-sm tracking-tighter">{Math.floor(entry.totalMonths / 12)}Y</p>
                              </div>
                              <div className="max-w-[60px]">
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1">チーム</p>
                                 <p className="text-[#94a3b8] font-bold text-[10px] tracking-tight truncate">{entry.teamName}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-[#64748b] font-bold uppercase mb-1 text-blue-400/80">引退年度</p>
                                 <p className="text-blue-400 font-bold text-sm tracking-tighter">{entry.retiredYear}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="space-y-8 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                      {[
                        { key: 'avg', label: 'シーズン打率', color: 'text-amber-500', unit: 'AVG' },
                        { key: 'hits', label: 'シーズン安打', color: 'text-blue-400', unit: 'H' },
                        { key: 'hr', label: 'シーズン本塁打', color: 'text-rose-500', unit: 'HR' },
                        { key: 'sb', label: 'シーズン盗塁', color: 'text-emerald-500', unit: 'SB' }
                      ].map((cat) => (
                        <div key={cat.key} className="space-y-3">
                          <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${cat.color}`}>
                            <Trophy className="w-4 h-4" />
                            {cat.label} Best 10
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(gameState.historicalSeasonBest?.[cat.key as 'avg' | 'hits' | 'hr' | 'sb'] || []).map((rec, i) => (
                              <div key={`${cat.key}-${i}`} className="flex items-center justify-between p-3 bg-[#0a0f1d] border border-[#334155]/50 rounded-xl relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3b82f6]/20 group-hover:bg-[#3b82f6]/50 transition-all"></div>
                                <div className="flex items-center gap-4">
                                  <span className="text-lg font-mono font-black italic text-slate-700 w-6">#{i + 1}</span>
                                  <div>
                                    <p className="text-sm font-black text-white">{rec.playerName}</p>
                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                                      {rec.year}年 / {rec.teamName}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-mono font-black ${cat.color}`}>
                                    {cat.key === 'avg' 
                                      ? `.${Math.round(rec.value * 1000).toString().padStart(3, '0')}`
                                      : rec.value}
                                  </span>
                                  <span className="text-[8px] block text-slate-600 font-bold ml-1">{cat.unit}</span>
                                </div>
                              </div>
                            ))}
                            {(!gameState.historicalSeasonBest?.[cat.key as 'avg' | 'hits' | 'hr' | 'sb'] || (gameState.historicalSeasonBest?.[cat.key as 'avg' | 'hits' | 'hr' | 'sb'] || []).length === 0) && (
                              <div className="col-span-full py-4 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest border border-dashed border-[#334155] rounded-xl">
                                No Records Yet
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Log: Log Window */}
          <div className={`${isLogCollapsed ? 'h-[40px]' : 'h-[200px]'} bg-[#020617] border-t border-[#334155] p-3 font-mono text-[11px] text-[#94a3b8] overflow-hidden transition-all duration-300 ease-in-out shrink-0 relative`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-white/40">
                <div className="w-2 h-2 bg-[#3b82f6] rounded-full animate-pulse"></div>
                 SYSTEM_LOG_OUTPUT v2.4 (Max 60 Entries)
              </div>
              <button 
                onClick={() => setIsLogCollapsed(!isLogCollapsed)}
                className="text-[#3b82f6] hover:text-white transition-colors"
                title={isLogCollapsed ? "ログを展開" : "ログを最小化"}
              >
                {isLogCollapsed ? <ArrowRight className="w-4 h-4 rotate-[-90deg]" /> : <ArrowRight className="w-4 h-4 rotate-90" />}
              </button>
            </div>
            {!isLogCollapsed && (
              <div className="space-y-1 overflow-y-auto h-[155px] scrollbar-hide">
                <div>{">"} システム待機中... 試合開始ボタンでリーグを進めてください。</div>
                <AnimatePresence>
                  {logs.map(n => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={n.text.includes('引退') ? 'text-amber-400/80' : 'text-blue-400/80'}
                    >
                      {">"} {n.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: League Standings */}
        <aside className="w-[240px] border-l border-[#334155] p-4 overflow-y-auto hidden 2xl:block bg-[#0f172a]">
          <h2 className="text-[10px] uppercase tracking-widest text-[#94a3b8] mb-4 font-bold">League Standings</h2>
          <LeagueSidebar teams={gameState.teams} />
        </aside>
      </div>

      {/* Footer Navigation */}
      <footer className="h-[60px] bg-[#1e293b] border-t border-[#334155] px-4 flex items-center gap-2 shrink-0">
        <NavBtn active={activeTab === 'status'} onClick={() => setActiveTab('status')}>メイン</NavBtn>
        <NavBtn active={activeTab === 'others'} onClick={() => setActiveTab('others')}>視察</NavBtn>
        <NavBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')}>成績</NavBtn>
        <NavBtn active={activeTab === 'hof'} onClick={() => setActiveTab('hof')}>選手名鑑</NavBtn>
        <div className="ml-4 h-8 w-px bg-[#334155] hidden sm:block"></div>
        <div className="ml-auto text-[10px] text-[#64748b] tracking-widest font-black hidden lg:block">PRODUCED BY AI STUDIO GAME ENGINE</div>
      </footer>

      <AnimatePresence>
        {retirementReport && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0f172a] border border-[#334155] w-full max-w-2xl rounded-xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] p-6 border-b border-[#334155]">
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                  <Award className="w-8 h-8 text-amber-500" />
                  Monthly Retirement Report
                </h2>
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
                  Year {retirementReport.year} / Month {retirementReport.month}
                </p>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-4">
                {retirementReport.retiredPlayers.map(({ player, inducted, teamName, inductionReasons }, idx) => {
                  const careerAvg = player.careerAtBats > 0 ? player.careerHits / player.careerAtBats : 0;
                  return (
                    <div 
                      key={player.id} 
                      className={`p-4 rounded-lg border ${
                        inducted 
                          ? 'bg-amber-500/5 border-amber-500/30' 
                          : 'bg-[#1e293b]/30 border-[#334155]/50'
                      } relative overflow-hidden`}
                    >
                      {inducted && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-black text-[8px] font-black px-3 py-1 uppercase tracking-widest transform rotate-45 translate-x-3 -translate-y-1">
                          HALL OF FAME
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[9px] text-[#64748b] font-black uppercase mb-1 tracking-widest">{teamName}</p>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-white uppercase italic">{player.name}</h3>
                            {player.traits && player.traits.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {player.traits.map(trait => (
                                  <span 
                                    key={trait} 
                                    className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-sm ${TRAIT_DATA[trait]?.color || 'bg-slate-500'}`}
                                    title={TRAIT_DATA[trait]?.desc}
                                  >
                                    {TRAIT_DATA[trait]?.name || trait}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-[#64748b] font-black uppercase mb-1 tracking-widest">Reason</p>
                          <p className="text-amber-400 font-bold text-xs">{player.retirementReason}</p>
                        </div>
                      </div>

                      {inducted && inductionReasons && inductionReasons.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          <span className="text-[8px] text-amber-500 font-black uppercase border-r border-amber-500/30 pr-2 self-center">Induction Reasons</span>
                          {inductionReasons.map((reason, i) => (
                            <span key={i} className="text-[9px] text-emerald-400 font-bold bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-400/20 flex items-center gap-1.5">
                              <Star className="w-2.5 h-2.5 fill-emerald-400/30" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      {player.careerHits >= 1000 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          <span className="text-[9px] text-amber-400 font-black bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-2 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                            <Trophy className="w-3 h-3" />
                            {(() => {
                              const thresholds = [6000, 5000, 4000, 3000, 2000, 1000];
                              const milestone = thresholds.find(t => player.careerHits >= t);
                              return `${milestone}安打達成${milestone === 2000 ? ' (名球会入り)' : ''}`;
                            })()}
                          </span>
                          {(player.careerHomeRuns || 0) >= 300 && (
                            <span className="text-[9px] text-rose-400 font-black bg-rose-400/10 px-3 py-1 rounded-full border border-rose-400/30 flex items-center gap-2 shadow-[0_0_10px_rgba(251,113,133,0.1)]">
                              <Trophy className="w-3 h-3" />
                              {(() => {
                                const thresholds = [800, 700, 600, 500, 400, 300];
                                const milestone = thresholds.find(t => (player.careerHomeRuns || 0) >= t);
                                return `${milestone}本塁打達成`;
                              })()}
                            </span>
                          )}
                          {(player.careerStolenBases || 0) >= 200 && (
                            <span className="text-[9px] text-emerald-400 font-black bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                              <Trophy className="w-3 h-3" />
                              {(() => {
                                const thresholds = [900, 800, 700, 600, 500, 400, 300, 200];
                                const milestone = thresholds.find(t => (player.careerStolenBases || 0) >= t);
                                return `${milestone}盗塁達成`;
                              })()}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center bg-black/40 p-2 rounded">
                          <p className="text-[7px] text-[#64748b] font-bold uppercase">Career Avg</p>
                          <p className="text-white font-mono font-black">.{Math.round(careerAvg * 1000).toString().padStart(3, '0')}</p>
                        </div>
                        <div className="text-center bg-black/40 p-2 rounded">
                          <p className="text-[7px] text-[#64748b] font-bold uppercase">Hits</p>
                          <p className="text-white font-mono font-black">{player.careerHits}</p>
                        </div>
                        <div className="text-center bg-black/40 p-2 rounded">
                          <p className="text-[7px] text-[#64748b] font-bold uppercase">Years</p>
                          <p className="text-white font-mono font-black">{Math.floor(player.totalMonths / 12)}Y</p>
                        </div>
                        <div className="text-center bg-black/40 p-2 rounded border border-amber-500/20">
                          <p className="text-[7px] text-amber-500/50 font-bold uppercase">Peak</p>
                          <p className="text-amber-500 font-mono font-black">.{Math.round(player.peakAvg * 1000).toString().padStart(3, '0')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 bg-[#020617] border-t border-[#334155] flex justify-center">
                <button 
                  onClick={() => {
                    setRetirementReport(null);
                    if (userTeam.players.length < TEAM_TOTAL_PLAYERS) {
                      setIsNamingPlayer(true);
                    }
                  }}
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-12 py-3 rounded font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95"
                >
                  Confirm & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inventory Overview Modal */}
      <AnimatePresence>
        {isInventoryOpen && (
          <InventoryOverviewModal 
            inventory={userTeam.inventory} 
            players={userTeam.players} 
            onClose={() => setIsInventoryOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpOpen && (
          <GameHelpModal onClose={() => setIsHelpOpen(false)} />
        )}
      </AnimatePresence>

      {/* Naming Modal */}
      {isNamingPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0f172a] border border-[#334155] w-full max-w-md rounded-lg p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#3b82f6]"></div>
            
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter italic">Player Registration</h3>
            
            {gameState.retiredUserPlayerNames && gameState.retiredUserPlayerNames.length > 0 ? (
              <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Replacement For</p>
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-white font-bold text-sm">{gameState.retiredUserPlayerNames[0]}</span>
                  <span className="text-slate-500 text-[10px] italic">の後継者</span>
                </div>
              </div>
            ) : (
              <p className="text-[#94a3b8] text-xs font-medium mb-6 uppercase tracking-widest">新しい選手を登録してください</p>
            )}
            
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                placeholder="選手名を入力..."
                onKeyDown={(e) => e.key === 'Enter' && handleNamePlayer()}
                className="bg-[#1e293b] border border-[#334155] text-white rounded px-4 py-3 outline-none focus:border-[#3b82f6] transition-colors font-bold"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleNamePlayer}
                  className="flex-1 bg-[#3b82f6] text-white py-3 rounded font-black uppercase tracking-widest hover:bg-[#2563eb] transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                >
                  Confirm Entry
                </button>
                <button 
                  onClick={() => setIsNamingPlayer(false)}
                  className="px-6 bg-transparent border border-[#334155] text-[#94a3b8] py-3 rounded font-black uppercase tracking-widest hover:text-white hover:border-[#475569] transition-all"
                >
                  X
                </button>
              </div>
              <button 
                onClick={() => setNewName(generatePlayerName())}
                className="text-[10px] text-[#3b82f6] hover:underline font-bold uppercase tracking-widest text-center"
              >
                Random Generation
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        teams={gameState.teams}
        difficulty={gameState.difficulty}
        onRenameTeam={renameTeam}
        onSetDifficulty={setDifficulty}
        onResetGame={handleResetGame}
      />

      <SeasonReportModal 
        isOpen={isSeasonReportOpen} 
        onClose={() => {
          setIsSeasonReportOpen(false);
          setSeasonReport(null);
          if (pendingRetirementReport) {
            setRetirementReport(pendingRetirementReport);
            setPendingRetirementReport(null);
          } else if (userTeam.players.length < TEAM_TOTAL_PLAYERS) {
            setIsNamingPlayer(true);
          }
        }} 
        report={seasonReport} 
        userTeamId={userTeam.id}
      />
    </div>
  );
}

function SeasonReportModal({ isOpen, onClose, report, userTeamId }: { 
  isOpen: boolean, 
  onClose: () => void, 
  report: SeasonResult | null,
  userTeamId: string
}) {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#111827] border border-[#374151] rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.2)]"
      >
        <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          </div>
          <div className="relative z-10 text-center">
            <div className="inline-block px-3 py-1 bg-blue-500/30 border border-blue-400/50 rounded-full mb-2">
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em]">Season Archive</span>
            </div>
            <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase drop-shadow-xl">Season {report.year} Report</h1>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors">
             <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-[#0f172a]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Standings */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Final Standings</h3>
              </div>
              <div className="space-y-2">
                {report.standings.map((s) => (
                  <div key={s.teamId} className={`flex items-center justify-between p-2 rounded-lg ${s.teamId === userTeamId ? 'bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`w-4 text-center font-black italic text-sm ${s.rank === 1 ? 'text-amber-500' : 'text-slate-500'}`}>{s.rank}</span>
                        {s.prevRank !== undefined && (
                          <span className={`text-[7px] font-black tracking-tighter ${
                            s.prevRank > s.rank ? 'text-emerald-500' : 
                            s.prevRank < s.rank ? 'text-rose-500' : 
                            'text-slate-600'
                          }`}>
                            {s.prevRank > s.rank ? `↑${s.prevRank - s.rank}` : 
                             s.prevRank < s.rank ? `↓${s.rank - s.prevRank}` : 
                             'ー'}
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-bold truncate max-w-[100px] ${s.teamId === userTeamId ? 'text-blue-400' : 'text-slate-300'}`}>{s.teamName}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[11px] font-mono font-black text-white">{(s.score || s.avg).toFixed(1)}</span>
                       <span className="text-[7px] block text-slate-500 font-black tracking-tighter uppercase">Score</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Awards & Records */}
            <div className="space-y-8">
              {/* Season Awards */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Season Awards</h3>
                </div>
                <div className="space-y-3">
                  {report.awards?.map((a, i) => (
                    <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">
                          {({
                            MVP: 'MVP',
                            BEST_BATTER: '首位打者',
                            ROOKIE_OF_THE_YEAR: '新人王',
                            HR_KING: '本塁打王',
                            SB_KING: '盗塁王',
                            MOST_HITS: '最多安打'
                          }[a.type as AwardType] || a.type).replace(/_/g, ' ')}
                        </span>
                        {a.statValue && <span className="text-[10px] font-mono font-black text-amber-500">{a.statValue}</span>}
                      </div>
                      <p className="text-sm font-black text-white truncate">{a.playerName}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{a.teamName}</p>
                    </div>
                  ))}
                  {(!report.awards || report.awards.length === 0) && (
                     <p className="text-[10px] text-slate-500 italic text-center py-4">No awards recorded</p>
                  )}
                </div>
              </div>

              {/* Historical Records Broken */}
            <div className="md:col-span-2">
              {report.newHistoricalRecords && report.newHistoricalRecords.length > 0 && (
                <div className="animate-in fade-in slide-in-from-right duration-500 mb-8">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Star className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Historical Record Broken!</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.newHistoricalRecords.map((rec, i) => (
                      <div key={i} className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                            {rec.isNewBest ? '歴代最高記録更新！' : '歴代TOP10入り！'}
                          </span>
                          <span className="text-[10px] font-mono font-black text-white">
                            {rec.type === 'avg' 
                              ? `.${Math.round(rec.value * 1000).toString().padStart(3, '0')}`
                              : rec.value}{rec.type === 'hits' ? '安打' : rec.type === 'hr' ? '本塁打' : rec.type === 'sb' ? '盗塁' : '打率'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-white truncate">{rec.playerName}</p>
                          <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                            歴代シーズン{rec.type === 'hits' ? '安打' : rec.type === 'hr' ? '本塁打' : rec.type === 'sb' ? '盗塁' : '打率'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Development & Draft */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Acquired Traits */}
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Skill Growth</h3>
                  </div>
                  <div className="space-y-3">
                    {report.acquiredTraits?.map((a, i) => (
                      <div key={i} className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-black text-white">{a.playerName}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white ${TRAIT_DATA[a.trait]?.color || 'bg-slate-500'}`}>
                            {TRAIT_DATA[a.trait]?.name || a.trait}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-200/60 font-bold uppercase tracking-tight italic">
                          覚醒: {a.reason}
                        </p>
                      </div>
                    ))}
                    {(!report.acquiredTraits || report.acquiredTraits.length === 0) && (
                       <p className="text-[10px] text-slate-600 italic text-center py-4 bg-white/5 rounded-xl">No significant growth this season</p>
                    )}
                  </div>
                </div>

                {/* Draft Results */}
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Draft News</h3>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {report.newPlayers?.map((p, i) => (
                      <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-white">{p.name}</p>
                          <span className="text-[8px] text-blue-400 font-bold uppercase tracking-tighter">{p.teamName}</span>
                        </div>
                        {p.traits && p.traits.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.traits.map(t => (
                              <span key={t} className="text-[7px] font-black px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                                {TRAIT_DATA[t]?.name || t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!report.newPlayers || report.newPlayers.length === 0) && (
                       <p className="text-[10px] text-slate-600 italic text-center py-4">No draft this year</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="mt-12 bg-black/30 p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-white" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">League Score Comparison</h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.standings}>
                  <XAxis 
                    dataKey="teamName" 
                    hide 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '11px' }}
                    labelStyle={{ color: '#fff', fontSize: '10px', marginBottom: '4px' }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {report.standings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.teamId === userTeamId ? '#3b82f6' : '#1e293b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-500">
               <span>Bottom of Table</span>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>Your Team</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#1e293b]"></div>
                    <span>Rivals</span>
                  </div>
               </div>
               <span>League Champions</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-[#0f172a] border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <span>次シーズンへ</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function NavBtn({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`bg-transparent border border-[#334155] text-[#94a3b8] flex-1 py-1.5 rounded text-[10px] sm:text-[11px] uppercase font-black tracking-widest cursor-pointer transition-all flex items-center justify-center shrink-0 min-w-0 ${
        active ? 'bg-[#3b82f6] text-white border-[#3b82f6]' : 'hover:border-[#475569] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function SidebarRoster({ players, inventory }: { players: Player[], inventory: Item[] }) {
  const sorted = [...players].sort((a, b) => {
    if (a.isStarter && !b.isStarter) return -1;
    if (!a.isStarter && b.isStarter) return 1;
    const avgA = a.careerAtBats > 0 ? a.careerHits / a.careerAtBats : 0;
    const avgB = b.careerAtBats > 0 ? b.careerHits / b.careerAtBats : 0;
    return avgB - avgA;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] text-[#64748b] border-b border-[#334155]/30 pb-1 px-1">
        <span>Player</span>
        <div className="flex gap-4">
          <span className="w-8 text-center">Cond</span>
          <span className="w-10 text-right">AVG</span>
        </div>
      </div>
      <div className="space-y-1">
        {sorted.map(p => {
          const avg = p.careerAtBats > 0 ? p.careerHits / p.careerAtBats : 0;
          const isFatigued = (p.fatigue || 0) > 0.6;
          const isWarning = (p.fatigue || 0) > 0.3;
          const items = (p.equippedItemIds || []).map(id => inventory.find(i => i.id === id)).filter(Boolean) as Item[];

          return (
            <div key={p.id} className={`group flex items-center justify-between p-1.5 rounded transition-all ${p.isStarter ? 'bg-[#1e293b]/50 border border-[#334155]/50 shadow-sm' : 'opacity-60 blur-[0.2px]'}`}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.isStarter ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="font-bold text-white text-[11px] truncate leading-tight">{p.name}</span>
                    {items.length > 0 && <Package className="w-2.5 h-2.5 text-blue-400 shrink-0" title={items.map(i => i.name).join(', ')} />}
                  </div>
                  {p.isStarter && (
                    <span className="text-[7px] text-[#64748b] font-black uppercase tracking-tighter">Starter</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-8 flex justify-center">
                  <div className="relative w-6 h-1 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-0 transition-all ${isFatigued ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.round((1 - (p.fatigue || 0)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className={`w-10 text-right font-mono font-black text-[10px] ${p.isStarter ? 'text-white' : 'text-slate-500'}`}>
                  .{Math.round(avg * 1000).toString().padStart(3, '0')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeagueSidebar({ teams }: { teams: Team[] }) {
  const sorted = teams.map(t => {
    const hits = t.players.reduce((sum, p) => sum + p.currentSeasonHits, 0);
    const ab = t.players.reduce((sum, p) => sum + p.currentSeasonAtBats, 0);
    return { ...t, currentAvg: ab > 0 ? hits / ab : 0 };
  }).sort((a, b) => b.currentAvg - a.currentAvg);

  return (
    <div className="space-y-1">
      {sorted.map((t, i) => (
        <div key={t.id} className={`flex justify-between items-center py-2 border-b border-[#1e293b] text-[11px] ${t.isUserTeam ? 'bg-[#3b82f6]/10 px-2 -mx-2' : ''}`}>
          <div className="flex items-center gap-3">
             <span className="w-4 font-black text-[#3b82f6]">{i + 1}</span>
             <span className={t.isUserTeam ? 'text-white font-black' : 'text-slate-300'}>{t.name}</span>
          </div>
          <span className="font-mono text-[#94a3b8]">.{Math.round(t.currentAvg * 1000).toString().padStart(3, '0')}</span>
        </div>
      ))}
    </div>
  );
}

function PlayerGrid({ 
  players, 
  isUserTeam, 
  onToggleStarter, 
  onEquipItem,
  onAutoEquip,
  autoManageRoster,
  userTeam,
  onForceRetire
}: { 
  players: Player[], 
  isUserTeam?: boolean, 
  onToggleStarter?: (id: string) => void,
  onEquipItem?: (playerId: string, itemId: string | null, action?: 'equip' | 'unequip') => void,
  onAutoEquip?: () => void,
  autoManageRoster?: boolean,
  userTeam?: Team,
  onForceRetire?: (id: string) => void
}) {
  const [page, setPage] = useState(0);
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<Player | null>(null);
  const [confirmRetire, setConfirmRetire] = useState(false);

  // Reset confirm state when modal closes
  useEffect(() => {
    if (!selectedPlayerDetail) {
      setConfirmRetire(false);
    }
  }, [selectedPlayerDetail]);

  // Safety fallbacks to avoid filter errors on undefined
  const inventory = userTeam?.inventory || [];
  const playersInTeam = userTeam?.players || [];
  const itemsPerPage = 15;

  // Sort: Starters first, then by avg
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isStarter && !b.isStarter) return -1;
    if (!a.isStarter && b.isStarter) return 1;
    const avgA = a.careerAtBats > 0 ? a.careerHits / a.careerAtBats : 0;
    const avgB = b.careerAtBats > 0 ? b.careerHits / b.careerAtBats : 0;
    return avgB - avgA;
  });

  const totalPages = Math.ceil(sortedPlayers.length / itemsPerPage);
  const currentPlayers = sortedPlayers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="flex flex-col gap-4">
      {/* Roster Header */}
      <div className="flex items-center justify-between bg-[#1e293b]/30 p-3 rounded-xl border border-[#334155]/50 mb-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Team Roster Management
          </h3>
          <p className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest mt-1">
            Displaying {currentPlayers.length} Members • {currentPlayers.filter(p => p.isStarter).length} Starters
          </p>
        </div>
        {isUserTeam && (
          <button 
            onClick={onAutoEquip}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <Package className="w-3 h-3" />
            Auto-equip All
          </button>
        )}
      </div>

      {/* Grid: Player Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {currentPlayers.map((player) => {
          const careerAvg = player.careerAtBats > 0 ? player.careerHits / player.careerAtBats : 0;
          const seasonAvg = player.currentSeasonAtBats > 0 ? player.currentSeasonHits / player.currentSeasonAtBats : 0;
          const isFatigued = (player.fatigue || 0) > 0.6;
          const isWarning = (player.fatigue || 0) > 0.3;
          
          return (
            <motion.div 
              layout
              key={player.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group flex flex-col bg-[#1e293b]/40 border rounded-xl overflow-hidden transition-all hover:bg-[#1e293b]/60 ${
                player.isStarter 
                  ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                  : 'border-[#334155] opacity-80'
              }`}
            >
              {/* Header: Name and Status */}
              <div className="p-3 border-b border-[#334155]/50 flex items-center justify-between bg-gradient-to-r from-black/20 to-transparent">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div 
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      player.isStarter ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'
                    }`}
                  />
                  <h4 className="font-black text-white text-sm tracking-tight truncate">{player.name}</h4>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {player.traits?.slice(0, 2).map(trait => (
                    <span 
                      key={trait} 
                      className={`text-[7px] font-black px-1 py-0.5 rounded text-white shadow-sm ${TRAIT_DATA[trait]?.color || 'bg-slate-500'}`}
                    >
                      {TRAIT_DATA[trait]?.name || trait}
                    </span>
                  ))}
                  {player.traits?.length > 2 && <span className="text-[7px] font-black text-slate-500">+{player.traits.length - 2}</span>}
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                    player.growthType === 'early' ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400' : 
                    player.growthType === 'late' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 
                    'bg-slate-500/10 border-slate-500/30 text-slate-400'
                  }`}>
                    {player.growthType === 'early' ? '早熟' : player.growthType === 'late' ? '晩成' : '普通'}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-3 grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest mb-1 font-mono">Season AVG</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-xl font-black text-white leading-none">.{Math.round(seasonAvg * 1000).toString().padStart(3, '0')}</span>
                    {seasonAvg > careerAvg && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest font-mono">Condition</span>
                    <span className={`text-[9px] font-mono font-black ${isFatigued ? "text-rose-500" : isWarning ? "text-amber-500" : "text-emerald-500"}`}>
                      {Math.round((1 - (player.fatigue || 0)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((1 - (player.fatigue || 0)) * 100)}%` }}
                      className={`h-full ${isFatigued ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : isWarning ? "bg-amber-500" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Equipment Row */}
              <div className="px-3 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                  {(player.equippedItemIds || []).length > 0 ? (
                    (player.equippedItemIds || []).map(itemId => {
                      const item = inventory.find(i => i.id === itemId);
                      return (
                        <div key={itemId} className="flex items-center gap-1.5 text-blue-400 bg-blue-500/5 px-2 py-1.5 rounded-lg border border-blue-500/20 max-w-full">
                          <Package className="w-3 h-3 shrink-0" />
                          <span className="text-[9px] font-black uppercase truncate tracking-tight">{item?.name || 'Item'}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-600 px-2 py-1.5 bg-black/10 rounded-lg border border-slate-800/50">
                      <Package className="w-3 h-3 shrink-0 opacity-20" />
                      <span className="text-[9px] font-bold uppercase tracking-tighter opacity-50">Empty Slot</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-[#64748b] font-black uppercase tracking-tight">Experience</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 leading-none">{Math.floor(player.totalMonths / 12)} Years</span>
                </div>
              </div>

              {/* Actions Footer */}
              {isUserTeam && (
                <div className="mt-auto p-2 bg-black/20 border-t border-[#334155]/50 flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlayerDetail(player);
                    }}
                    className="flex-1 bg-[#334155] hover:bg-[#475569] text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-center focus:ring-1 ring-blue-500/50"
                  >
                    View Stats
                  </button>
                  <button 
                    disabled={autoManageRoster !== false}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStarter?.(player.id);
                    }}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 border min-w-[90px] ${
                      autoManageRoster !== false
                        ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                        : player.isStarter 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20 active:scale-95' 
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 active:scale-95'
                    }`}
                  >
                    {autoManageRoster !== false ? (
                      <Zap className="w-3 h-3 opacity-50" />
                    ) : player.isStarter ? (
                      'Bench'
                    ) : (
                      'Starter'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Player Detail Modal */}
      <AnimatePresence>
        {selectedPlayerDetail && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]"
            onClick={() => setSelectedPlayerDetail(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f172a] border border-[#334155] w-full max-w-md rounded-lg shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#3b82f6] shrink-0"></div>
              
              <div className="p-5 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest inline-block shrink-0 ${
                        selectedPlayerDetail.isStarter ? 'bg-[#3b82f6] text-white' : 'bg-[#334155] text-slate-400'
                      }`}>
                        {selectedPlayerDetail.isStarter ? 'Starting Member' : 'Bench Member'}
                      </span>
                      {selectedPlayerDetail.awards?.length > 0 && (
                         <div className="flex flex-wrap gap-1">
                            {selectedPlayerDetail.awards.map((a, i) => (
                              <AwardBadge key={i} type={a.type} year={a.year} size="sm" />
                            ))}
                         </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-tight">{selectedPlayerDetail.name}</h3>
                    {selectedPlayerDetail.traits?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedPlayerDetail.traits.map(trait => (
                          <div 
                            key={trait} 
                            className={`px-2 py-0.5 rounded text-[9px] font-black text-white shadow-md flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${TRAIT_DATA[trait]?.color || 'bg-slate-500'}`}
                            title={TRAIT_DATA[trait]?.desc}
                          >
                            <span className="shrink-0">{TRAIT_DATA[trait]?.name || trait}</span>
                            <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                            <span className="text-[7px] opacity-90">{TRAIT_DATA[trait]?.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[#64748b] text-[9px] font-mono uppercase tracking-widest mt-1">ID: {selectedPlayerDetail.id.slice(-8)}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPlayerDetail(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all bg-slate-900/50 border border-slate-800 self-start"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <StatCard label="Career Avg" value={`.${Math.round((selectedPlayerDetail.careerAtBats > 0 ? selectedPlayerDetail.careerHits / selectedPlayerDetail.careerAtBats : 0) * 1000).toString().padStart(3, '0')}`} color="text-[#3b82f6]" />
                  <StatCard label="Peak Avg" value={`.${Math.round(selectedPlayerDetail.peakAvg * 1000).toString().padStart(3, '0')}`} color="text-amber-500" />
                  <StatCard label="Season Avg" value={`.${Math.round((selectedPlayerDetail.currentSeasonAtBats > 0 ? selectedPlayerDetail.currentSeasonHits / selectedPlayerDetail.currentSeasonAtBats : 0) * 1000).toString().padStart(3, '0')}`} color="text-[#10b981]" />
                  <StatCard label="Age / Peak" value={`${Math.floor(selectedPlayerDetail.ageInMonths / 12)} / ${Math.floor(selectedPlayerDetail.peakAgeMonths / 12)}Y`} />
                  <StatCard label="Growth Type" value={selectedPlayerDetail.growthType === 'early' ? '早熟' : selectedPlayerDetail.growthType === 'late' ? '晩成' : '普通'} color={selectedPlayerDetail.growthType === 'early' ? 'text-fuchsia-400' : selectedPlayerDetail.growthType === 'late' ? 'text-blue-400' : 'text-slate-400'} />
                  <StatCard 
                    label="Condition" 
                    value={`${Math.round((1 - (selectedPlayerDetail.fatigue || 0)) * 100)}%`} 
                    color={(selectedPlayerDetail.fatigue || 0) > 0.6 ? "text-rose-500" : (selectedPlayerDetail.fatigue || 0) > 0.3 ? "text-amber-500" : "text-emerald-500"} 
                  />
                  <StatCard label="Career HR" value={(selectedPlayerDetail.careerHomeRuns || 0).toString()} color="text-rose-500" />
                  <StatCard label="Career SB" value={(selectedPlayerDetail.careerStolenBases || 0).toString()} color="text-blue-400" />
                  <StatCard label="Total Hits" value={selectedPlayerDetail.careerHits.toString()} />
                </div>

                <div className="mb-5 p-4 bg-[#1e293b]/50 rounded-xl border border-[#334155] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Items & Equipment</p>
                    <div className="flex items-center gap-2">
                      {isUserTeam && inventory.filter(item => !playersInTeam.some(p => (p.equippedItemIds || []).includes(item.id))).length > 0 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const available = inventory.filter(item => !playersInTeam.some(p => (p.equippedItemIds || []).includes(item.id)));
                            if (available.length > 0) {
                              onEquipItem?.(selectedPlayerDetail.id, available[0].id);
                              setSelectedPlayerDetail(prev => {
                                if (!prev) return null;
                                const isDual = prev.traits?.includes('dual_wield') || prev.traits?.includes('protagonist');
                                const max = isDual ? 2 : 1;
                                let nextIds = prev.equippedItemIds || [];
                                if (nextIds.length >= max) {
                                  if (max === 2) nextIds = [nextIds[0], available[0].id];
                                  else nextIds = [available[0].id];
                                } else {
                                  nextIds = [...nextIds, available[0].id];
                                }
                                return { ...prev, equippedItemIds: nextIds };
                              });
                            }
                          }}
                          className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                          Quick Equip
                        </button>
                      )}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20`}>
                        {(selectedPlayerDetail.equippedItemIds || []).length > 0 ? 'Equipped' : 'Slot Empty'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                     {/* Current Item Display / Interactive Slot */}
                     {(selectedPlayerDetail.equippedItemIds || []).length > 0 ? (
                        (selectedPlayerDetail.equippedItemIds || []).map((itemId) => {
                          const item = inventory.find(i => i.id === itemId);
                          return item ? (
                            <div key={itemId} className="group relative flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-blue-500/30 hover:border-blue-500/60 transition-all cursor-default">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                                  <Package className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-white leading-tight">{item.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{item.description}</p>
                                </div>
                              </div>
                              {isUserTeam && (
                                <button 
                                  onClick={() => {
                                    const nextIds = (selectedPlayerDetail.equippedItemIds || []).filter(id => id !== itemId);
                                    onEquipItem?.(selectedPlayerDetail.id, itemId, 'unequip');
                                    setSelectedPlayerDetail(prev => prev ? { ...prev, equippedItemIds: nextIds } : null);
                                  }}
                                  className="text-[10px] font-black text-rose-500 hover:text-rose-400 px-3 py-1 bg-rose-500/10 rounded border border-rose-500/20 transition-all hover:bg-rose-500/20"
                                >
                                  Unequip
                                </button>
                              )}
                            </div>
                          ) : null;
                        })
                     ) : (
                        <div 
                          className={`p-6 bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700/50 flex flex-col items-center justify-center gap-2 group transition-all ${isUserTeam ? 'hover:border-[#3b82f6]/30 cursor-pointer' : ''}`}
                        >
                           <Package className="w-6 h-6 text-slate-700 group-hover:text-[#3b82f6]/50 transition-colors" />
                           <span className="text-[11px] text-slate-600 font-black uppercase tracking-widest italic group-hover:text-slate-500 transition-colors">
                             {isUserTeam ? 'Tap Inventory Below to Equip' : 'No Item Equipped'}
                           </span>
                        </div>
                     )}

                    {/* Available Items Selection (Only for User Team) */}
                    {isUserTeam && (
                      <div className="mt-4 pt-4 border-t border-[#334155]/50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">Available Inventory</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {ITEM_TYPES.map(it => {
                            const typeItems = inventory.filter(i => i.type === it.type);
                            const availableItems = typeItems.filter(i => !playersInTeam.some(p => (p.equippedItemIds || []).includes(i.id)));
                            const stockCount = availableItems.length;
                            const totalCount = typeItems.length;

                            return (
                              <button
                                key={it.type}
                                disabled={stockCount === 0}
                                onClick={() => {
                                  if (stockCount > 0) {
                                    onEquipItem?.(selectedPlayerDetail.id, availableItems[0].id);
                                    setSelectedPlayerDetail(prev => {
                                      if (!prev) return null;
                                      const isDual = prev.traits?.includes('dual_wield') || prev.traits?.includes('protagonist');
                                      const max = isDual ? 2 : 1;
                                      let nextIds = prev.equippedItemIds || [];
                                      if (nextIds.includes(availableItems[0].id)) return prev;
                                      if (nextIds.length >= max) {
                                        if (max === 2) nextIds = [nextIds[0], availableItems[0].id];
                                        else nextIds = [availableItems[0].id];
                                      } else {
                                        nextIds = [...nextIds, availableItems[0].id];
                                      }
                                      return { ...prev, equippedItemIds: nextIds };
                                    });
                                  }
                                }}
                                className={`flex items-center gap-2 p-2 bg-[#0f172a] border border-[#334155]/60 rounded-lg text-left transition-all group ${
                                  stockCount > 0 
                                    ? 'hover:bg-[#1e293b] hover:border-[#3b82f6]/40 cursor-pointer' 
                                    : 'opacity-40 cursor-not-allowed grayscale'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors shrink-0 ${
                                  stockCount > 0 ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-slate-800'
                                }`}>
                                  {stockCount > 0 ? <Plus className="w-3 h-3 text-blue-400" /> : <Package className="w-3 h-3 text-slate-600" />}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1 overflow-hidden">
                                     <span className="text-[10px] font-black text-white truncate">{it.name}</span>
                                     <span className={`text-[9px] font-mono font-bold shrink-0 ${stockCount > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                                       {stockCount}/{totalCount}
                                     </span>
                                  </div>
                                  <span className="text-[8px] text-slate-500 line-clamp-1">{it.desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isUserTeam && onToggleStarter && (
                  <div className="mb-5 p-4 bg-[#1e293b]/50 rounded-xl border border-[#334155] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Team Strategy</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${selectedPlayerDetail.isStarter ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                        {selectedPlayerDetail.isStarter ? 'Starting Member' : 'Bench Member'}
                      </span>
                    </div>
                    <button
                      disabled={autoManageRoster !== false}
                      onClick={() => {
                        onToggleStarter(selectedPlayerDetail.id);
                        setSelectedPlayerDetail(prev => prev ? { ...prev, isStarter: !prev.isStarter } : null);
                      }}
                      className={`w-full py-3 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                        autoManageRoster !== false
                          ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20 cursor-not-allowed opacity-50'
                          : selectedPlayerDetail.isStarter 
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 shadow-lg shadow-rose-900/10' 
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-lg shadow-emerald-900/10'
                      }`}
                    >
                      {autoManageRoster !== false ? (
                        <>
                          <Zap className="w-4 h-4" />
                          自動管理実行中
                        </>
                      ) : selectedPlayerDetail.isStarter ? (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          ベンチに下げる
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          スターターに起用
                        </>
                      )}
                    </button>
                    {autoManageRoster !== false && (
                      <p className="text-[10px] text-blue-400/70 text-center italic font-medium px-2 leading-relaxed">
                        自動管理が有効です。毎月、疲労度を考慮して最適なメンバーが自動的に選出されます。
                      </p>
                    )}
                    {autoManageRoster === false && selectedPlayerDetail.fatigue > 0.4 && !selectedPlayerDetail.isStarter && (
                      <p className="text-[10px] text-amber-500/70 text-center italic font-medium">現在療養中（体力回復を待っています）</p>
                    )}
                    {autoManageRoster === false && selectedPlayerDetail.fatigue > 0.6 && selectedPlayerDetail.isStarter && (
                      <p className="text-[10px] text-rose-500/70 text-center italic font-medium">疲労が蓄積しています！休養をおすすめします。</p>
                    )}
                  </div>
                )}

                {/* Batting Average Trend Chart */}
                {selectedPlayerDetail.seasonHistory?.length > 0 && (
                  <div className="mb-5 p-3 bg-black/30 rounded-lg border border-[#334155]/30">
                    <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest mb-3">Batting Average Transition</p>
                    <div className="w-full h-[100px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedPlayerDetail.seasonHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis 
                            dataKey="year" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }} 
                            tickFormatter={(val) => `Y${val}`}
                          />
                          <YAxis 
                            domain={['dataMin - 0.01', 'dataMax + 0.01']} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }}
                            tickFormatter={(val) => `.${Math.round(val * 1000)}`}
                            hide
                          />
                          <Tooltip 
                             contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px' }}
                             itemStyle={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '10px' }}
                             labelStyle={{ color: '#fff', fontSize: '8px', marginBottom: '2px' }}
                             formatter={(value: number) => [`.${Math.round(value * 1000).toString().padStart(3, '0')}`, "AVG"]}
                             labelFormatter={(label) => `Season Y${label}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avg" 
                            stroke="#3b82f6" 
                            strokeWidth={2} 
                            dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }} 
                            activeDot={{ r: 4, fill: '#fff', strokeWidth: 0 }}
                            animationDuration={600}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 p-3 bg-[#1e293b]/30 rounded-lg border border-[#334155]/50 mb-6">
                  <div className="text-center">
                    <p className="text-[8px] text-[#64748b] font-black uppercase mb-0.5">Age</p>
                    <p className="text-white text-xs font-bold">{Math.floor(selectedPlayerDetail.ageInMonths / 12)}Y</p>
                  </div>
                  <div className="text-center border-x border-[#334155]/50">
                    <p className="text-[8px] text-[#64748b] font-black uppercase mb-0.5">Exp</p>
                    <p className="text-white text-xs font-bold">{Math.floor(selectedPlayerDetail.totalMonths / 12)}Y</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] text-[#64748b] font-black uppercase mb-0.5">Status</p>
                    <p className={`text-xs font-bold ${selectedPlayerDetail.isActive ? 'text-[#10b981]' : 'text-slate-500'}`}>
                      {selectedPlayerDetail.isActive ? 'ACTIVE' : 'RETIRED'}
                    </p>
                  </div>
                </div>

                {isUserTeam && onForceRetire && selectedPlayerDetail && (
                  <div className="mb-6 p-4 bg-rose-500/5 rounded-xl border border-rose-500/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/70 italic">Emergency Measure</p>
                      <AlertTriangle className="w-3 h-3 text-rose-500/50" />
                    </div>
                    
                    {!confirmRetire ? (
                      <button
                        onClick={() => setConfirmRetire(true)}
                        className="w-full py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all shadow-lg shadow-rose-900/5 active:scale-95"
                      >
                        強制引退
                      </button>
                    ) : (
                      <div className="space-y-3 animate-in zoom-in-95 duration-200">
                        <p className="text-[10px] text-white font-black text-center uppercase tracking-wider">引退させますか？</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onForceRetire(selectedPlayerDetail.id);
                              setSelectedPlayerDetail(null);
                              setConfirmRetire(false);
                            }}
                            className="flex-1 py-3 rounded-lg text-[10px] font-black bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                          >
                            YES
                          </button>
                          <button
                            onClick={() => setConfirmRetire(false)}
                            className="flex-1 py-3 rounded-lg text-[10px] font-black bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700 active:scale-95"
                          >
                            NO
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-[9px] text-[#64748b] text-center italic font-medium leading-normal px-2">
                      ※この操作は取り消せません。救済措置として、新しく加入する選手は特性を持たない状態で生成されます。
                    </p>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedPlayerDetail(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 border border-[#334155] text-[#94a3b8] py-3 rounded font-black uppercase text-[10px] tracking-widest hover:text-white transition-all"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InventoryOverviewModal({ inventory = [], players = [], onClose }: { inventory?: Item[], players?: Player[], onClose: () => void }) {
  const equippedItemIds = new Set(players.flatMap(p => p.equippedItemIds || []));

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-[#0f172a] border border-[#334155] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#334155] flex items-center justify-between bg-gradient-to-r from-[#1e293b] to-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Team Inventory</h2>
              <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest mt-1">Equipment Status Overview</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500 hover:text-white" />
          </button>
        </div>
        
        <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar flex-1">
          {ITEM_TYPES.map(it => {
            const totalItems = inventory.filter(i => i.type === it.type);
            const equippedCount = totalItems.filter(i => equippedItemIds.has(i.id)).length;
            
            return (
              <div key={it.type} className="bg-[#1e293b]/30 border border-[#334155]/50 rounded-xl p-4 flex items-center justify-between group hover:border-[#3b82f6]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-[#334155] group-hover:bg-blue-500/10 transition-colors">
                    <Package className={`w-6 h-6 ${equippedCount < totalItems.length ? 'text-blue-400' : 'text-amber-500'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{it.name}</h3>
                    <p className="text-[10px] text-slate-500 font-medium max-w-[180px]">{it.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#64748b] font-black uppercase tracking-widest mb-1">Stock</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={`text-2xl font-mono font-black ${totalItems.length - equippedCount > 0 ? 'text-blue-400' : 'text-slate-700'}`}>
                      {totalItems.length - equippedCount}
                    </span>
                    <span className="text-slate-600 font-mono text-sm">/ {totalItems.length}</span>
                  </div>
                  <div className="w-24 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${totalItems.length - equippedCount === 0 ? 'bg-slate-700' : 'bg-blue-500'}`}
                      style={{ width: `${((totalItems.length - equippedCount) / Math.max(1, totalItems.length)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="p-6 bg-[#020617] border-t border-[#334155] flex justify-center shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-lg"
          >
            Close Inventory
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GameHelpModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'flow' | 'traits' | 'items'>('flow');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-[#0f172a] border border-[#334155] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#334155] flex items-center justify-between bg-gradient-to-r from-[#1e293b] to-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <HelpCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Game Help</h2>
              <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest mt-1">Manual & Descriptions</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-[#334155] bg-[#020617]">
          {[
            { id: 'flow', label: '遊び方', icon: PlayCircle },
            { id: 'traits', label: '特性', icon: Star },
            { id: 'items', label: 'アイテム', icon: Package },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                activeTab === tab.id ? 'text-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeHelpTab"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {activeTab === 'flow' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <section className="space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                  ゲームの進め方
                </h3>
                <div className="grid gap-3">
                  {[
                    "「試合開始」ボタンで1ヶ月ずつ時間が経過します。",
                    "毎月、選手の成績が更新され、疲労が蓄積します。",
                    "12ヶ月（1年）経過するとシーズンが終了し、リーグ順位が決定します。",
                    "シーズン終了時には成績優秀者の表彰と、年齢による引退が発生します。"
                  ].map((text, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-[#1e293b]/50 border border-[#334155] rounded-xl text-xs text-slate-300 leading-relaxed">
                      <span className="text-blue-500 font-black">{i + 1}.</span>
                      {text}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                  チームマネジメント & 装備
                </h3>
                <div className="grid gap-3">
                  {[
                    "スタメン（10名）とベンチ（5名）を入れ替えて疲労を管理しましょう。",
                    "ベンチ選手は疲労回復が早まります。画面右上の設定から「オート交代」をOFFにすれば、マニュアル操作も可能です。",
                    "「一括装備（Auto Equip）」ボタンを押すと、所持アイテムを空きスロットへ自動で割り当てます。",
                    "選手が引退すると、新しい選手を1名登録（ドラフト）できます。"
                  ].map((text, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-[#1e293b]/50 border border-[#334155] rounded-xl text-xs text-slate-300 leading-relaxed">
                      <span className="text-emerald-500 font-black">●</span>
                      {text}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'traits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {Object.entries(TRAIT_DATA).map(([key, data]) => (
                <div key={key} className="p-4 bg-[#1e293b]/50 border border-[#334155] rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black text-white uppercase tracking-wider ${data.color}`}>
                      {data.name}
                    </span>
                    <Star className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{data.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {ITEM_TYPES.map(item => (
                <div key={item.type} className="p-4 bg-[#1e293b]/50 border border-[#334155] rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0f172a] border border-[#334155] rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-black text-white uppercase tracking-tighter">{item.name}</h4>
                      {item.type === 'owl_talisman' && (
                        <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-black uppercase">Detail</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {item.type === 'owl_talisman' 
                        ? "成長期（ピーク前）の能力上昇量を1.5倍に強化します。ピークを過ぎた衰退期の選手には効果がありません。若手中心のチーム作りに非常に有効です。" 
                        : item.desc}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Package className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Tips</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    選手をタップして詳細画面を開くと、任意のアイテムを選択して装備・解除ができます。
                    「Quick Equip」ボタンで、その選手に最適なアイテムを1タップで装備することも可能です。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-[#020617] border-t border-[#334155] flex justify-center shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            了解しました
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="bg-[#020617] p-4 rounded border border-[#334155]/30 group hover:border-[#3b82f6]/30 transition-colors">
      <p className="text-[9px] text-[#64748b] font-black uppercase mb-2 tracking-widest">{label}</p>
      <p className={`font-mono text-3xl font-black ${color} tracking-tighter leading-none`}>
        {value}
      </p>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean, onClick: () => void, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
        active 
          ? 'border-indigo-600 text-indigo-600' 
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function AwardBadge({ type, year, size = "sm", hideLabel = false }: { key?: any, type: any, year: number, size?: "sm" | "xs", hideLabel?: boolean }) {
  const config = {
    MVP: { icon: Trophy, color: "text-amber-400", bg: "bg-amber-400/20", border: "border-amber-400/30", label: "MVP" },
    BEST_BATTER: { icon: Zap, color: "text-blue-400", bg: "bg-blue-400/20", border: "border-blue-400/30", label: "BT" },
    ROOKIE_OF_THE_YEAR: { icon: Star, color: "text-purple-400", bg: "bg-purple-400/20", border: "border-purple-400/30", label: "RY" },
    HR_KING: { icon: Award, color: "text-rose-400", bg: "bg-rose-400/20", border: "border-rose-400/30", label: "HR" },
    SB_KING: { icon: Zap, color: "text-teal-400", bg: "bg-teal-400/20", border: "border-teal-400/30", label: "SB" },
    MOST_HITS: { icon: Hash, color: "text-emerald-400", bg: "bg-emerald-400/20", border: "border-emerald-400/30", label: "HT" }
  }[type as 'MVP' | 'BEST_BATTER' | 'ROOKIE_OF_THE_YEAR' | 'HR_KING' | 'SB_KING' | 'MOST_HITS'] || { icon: Award, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", label: "AW" };

  const Icon = config.icon;

  if (size === "xs") {
    return (
      <div className={`p-0.5 rounded ${config.bg} ${config.border} border`} title={`${config.label} ${year}`}>
        <Icon className={`w-2 h-2 ${config.color}`} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${config.bg} ${config.border} shrink-0`} title={`Year ${year}`}>
      <Icon className={`w-2.5 h-2.5 ${config.color}`} />
      {!hideLabel && <span className={`text-[7px] font-black uppercase tracking-tighter ${config.color}`}>{config.label}</span>}
    </div>
  );
}

function HistorySeasonCard({ result, userTeamId }: { key?: any, result: SeasonResult, userTeamId: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const winner = result.standings.find(s => s.rank === 1);

  return (
    <motion.div 
      layout
      className="bg-[#1e293b]/30 border border-[#334155] rounded-lg backdrop-blur-sm overflow-hidden transition-all hover:border-[#3b82f6]/30"
    >
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded transition-colors ${isExpanded ? 'bg-[#3b82f6] text-white' : 'bg-[#3b82f6]/10 text-[#3b82f6]'}`}>
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-sm font-black uppercase tracking-widest">{result.year}年度 レポート</h3>
            <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-widest">
              優勝: <span className="text-amber-500">{winner?.teamName}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-800/50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-[8px] text-slate-500 font-bold px-1">DETAILS</p>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#334155]/30 overflow-hidden"
          >
            <div className="p-4 pt-2">
              {/* Awards Section */}
              {result.awards && result.awards.length > 0 && (
                <div className="mb-4 bg-black/40 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 underline decoration-amber-500/30 underline-offset-4">
                    <Star className="w-2.5 h-2.5" />
                    シーズン個人表彰
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {result.awards.map((a, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-900/50 p-2 rounded border border-slate-800/50">
                        <div className="flex items-center gap-3">
                           <AwardBadge type={a.type} year={result.year} size="sm" />
                           <div className="max-w-[120px]">
                             <p className="text-white text-[12px] font-black italic tracking-tight truncate">{a.playerName}</p>
                             <p className="text-[#64748b] text-[9px] font-bold uppercase tracking-tighter opacity-70 truncate">{a.teamName}</p>
                           </div>
                        </div>
                        {a.statValue && (
                          <div className="bg-[#3b82f6]/10 px-2 py-1 rounded">
                            <p className="text-[#3b82f6] text-[10px] font-black font-mono">{a.statValue}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Standings List */}
              <div className="bg-slate-900/30 rounded-lg p-3">
                <p className="text-[9px] text-[#64748b] font-black uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                  <Bookmark className="w-2.5 h-2.5" />
                  最終順位
                </p>
                <div className="space-y-1">
                  {result.standings.map((s) => (
                    <HistoryTeamRow key={s.teamId} s={s} userTeamId={userTeamId} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HistoryTeamRow({ s, userTeamId }: { key?: any, s: any, userTeamId: string }) {
  const [showFormula, setShowFormula] = useState(false);

  return (
    <div 
      onClick={() => setShowFormula(!showFormula)}
      className={`flex items-center justify-between py-2 px-3 rounded-md transition-all cursor-pointer ${
        s.teamId === userTeamId 
          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
          : 'hover:bg-white/5 border border-transparent'
      } text-[11px]`}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className={`w-5 text-center font-black italic text-lg leading-none ${s.rank === 1 ? 'text-amber-500' : 'text-slate-500/30'}`}>
            {s.rank}
          </span>
          {s.prevRank !== undefined && (
            <span className={`text-[8px] font-black tracking-tighter leading-none mt-0.5 ${
              s.prevRank > s.rank ? 'text-emerald-500' : 
              s.prevRank < s.rank ? 'text-rose-500' : 
              'text-slate-600'
            }`}>
              {s.prevRank > s.rank ? `↑${s.prevRank - s.rank}` : 
               s.prevRank < s.rank ? `↓${s.rank - s.prevRank}` : 
               'ー'}
            </span>
          )}
        </div>
        <div>
          <span className={`truncate block max-w-[120px] font-bold tracking-tight ${s.teamId === userTeamId ? 'text-blue-400' : 'text-slate-200'}`}>
            {s.teamName}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {!showFormula ? (
          <div className="flex items-center gap-3 animate-in fade-in duration-300">
            <div className="text-right">
              <p className="font-mono text-xs text-slate-400 font-bold">.{Math.round(s.avg * 1000).toString().padStart(3, '0')}</p>
              <p className="text-[7px] text-slate-600 font-black uppercase tracking-tighter">AVG</p>
            </div>
            <div className="text-right bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              <p className="font-mono text-sm text-blue-400 font-black tracking-tighter">{(s.score || s.avg).toFixed(1)}</p>
              <p className="text-[7px] text-blue-500/50 font-black uppercase tracking-tighter">SCORE</p>
            </div>
          </div>
        ) : (
          <div className="text-right bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 animate-in zoom-in slide-in-from-right-2 duration-200">
             <div className="flex items-center gap-1.5 justify-end">
               <span className="text-[9px] font-mono text-amber-500 font-bold">{Math.round(s.avg * 1000)}</span>
               <span className="text-[8px] text-amber-600/50">+</span>
               <div className="flex items-center">
                 <span className="text-[9px] font-mono text-rose-400 font-bold">{s.totalHR || 0}</span>
                 <span className="text-[7px] text-amber-600/50 ml-0.5">×0.5</span>
               </div>
               <span className="text-[8px] text-amber-600/50">+</span>
               <div className="flex items-center">
                 <span className="text-[9px] font-mono text-teal-400 font-bold">{s.totalSB || 0}</span>
                 <span className="text-[7px] text-amber-600/50 ml-0.5">×0.5</span>
               </div>
               <span className="text-[8px] text-amber-600/50">+</span>
               <div className="flex items-center">
                 <span className="text-[9px] font-mono text-emerald-400 font-bold">{s.totalHits || 0}</span>
                 <span className="text-[7px] text-amber-600/50 ml-0.5">×0.1</span>
               </div>
             </div>
             <p className="text-[6px] text-amber-600 font-black uppercase tracking-tighter text-right">CALCULATION BASIS (AVG*1000 + HR*0.5 + SB*0.5 + HIT*0.1)</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSuccessTrend({ history, teamId }: { history: SeasonResult[], teamId: string }) {
  const data = useMemo(() => {
    return [...history].reverse().map(h => {
      const standing = h.standings.find(s => s.teamId === teamId);
      return {
        year: `Y${h.year}`,
        score: standing?.score || 0,
        hr: standing?.totalHR || 0,
        sb: standing?.totalSB || 0,
        rank: standing?.rank || 12
      };
    });
  }, [history, teamId]);

  if (history.length === 0) return null;

  return (
    <div className="bg-[#1e293b]/30 border border-[#334155] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Team Performance Trend</h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[250px]">
          <p className="text-[10px] text-[#64748b] font-black uppercase tracking-widest mb-4">Score & Rank over Seasons</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} />
              <YAxis yAxisId="right" orientation="right" reversed domain={[1, 12]} axisLine={false} tickLine={false} tick={{ fill: '#fbbf24', fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line yAxisId="left" type="monotone" dataKey="score" stroke="#3b82f6" name="Total Score" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="rank" stroke="#fbbf24" name="League Rank" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-[250px]">
          <p className="text-[10px] text-[#64748b] font-black uppercase tracking-widest mb-4">HR & SB Contribution</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="hr" name="Home Runs" fill="#f43f5e" stackId="a" />
              <Bar dataKey="sb" name="Stolen Bases" fill="#06b6d4" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PlayerPerformanceHeatmap({ players }: { players: Player[] }) {
  const metrics = [
    { key: 'avg', label: 'Hit Rate', color: 'blue' },
    { key: 'hr', label: 'Power', color: 'rose' },
    { key: 'sb', label: 'Speed', color: 'teal' },
    { key: 'exp', label: 'Experience', color: 'amber' }
  ];

  const processedData = useMemo(() => {
    return players.map(p => {
      const avg = p.currentSeasonAtBats > 0 ? p.currentSeasonHits / p.currentSeasonAtBats : 0;
      return {
        id: p.id,
        name: p.name,
        avg,
        hr: p.currentSeasonHomeRuns || 0,
        sb: p.currentSeasonStolenBases || 0,
        exp: p.totalMonths,
        isStarter: p.isStarter
      };
    }).sort((a, b) => (b.isStarter ? 1 : 0) - (a.isStarter ? 1 : 0) || b.avg - a.avg);
  }, [players]);

  const maxValues = useMemo(() => {
    return {
      avg: Math.max(...processedData.map(d => d.avg), 0.001),
      hr: Math.max(...processedData.map(d => d.hr), 0.001),
      sb: Math.max(...processedData.map(d => d.sb), 0.001),
      exp: Math.max(...processedData.map(d => d.exp), 0.001),
    };
  }, [processedData]);

  const getIntensity = (val: number, max: number) => {
    const ratio = val / max;
    if (ratio >= 0.9) return 'bg-opacity-100';
    if (ratio >= 0.7) return 'bg-opacity-80';
    if (ratio >= 0.5) return 'bg-opacity-60';
    if (ratio >= 0.3) return 'bg-opacity-40';
    return 'bg-opacity-20';
  };

  const getColorClass = (metric: string, val: number, max: number) => {
    const intensity = getIntensity(val, max);
    const colors: Record<string, string> = {
      avg: `bg-blue-500 ${intensity}`,
      hr: `bg-rose-500 ${intensity}`,
      sb: `bg-teal-500 ${intensity}`,
      exp: `bg-amber-500 ${intensity}`
    };
    return colors[metric];
  };

  return (
    <div className="bg-[#1e293b]/30 border border-[#334155] rounded-xl p-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <Hash className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Player Performance Heatmap</h3>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[150px_repeat(4,1fr)] gap-px border-b border-[#334155] pb-2 mb-2">
            <div className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Player</div>
            {metrics.map(m => (
              <div key={m.key} className="text-center">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{m.label}</p>
                <p className="text-[7px] text-[#64748b] font-bold uppercase mt-1">Relative Load</p>
              </div>
            ))}
          </div>

          <div className="space-y-px">
            {processedData.map(p => (
              <div key={p.id} className="grid grid-cols-[150px_repeat(4,1fr)] gap-px group">
                <div className="flex items-center gap-2 py-2 pr-4 transition-colors group-hover:bg-[#334155]/20 rounded-l">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.isStarter ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`}></div>
                  <span className={`text-xs font-bold truncate ${p.isStarter ? 'text-white' : 'text-slate-500'}`}>{p.name}</span>
                </div>
                
                <div className="flex items-center justify-center p-0.5">
                  <div className={`w-full h-8 rounded flex items-center justify-center border border-white/5 transition-all ${getColorClass('avg', p.avg, maxValues.avg)}`}>
                    <span className="text-[10px] font-mono font-black text-white drop-shadow-sm">.{Math.round(p.avg * 1000)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center p-0.5">
                  <div className={`w-full h-8 rounded flex items-center justify-center border border-white/5 transition-all ${getColorClass('hr', p.hr, maxValues.hr)}`}>
                    <span className="text-[10px] font-mono font-black text-white drop-shadow-sm">{p.hr}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center p-0.5">
                  <div className={`w-full h-8 rounded flex items-center justify-center border border-white/5 transition-all ${getColorClass('sb', p.sb, maxValues.sb)}`}>
                    <span className="text-[10px] font-mono font-black text-white drop-shadow-sm">{p.sb}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center p-0.5">
                  <div className={`w-full h-8 rounded flex items-center justify-center border border-white/5 transition-all ${getColorClass('exp', p.exp, maxValues.exp)}`}>
                    <span className="text-[10px] font-mono font-black text-white drop-shadow-sm">{Math.floor(p.exp / 12)}Y</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[9px] text-[#64748b] font-bold italic">Intensity reflects performance relative to other team members.</p>
        <div className="flex gap-4">
           {metrics.map(m => (
             <div key={m.key} className="flex items-center gap-1.5">
               <div className={`w-2 h-2 rounded-full bg-${m.color}-500`}></div>
               <span className="text-[8px] font-black text-[#64748b] uppercase tracking-tighter">{m.label}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function TeamSelectionScreen({ onSelect }: { onSelect: (month: number, day: number) => void }) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  
  const months = [
    { num: 1, name: "Aquarius", jpName: "1月" },
    { num: 2, name: "Pisces", jpName: "2月" },
    { num: 3, name: "Aries", jpName: "3月" },
    { num: 4, name: "Taurus", jpName: "4月" },
    { num: 5, name: "Gemini", jpName: "5月" },
    { num: 6, name: "Cancer", jpName: "6月" },
    { num: 7, name: "Leo", jpName: "7月" },
    { num: 8, name: "Virgo", jpName: "8月" },
    { num: 9, name: "Libra", jpName: "9月" },
    { num: 10, name: "Scorpio", jpName: "10月" },
    { num: 11, name: "Sagittarius", jpName: "11月" },
    { num: 12, name: "Capricorn", jpName: "12月" },
  ];

  // Number of days in each month
  const getDaysInMonth = (month: number) => {
    if (month === 2) return 29; // Allow up to 29 for simplicity
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
  };

  const currentZodiac = selectedMonth ? ZODIAC_TEAMS[getZodiacIndex(selectedMonth, 1)] : ""; // Simplified display

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-[#1e293b] border border-[#334155] rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        {!selectedMonth ? (
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20">
                <Star className="w-10 h-10 text-blue-500 animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tighter italic">Batting League</h2>
            <p className="text-slate-400 text-center mb-8 text-sm">あなたの誕生月を選択してください。</p>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {months.map((m) => (
                <button
                  key={m.num}
                  onClick={() => setSelectedMonth(m.num)}
                  className="flex flex-col items-center gap-1 p-4 rounded-xl bg-[#0f172a]/50 border border-[#334155] hover:border-blue-500 hover:bg-blue-500/10 transition-all group"
                >
                  <div className="text-2xl font-black text-blue-500 group-hover:scale-110 transition-transform">{m.num}</div>
                  <div className="text-[10px] font-black text-white uppercase tracking-widest opacity-60">月</div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <button 
              onClick={() => setSelectedMonth(null)}
              className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-[#0f172a] border border-[#334155] flex items-center justify-center group-hover:border-blue-500">
                <span className="text-lg">←</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{selectedMonth}月を選択中</span>
            </button>

            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">生まれた日を選択</h2>
            
            <div className="grid grid-cols-6 md:grid-cols-8 gap-2 max-h-[300px] overflow-y-auto p-2 scrollbar-none">
              {Array.from({ length: getDaysInMonth(selectedMonth) }).map((_, i) => {
                const day = i + 1;
                const zid = getZodiacIndex(selectedMonth, day);
                const zName = ZODIAC_TEAMS[zid];
                
                return (
                  <button
                    key={day}
                    onClick={() => onSelect(selectedMonth, day)}
                    className="aspect-square flex flex-col items-center justify-center rounded-lg bg-[#0f172a]/50 border border-[#334155] hover:border-blue-500 hover:bg-blue-500/10 transition-all relative overflow-hidden group"
                  >
                    <span className="text-lg font-black text-white group-hover:text-blue-400">{day}</span>
                    <span className="text-[6px] font-bold text-slate-500 group-hover:text-blue-400/60 uppercase">{zName.slice(0, 4)}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, teams, difficulty, onRenameTeam, onSetDifficulty, onResetGame }: { 
  isOpen: boolean, 
  onClose: () => void, 
  teams: Team[], 
  difficulty?: 'normal' | 'hard',
  onRenameTeam: (id: string, name: string) => void,
  onSetDifficulty: (diff: 'normal' | 'hard') => void,
  onResetGame: () => void
}) {
  const [activeTab, setActiveTab] = useState<'names' | 'difficulty' | 'reset'>('names');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmReset(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-[#334155] bg-[#0f172a]/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Game Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#334155] rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex border-b border-[#334155]">
          <button 
            onClick={() => setActiveTab('names')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'names' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-500 hover:text-slate-300'}`}
          >
            チーム名変更
          </button>
          <button 
            onClick={() => setActiveTab('difficulty')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'difficulty' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5' : 'text-slate-500 hover:text-slate-300'}`}
          >
            難易度
          </button>
          <button 
            onClick={() => setActiveTab('reset')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reset' ? 'text-rose-400 border-b-2 border-rose-400 bg-rose-400/5' : 'text-slate-500 hover:text-slate-300'}`}
          >
            リセット
          </button>
        </div>

        <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
          {activeTab === 'names' && (
            <div className="space-y-4">
              {teams.map(team => (
                <div key={team.id} className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    <span>{team.isUserTeam ? "マイチーム" : "他チーム"}</span>
                    {team.isUserTeam && <span className="text-blue-400">YOU</span>}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      defaultValue={team.name}
                      onBlur={(e) => {
                        if (e.target.value !== team.name) onRenameTeam(team.id, e.target.value);
                      }}
                      className="flex-1 bg-[#0f172a] border border-[#334155] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'difficulty' && (
            <div className="space-y-6">
              <div className="bg-[#0f172a]/30 p-4 rounded-xl border border-[#334155]">
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">難易度を選択</h4>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => onSetDifficulty('normal')}
                    className={`p-4 rounded-lg border flex flex-col gap-1 text-left transition-all ${difficulty === 'normal' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-[#0f172a] border-[#334155] text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm uppercase tracking-widest">ノーマル</span>
                      {difficulty === 'normal' && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <p className="text-[10px] opacity-70">標準的な難易度です。他チームは自動的にアイテムを装備しますが、戦略的な再配置は行いません。</p>
                  </button>

                  <button
                    onClick={() => onSetDifficulty('hard')}
                    className={`p-4 rounded-lg border flex flex-col gap-1 text-left transition-all ${difficulty === 'hard' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-[#0f172a] border-[#334155] text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm uppercase tracking-widest">ハード</span>
                      {difficulty === 'hard' && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <p className="text-[10px] opacity-70">手強い難易度です。他チームはアイテムを最大限に活用し、若手の育成や最強打線の構築を積極的に行います。</p>
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-[9px] text-amber-200/60 leading-relaxed italic">
                  ※難易度はいつでも変更可能です。変更は次回の「試合開始」から他チームの行動に反映されます。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="py-4 text-center">
              {!confirmReset ? (
                <>
                  <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <h4 className="text-white font-bold mb-2">ゲームをリセット</h4>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed px-4">
                    全シーズンの記録、殿堂入り選手、現在の全チーム状況が完全に消去され、シーズン0からやり直しになります。この操作は取り消せません。
                  </p>
                  <button 
                    onClick={() => setConfirmReset(true)}
                    className="w-[80%] mx-auto bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20"
                  >
                    データをリセットの準備
                  </button>
                </>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/40 animate-pulse">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <h4 className="text-white font-bold mb-2 text-rose-500">本当にリセットしますか？</h4>
                  <p className="text-xs text-slate-300 font-bold mb-6 px-4">
                    「リセット実行」をタップすると即座に全データが削除されます。
                  </p>
                  <div className="flex flex-col gap-3 px-4">
                    <button 
                      onClick={onResetGame}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-xl text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-rose-900/40 ring-4 ring-rose-600/20"
                    >
                      リセット実行
                    </button>
                    <button 
                      onClick={() => setConfirmReset(false)}
                      className="w-full bg-[#334155] hover:bg-[#475569] text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-[#0f172a]/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-[#334155] hover:bg-[#475569] text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
          >
            完了
          </button>
        </div>
      </motion.div>
    </div>
  );
}
