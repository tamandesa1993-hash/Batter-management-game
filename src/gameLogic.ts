/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  HUMAN_FIRST_NAMES, 
  HUMAN_LAST_NAMES,
  WESTERN_FIRST_NAMES,
  WESTERN_LAST_NAMES,
  WORD_KATAKANA,
  WORD_ITEMS,
  WORD_ANIMALS,
  WORD_ONOMATOPOEIA,
  WORD_VEGETABLES,
  WORD_HISTORY_PARTS,
  WORD_ACTOR_PARTS,
  WORD_MAGIC,
  WORD_ITEMS_EN,
  WORD_VEGETABLES_EN,
  WORD_ANIMALS_EN,
  MIDDLE_NAMES_ROMAN,
  MIDDLE_NAMES_KANJI,
  MIDDLE_NAMES_KANA,
  TEAM_TOTAL_PLAYERS,
  MAX_CAREER_MONTHS,
  HOF_MIN_MONTHS_FOR_RANKING,
  HOF_MIN_PEAK_AVG,
  HOF_MIN_CAREER_AVG,
  HOF_MIN_AWARDS,
  ITEM_TYPES
} from './constants';
import { Player, Team, Item, ItemType } from './types';

export const generatePlayerName = () => {
  const otherCategories = [
    WORD_KATAKANA,
    WORD_ITEMS,
    WORD_ANIMALS,
    WORD_ONOMATOPOEIA,
    WORD_VEGETABLES,
    WORD_HISTORY_PARTS,
    WORD_ACTOR_PARTS,
    WORD_MAGIC,
    WORD_ITEMS_EN,
    WORD_VEGETABLES_EN,
    WORD_ANIMALS_EN
  ];

  const middleCategories = [
    MIDDLE_NAMES_ROMAN,
    MIDDLE_NAMES_KANJI,
    MIDDLE_NAMES_KANA
  ];

  const getRandomFrom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

  const spiceUpKatakana = (word: string): string => {
    // Only spice up if it's Katakana (including existing markers)
    // Range includes: ァ-ヶ, ー, ッ, ・
    if (!/^[ァ-ヴーッ・]+$/.test(word)) return word;
    if (word.length < 2) return word;

    let result = word[0];
    let injectionCount = 0;
    const maxInjections = Math.max(1, Math.floor(word.length / 2));

    for (let i = 1; i < word.length; i++) {
      result += word[i];
      
      // Don't inject after existing markers OR if the next character is already a marker
      // OR if the next character is a small Katakana (ァ,ィ,ゥ,ェ,ォ,ッ,ャ,ュ,ョ)
      if (word[i] === 'ー' || word[i] === 'ッ') continue;
      if (i + 1 < word.length && /^[ァィゥェォッャュョー]$/.test(word[i + 1])) continue;

      if (injectionCount < maxInjections && Math.random() < 0.2) {
        const type = Math.random() < 0.7 ? 'ー' : 'ッ'; 
        // Ensure we don't put ッ at the very end
        if (type === 'ッ' && i === word.length - 1) {
          if (Math.random() < 0.5) {
            result += 'ー';
            injectionCount++;
          }
        } else {
          result += type;
          injectionCount++;
        }
      }
    }
    return result;
  };

  const getRandomOtherWord = () => {
    const category = getRandomFrom(otherCategories);
    const word = getRandomFrom(category);
    return spiceUpKatakana(word);
  };

  // Decide if there's a middle name (15% chance)
  const hasMiddle = Math.random() < 0.15;
  
  let last = "";
  let first = "";
  let middle = "";

  // Assign Last Name: Pick from Human Last Names, Western Last Names or Other Categories
  const lastNameRoll = Math.random();
  if (lastNameRoll < 0.5) {
    last = spiceUpKatakana(getRandomFrom(HUMAN_LAST_NAMES));
  } else if (lastNameRoll < 0.75) {
    last = spiceUpKatakana(getRandomFrom(WESTERN_LAST_NAMES));
  } else {
    last = getRandomOtherWord();
  }

  // Assign First Name: Pick from Human First Names, Western First Names or Other Categories
  const firstNameRoll = Math.random();
  if (firstNameRoll < 0.5) {
    first = spiceUpKatakana(getRandomFrom(HUMAN_FIRST_NAMES));
  } else if (firstNameRoll < 0.75) {
    first = spiceUpKatakana(getRandomFrom(WESTERN_FIRST_NAMES));
  } else {
    first = getRandomOtherWord();
  }

  // Safety: If both are non-human, ensure at least one is "readable" as a name if possible
  // or just let it be. The requirement was to avoid First+First and Last+Last.
  
  // Assign Middle Name if needed
  if (hasMiddle) {
    // Requirements: Exactly 1 character. Kanji, Roman (Upper), Hiragana, or Katakana.
    const mCat = getRandomFrom(middleCategories);
    middle = getRandomFrom(mCat);
    return `${last}・${middle}・${first}`;
  }

  return `${last} ${first}`;
};

export const createPlayer = (teamId: string, name: string, startAgeMonths: number = 216, hasTraits: boolean = true): Player => {
  // Potential variation: Some players are born stars, some are average.
  // minBaseAvg is usually between 0.180 and 0.230
  // maxBaseAvg is usually between 0.270 and 0.380
  const minBaseAvg = 0.180 + Math.random() * 0.05;
  const maxBaseAvg = minBaseAvg + 0.10 + Math.random() * 0.10;

  // Growth Types
  const growthTypes: Player['growthType'][] = ['early', 'average', 'late'];
  const growthType = growthTypes[Math.floor(Math.random() * growthTypes.length)];
  
  // Peak Age (in months)
  let peakAgeMonths = 360; // Default 30 years
  if (growthType === 'early') {
    peakAgeMonths = 288 + Math.floor(Math.random() * 48); // 24-28 years
  } else if (growthType === 'late') {
    peakAgeMonths = 384 + Math.floor(Math.random() * 48); // 32-36 years
  } else {
    peakAgeMonths = 336 + Math.floor(Math.random() * 48); // 28-32 years
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    name,
    teamId,
    ageInMonths: startAgeMonths,
    totalMonths: 0,
    careerHits: 0,
    careerAtBats: 0,
    careerHomeRuns: 0,
    careerStolenBases: 0,
    currentSeasonHits: 0,
    currentSeasonAtBats: 0,
    currentSeasonHomeRuns: 0,
    currentSeasonStolenBases: 0,
    peakAvg: 0,
    isStarter: false,
    isActive: true,
    minBaseAvg,
    maxBaseAvg,
    seasonHistory: [],
    awards: [],
    fatigue: 0,
    growthType,
    peakAgeMonths,
    growthRate: 0.8 + Math.random() * 0.4, // 0.8 to 1.2
    traits: hasTraits ? generateTraits() : [],
    equippedItemIds: []
  };
};

const generateTraits = (): Player['traits'] => {
  const traits: Player['traits'] = [];
  const regularTraits: Player['traits'] = ['power', 'speed', 'minds_eye', 'skill', 'flexible', 'sleep', 'dual_wield'];
  
  // High Rarity: Protagonist (1/100)
  if (Math.random() < 0.01) {
    traits.push('protagonist');
  }

  // 45% chance for first trait, then repeat until 55% chance (fail) triggers
  const maxLen = traits.includes('protagonist') ? regularTraits.length + 1 : regularTraits.length;
  while (traits.length < maxLen) {
    if (Math.random() < 0.45) {
      const available = regularTraits.filter(t => !traits.includes(t));
      if (available.length > 0) {
        const selected = available[Math.floor(Math.random() * available.length)];
        traits.push(selected);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return traits;
};

export const generateInitialTeam = (id: string, name: string, isUser: boolean): Team => {
  const players: Player[] = [];
  for (let i = 0; i < TEAM_TOTAL_PLAYERS; i++) {
    // Stagger ages for initial teams
    const randomAgeStart = 18 * 12 + Math.floor(Math.random() * 10 * 12);
    const p = createPlayer(id, generatePlayerName(), randomAgeStart);
    // For initial players, their total months might be simulated based on age
    p.totalMonths = Math.max(0, randomAgeStart - 18 * 12); 
    players.push(p);
  }

  // Initial inventory: 5 of each item
  const inventory: Item[] = [];

  ITEM_TYPES.forEach(it => {
    for (let i = 0; i < 5; i++) {
      inventory.push({
        id: Math.random().toString(36).substring(2, 9),
        type: it.type,
        name: it.name,
        description: it.desc
      });
    }
  });

  return {
    id,
    name,
    isUserTeam: isUser,
    players,
    yearlyAvgs: [],
    inventory
  };
};

export const simulateMonthlyBatting = (player: Player, items: Item[] = []): { hits: number, atBats: number, homeRuns: number, stolenBases: number } => {
  // Monthly at-bats roughly 60-100
  const atBats = 60 + Math.floor(Math.random() * 40);
  
  // Fatigue Penalty (up to 35% reduction at 1.0 fatigue)
  const fatigueFactor = 1.0 - (Math.min(1, player.fatigue || 0) * 0.35);
  let fMin = player.minBaseAvg * fatigueFactor;
  let fMax = player.maxBaseAvg * fatigueFactor;

  // Item Effects
  items.forEach(item => {
    // Item Effect: Hawk Glasses (Batting Avg Up)
    if (item.type === 'hawk_glasses') {
      fMin += 0.015;
      fMax += 0.015;
    }

    // Item Effect: Monkey Bat (Batting Avg Up - Stronger)
    if (item.type === 'monkey_bat') {
      fMin += 0.025;
      fMax += 0.025;
    }
  });

  // Aging Decay (Simplified here, as growth/decline is handled in App state updates now)
  const effectiveMax = Math.max(fMin + 0.02, fMax);
  
  // Target average
  let baseAvg = (fMin + (Math.random() * (effectiveMax - fMin))) || 0.200;
  const randomSwing = (Math.random() - 0.5) * 0.10;
  
  // Trait Effect: Mind's Eye (Avg Up)
  if (player.traits?.includes('minds_eye')) {
    baseAvg += 0.015;
  }
  
  // Trait Effect: Skillful Hitting (Avg Up)
  if (player.traits?.includes('skill')) {
    baseAvg += 0.012;
  }
  
  // Trait Effect: Protagonist (Huge Avg Up - Combined effects of Mind's Eye + Skill)
  if (player.traits?.includes('protagonist')) {
    baseAvg += 0.027;
  }

  const targetAvg = Math.max(0.100, Math.min(0.480, baseAvg + randomSwing)) || 0.200;
  
  let hits = 0;
  let homeRuns = 0;
  let stolenBases = 0;

  // HR probability depends on player potential (maxBaseAvg as proxy for "talent")
  let hrChance = (player.maxBaseAvg / 10) + (Math.random() * 0.05);
  
  // Item Effects: HR
  items.forEach(item => {
    if (item.type === 'gorilla_bat') {
      hrChance *= 1.5;
    }
  });
  
  // Trait Effect: Strong Arm (HR Up)
  if (player.traits?.includes('power')) {
    hrChance *= 1.4;
  }
  
  // Trait Effect: Protagonist (HR Up)
  if (player.traits?.includes('protagonist')) {
    hrChance *= 1.4;
  }

  // Stolen base chance
  let sbChance = (Math.random() * 0.15);
  
  // Item Effects: SB
  items.forEach(item => {
    if (item.type === 'cheetah_shoes') {
      sbChance *= 1.8;
    }
  });
  
  // Trait Effect: Fast Feet (SB Up)
  if (player.traits?.includes('speed')) {
    sbChance *= 1.6;
  }
  
  // Trait Effect: Protagonist (SB Up)
  if (player.traits?.includes('protagonist')) {
    sbChance *= 1.6;
  }

  for (let i = 0; i < atBats; i++) {
    if (Math.random() < targetAvg) {
      hits++;
      // If it's a hit, check for HR
      if (Math.random() < hrChance) {
        homeRuns++;
      }
    }
  }

  // Stolen bases happen randomly throughout the month
  stolenBases = Math.floor(hits * sbChance);
  
  return { hits, atBats, homeRuns, stolenBases };
};

export const checkRetirement = (player: Player, month: number): { retires: boolean, reason?: string } => {
  const ageInYears = player.ageInMonths / 12;
  const seasonAvg = player.currentSeasonAtBats > 0 ? player.currentSeasonHits / player.currentSeasonAtBats : 0.250;
  
  // 月に関係なく引退が発生する：病気療養、不慮の怪我
  // Very low monthly chance
  let baselineRisk = 0.0003;
  if (ageInYears > 38) baselineRisk += 0.001;

  if (Math.random() < baselineRisk) {
    const reasons = ["病気療養", "不慮の怪我"];
    return { retires: true, reason: reasons[Math.floor(Math.random() * reasons.length)] };
  }

  // 12月の試合が終わった時に発生する
  if (month === 12) {
    // シーズン打率.250超なら「成績不振」「加齢による体力低下」では引退しない
    const isPerformanceProtected = seasonAvg > 0.250;

    // 1. 「成績不振」: 年齢に関係なく、シーズン平均打率が.200以下になった際に確率が高まる
    if (!isPerformanceProtected && player.currentSeasonAtBats > 50 && seasonAvg <= 0.200) {
      if (Math.random() < 0.25) {
        return { retires: true, reason: "成績不振" };
      }
    }

    // 2. 「加齢による体力の低下」: 30歳以上で、かつ打率が一定以下（.250以下）の場合に発生
    if (!isPerformanceProtected && ageInYears >= 30) {
      const ageRelatedRisk = 0.05 + Math.max(0, (ageInYears - 30) * 0.03);
      if (Math.random() < ageRelatedRisk) {
        return { retires: true, reason: "加齢による体力低下" };
      }
    }

    // 3. 40歳以上の高確率引退 (こちらは打率に関わらず発生する一身上の都合)
    if (ageInYears >= 40) {
      if (Math.random() < 0.35) {
        return { retires: true, reason: "一身上の都合" };
      }
    }

    // 4. その他（他競技への転向、一身上の都合）
    if (Math.random() < 0.005) {
      const reasons = ["他競技への転向", "一身上の都合"];
      return { retires: true, reason: reasons[Math.floor(Math.random() * reasons.length)] };
    }
  }
  
  return { retires: false };
};

export const getHOFInduction = (player: Player): { isInducted: boolean, reasons: string[] } => {
  const careerAvg = player.careerAtBats > 0 ? player.careerHits / player.careerAtBats : 0;
  const reasons: string[] = [];

  if (player.peakAvg >= HOF_MIN_PEAK_AVG) {
    reasons.push(`全盛期打率 .${Math.round(player.peakAvg * 1000).toString().padStart(3, '0')}`);
  }
  if (careerAvg >= HOF_MIN_CAREER_AVG && player.totalMonths >= HOF_MIN_MONTHS_FOR_RANKING) {
    reasons.push(`通算打率 .${Math.round(careerAvg * 1000).toString().padStart(3, '0')}`);
  }
  if (player.awards && player.awards.length >= HOF_MIN_AWARDS) {
    const titleCount = player.awards.length;
    reasons.push(`個人タイトル ${titleCount}回獲得`);
  }

  return {
    isInducted: reasons.length > 0,
    reasons
  };
};
