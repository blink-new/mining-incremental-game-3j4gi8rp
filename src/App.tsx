import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Progress } from './components/ui/progress'
import { Badge } from './components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { 
  Pickaxe, 
  TrendingUp, 
  Coins, 
  Mountain,
  Settings,
  Star,
  Timer,
  DollarSign,
  ArrowUpCircle,
  BookUser
} from 'lucide-react'
import Minigame from './components/Minigame'

// Game types
interface Resource {
  id: string
  name: string
  color: string
  value: number
  unlockDepth: number
  icon: string
  description: string
}

interface Equipment {
  id: string
  name: string
  type: 'pickaxe' | 'drill' | 'automation'
  power: number
  cost: number
  owned: number
  description: string
}

interface MoneyUpgrade {
  id: string
  name: string
  description: string
  cost: number
  effect: (upgrades: GameState['upgrades']) => GameState['upgrades']
  level: number
}

interface Skill {
  id: string
  name: string
  description: string
  maxLevel: number
  getEffect: (level: number) => string
  getCost: (level: number) => number
  dependencies?: string[]
}

interface GameState {
  // Player Level
  level: number
  xp: number
  xpToNextLevel: number
  skillPoints: number

  // Currency
  money: number

  // Resources
  coal: number
  iron: number
  gold: number
  diamond: number
  
  // Game progress
  depth: number
  totalMined: number
  clickPower: number
  autoMineRate: number
  
  // Equipment
  equipment: Equipment[]
  
  // Upgrades
  upgrades: {
    clickMultiplier: number
    autoMultiplier: number
    efficiencyBonus: number
    sellPriceMultiplier: number
    xpGainMultiplier: number
    rareResourceChance: number
  }
  moneyUpgrades: MoneyUpgrade[]
  skills: Record<string, number>
}

const RESOURCES: Resource[] = [
  { id: 'coal', name: 'Coal', color: '#2d3748', value: 1, unlockDepth: 0, icon: '⚫', description: 'Basic resource' },
  { id: 'iron', name: 'Iron', color: '#718096', value: 5, unlockDepth: 10, icon: '🔧', description: 'Common resource' },
  { id: 'gold', name: 'Gold', color: '#d69e2e', value: 25, unlockDepth: 25, icon: '✨', description: 'Valuable resource' },
  { id: 'diamond', name: 'Diamond', color: '#3182ce', value: 100, unlockDepth: 50, icon: '💎', description: 'Rare resource' },
]

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'basic_pickaxe',
    name: 'Iron Pickaxe',
    type: 'pickaxe',
    power: 1,
    cost: 50,
    owned: 0,
    description: '+1 mining power'
  },
  {
    id: 'steel_pickaxe',
    name: 'Steel Pickaxe',
    type: 'pickaxe',
    power: 5,
    cost: 200,
    owned: 0,
    description: '+5 mining power'
  },
  {
    id: 'auto_miner',
    name: 'Auto Miner',
    type: 'automation',
    power: 1,
    cost: 300,
    owned: 0,
    description: '+1 auto mining/sec'
  },
  {
    id: 'auto_drill',
    name: 'Auto Drill',
    type: 'automation',
    power: 5,
    cost: 1500,
    owned: 0,
    description: '+5 auto mining/sec'
  },
  {
    id: 'mega_miner',
    name: 'Mega Miner',
    type: 'automation',
    power: 25,
    cost: 7500,
    owned: 0,
    description: '+25 auto mining/sec'
  },
  {
    id: 'drill',
    name: 'Power Drill',
    type: 'drill',
    power: 10,
    cost: 1000,
    owned: 0,
    description: '+10 mining power'
  },
  {
    id: 'mega_drill',
    name: 'Mega Drill',
    type: 'drill',
    power: 50,
    cost: 5000,
    owned: 0,
    description: '+50 mining power'
  }
]

const INITIAL_MONEY_UPGRADES: MoneyUpgrade[] = [
  {
    id: 'click_power_1',
    name: 'Reinforced Clicks',
    description: 'Increase click power by 10%',
    cost: 100,
    effect: (u) => ({ ...u, clickMultiplier: u.clickMultiplier * 1.1 }),
    level: 0
  },
  {
    id: 'auto_speed_1',
    name: 'Faster Automation',
    description: 'Increase auto mining speed by 10%',
    cost: 250,
    effect: (u) => ({ ...u, autoMultiplier: u.autoMultiplier * 1.1 }),
    level: 0
  },
  {
    id: 'sell_bonus_1',
    name: 'Better Sales',
    description: 'Increase resource sell price by 5%',
    cost: 500,
    effect: (u) => ({ ...u, sellPriceMultiplier: u.sellPriceMultiplier * 1.05 }),
    level: 0
  }
]

const SKILL_TREE: Skill[] = [
  // Tier 1
  {
    id: 'click_power_boost',
    name: 'Click Power Boost',
    description: 'Permanently increase click power.',
    maxLevel: 10,
    getEffect: (level) => `+${level * 5}% click power`,
    getCost: (level) => level + 1,
  },
  {
    id: 'auto_mine_speed',
    name: 'Auto-Mine Speed',
    description: 'Permanently increase auto-mining speed.',
    maxLevel: 10,
    getEffect: (level) => `+${level * 5}% auto-mine speed`,
    getCost: (level) => level + 1,
  },

  // Tier 2
  {
    id: 'xp_gain',
    name: 'XP Gain',
    description: 'Permanently increase XP gain from all sources.',
    maxLevel: 5,
    getEffect: (level) => `+${level * 10}% XP gain`,
    getCost: (level) => level * 2 + 1,
    dependencies: ['click_power_boost', 'auto_mine_speed'],
  },
  {
    id: 'rare_resource_chance',
    name: 'Rare Resource Chance',
    description: 'Chance to find rare resources.',
    maxLevel: 5,
    getEffect: (level) => `+${level}% rare resource chance`,
    getCost: (level) => level * 2 + 2,
    dependencies: ['auto_mine_speed'],
  },

  // Tier 3
  {
    id: 'minigame_bonus',
    name: 'Minigame Bonus',
    description: 'Start minigame with a time bonus.',
    maxLevel: 3,
    getEffect: (level) => `+${level}s minigame time`,
    getCost: (level) => level * 3 + 2,
    dependencies: ['xp_gain'],
  },
];

function App() {
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    skillPoints: 0,
    money: 0,
    coal: 0,
    iron: 0,
    gold: 0,
    diamond: 0,
    depth: 0,
    totalMined: 0,
    clickPower: 1,
    autoMineRate: 0,
    equipment: INITIAL_EQUIPMENT,
    upgrades: {
      clickMultiplier: 1,
      autoMultiplier: 1,
      efficiencyBonus: 1,
      sellPriceMultiplier: 1,
      xpGainMultiplier: 1,
      rareResourceChance: 0
    },
    moneyUpgrades: INITIAL_MONEY_UPGRADES,
    skills: {},
  })

  const [miningAnimation, setMiningAnimation] = useState(false)
  const [minigameOpen, setMinigameOpen] = useState(false)
  const [lastDepthForMinigame, setLastDepthForMinigame] = useState(0)

  // Check for minigame trigger
  useEffect(() => {
    if (Math.floor(gameState.depth) > lastDepthForMinigame) {
      setLastDepthForMinigame(Math.floor(gameState.depth))
      if (Math.floor(gameState.depth) % 10 === 0 && gameState.depth > 0) {
        setMinigameOpen(true)
      }
    }
  }, [gameState.depth, lastDepthForMinigame])

  // Handle minigame result
  const handleMinigameClose = (result: 'win' | 'lose') => {
    setMinigameOpen(false)
    if (result === 'lose') {
      setGameState(prev => ({ ...prev, money: 0 }))
    } else if (result === 'win') {
      gainXp(50)
    }
  }

  // XP and leveling
  const gainXp = useCallback((amount: number) => {
    const xpGained = amount * gameState.upgrades.xpGainMultiplier
    setGameState(prev => {
      let newXp = prev.xp + xpGained
      let newLevel = prev.level
      let newXpToNextLevel = prev.xpToNextLevel
      let newSkillPoints = prev.skillPoints

      while (newXp >= newXpToNextLevel) {
        newXp -= newXpToNextLevel
        newLevel ++
        newXpToNextLevel = Math.floor(newXpToNextLevel * 1.5)
        newSkillPoints ++
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        xpToNextLevel: newXpToNextLevel,
        skillPoints: newSkillPoints,
      }
    })
  }, [gameState.upgrades.xpGainMultiplier])

  // Calculate current mining resource based on depth
  const getCurrentResource = useCallback(() => {
    const availableResources = RESOURCES.filter(r => gameState.depth >= r.unlockDepth)
    return availableResources[availableResources.length - 1] || RESOURCES[0]
  }, [gameState.depth])

  // Mine resources manually
  const mineResource = useCallback(() => {
    const resource = getCurrentResource()
    let power = gameState.clickPower * gameState.upgrades.clickMultiplier

    // Check for rare resource find
    if (Math.random() < gameState.upgrades.rareResourceChance / 100) {
      power *= 2; // Double power for rare find
    }
    
    gainXp(power)

    setGameState(prev => ({
      ...prev,
      [resource.id]: prev[resource.id as keyof GameState] as number + power,
      totalMined: prev.totalMined + power,
      depth: prev.depth + (power * 0.1) // Progress depth based on mining
    }))
    
    setMiningAnimation(true)
    setTimeout(() => setMiningAnimation(false), 200)
  }, [gameState.clickPower, gameState.upgrades.clickMultiplier, getCurrentResource, gameState.upgrades.rareResourceChance])

  // Auto mining effect
  useEffect(() => {
    if (gameState.autoMineRate === 0) return

    const interval = setInterval(() => {
      const resource = getCurrentResource()
      const power = gameState.autoMineRate * gameState.upgrades.autoMultiplier
      
      gainXp(power / 2) // Less XP for auto-mining

      setGameState(prev => ({
        ...prev,
        [resource.id]: prev[resource.id as keyof GameState] as number + power,
        totalMined: prev.totalMined + power,
        depth: prev.depth + (power * 0.05)
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState.autoMineRate, gameState.upgrades.autoMultiplier, getCurrentResource])

  // Sell resources
  const sellResource = useCallback((resourceId: string, amount: number) => {
    const resource = RESOURCES.find(r => r.id === resourceId)
    if (!resource || (gameState[resourceId as keyof GameState] as number) < amount) return

    const moneyGained = amount * resource.value * gameState.upgrades.sellPriceMultiplier

    gainXp(moneyGained / 10) // Gain XP from selling

    setGameState(prev => ({
      ...prev,
      [resourceId]: (prev[resourceId as keyof GameState] as number) - amount,
      money: prev.money + moneyGained
    }))
  }, [gameState])

  // Buy equipment
  const buyEquipment = useCallback((equipmentId: string) => {
    const equipment = gameState.equipment.find(e => e.id === equipmentId)
    if (!equipment) return

    const cost = equipment.cost * Math.pow(1.5, equipment.owned)

    if (gameState.money < cost) return

    // Deduct cost
    const newState = { ...gameState, money: gameState.money - cost }

    // Update equipment
    const updatedEquipment = newState.equipment.map(e => 
      e.id === equipmentId 
        ? { ...e, owned: e.owned + 1 }
        : e
    )

    // Calculate new stats
    const newClickPower = 1 + updatedEquipment
      .filter(e => e.type === 'pickaxe' || e.type === 'drill')
      .reduce((sum, e) => sum + (e.power * e.owned), 0)
    
    const newAutoMineRate = updatedEquipment
      .filter(e => e.type === 'automation')
      .reduce((sum, e) => sum + (e.power * e.owned), 0)

    setGameState({
      ...newState,
      equipment: updatedEquipment,
      clickPower: newClickPower,
      autoMineRate: newAutoMineRate
    })
  }, [gameState])

  // Buy money upgrade
  const buyMoneyUpgrade = useCallback((upgradeId: string) => {
    const upgrade = gameState.moneyUpgrades.find(u => u.id === upgradeId)
    if (!upgrade) return

    const cost = upgrade.cost * Math.pow(2, upgrade.level)
    if (gameState.money < cost) return

    setGameState(prev => ({
      ...prev,
      money: prev.money - cost,
      upgrades: upgrade.effect(prev.upgrades),
      moneyUpgrades: prev.moneyUpgrades.map(u => 
        u.id === upgradeId ? { ...u, level: u.level + 1 } : u
      )
    }))
  }, [gameState])

  // Spend skill point
  const spendSkillPoint = useCallback((skillId: string) => {
    const skill = SKILL_TREE.find(s => s.id === skillId)
    if (!skill || gameState.skillPoints <= 0) return

    const currentLevel = gameState.skills[skillId] || 0
    if (currentLevel >= skill.maxLevel) return

    const cost = skill.getCost(currentLevel)
    if (gameState.skillPoints < cost) return

    setGameState(prev => {
      const newSkills = { ...prev.skills, [skillId]: currentLevel + 1 }
      const newUpgrades = { ...prev.upgrades }

      // Apply skill effects
      if (skillId === 'click_power_boost') {
        newUpgrades.clickMultiplier = 1 + (newSkills[skillId] * 0.05)
      } else if (skillId === 'auto_mine_speed') {
        newUpgrades.autoMultiplier = 1 + (newSkills[skillId] * 0.05)
      } else if (skillId === 'xp_gain') {
        newUpgrades.xpGainMultiplier = 1 + (newSkills[skillId] * 0.1)
      } else if (skillId === 'rare_resource_chance') {
        newUpgrades.rareResourceChance = newSkills[skillId]
      }

      return {
        ...prev,
        skillPoints: prev.skillPoints - cost,
        skills: newSkills,
        upgrades: newUpgrades,
      }
    })
  }, [gameState])

  // Calculate total resource value
  const getTotalValue = useCallback(() => {
    return gameState.coal + 
           gameState.iron * 5 + 
           gameState.gold * 25 + 
           gameState.diamond * 100
  }, [gameState.coal, gameState.iron, gameState.gold, gameState.diamond])

  const currentResource = getCurrentResource()
  const totalValue = getTotalValue()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Minigame 
        open={minigameOpen} 
        onClose={handleMinigameClose} 
        depth={gameState.depth} 
      />

      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mountain className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Deep Mine Empire</h1>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-white border-purple-400">
                <BookUser className="h-4 w-4 mr-1" />
                Level: {gameState.level} ({gameState.skillPoints} SP)
              </Badge>
              <Badge variant="outline" className="text-white border-yellow-400">
                <DollarSign className="h-4 w-4 mr-1" />
                Money: ${gameState.money.toLocaleString()}
              </Badge>
              <Badge variant="outline" className="text-white border-blue-400">
                <Star className="h-4 w-4 mr-1" />
                Depth: {Math.floor(gameState.depth)}m
              </Badge>
              <Badge variant="outline" className="text-white border-green-400">
                <Coins className="h-4 w-4 mr-1" />
                Value: {totalValue.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mining Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Mining */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Pickaxe className="h-5 w-5 text-blue-400" />
                  Mining {currentResource.name}
                  <span className="text-xl">{currentResource.icon}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Button
                    size="lg"
                    onClick={mineResource}
                    className={`w-48 h-48 text-6xl rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 ${
                      miningAnimation ? 'scale-95 bg-yellow-500' : ''
                    }`}
                  >
                    {currentResource.icon}
                  </Button>
                  <p className="text-slate-300 mt-4">
                    Click to mine! Power: {gameState.clickPower}
                  </p>
                  {gameState.autoMineRate > 0 && (
                    <p className="text-green-400 text-sm flex items-center justify-center gap-1">
                      <Timer className="h-4 w-4" />
                      Auto-mining: {gameState.autoMineRate}/sec
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">XP Progress</p>
                    <Progress value={(gameState.xp / gameState.xpToNextLevel) * 100} className="h-2" />
                    <p className="text-xs text-slate-500">
                      {Math.floor(gameState.xp)} / {gameState.xpToNextLevel} XP
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Depth Progress</p>
                    <Progress value={(gameState.depth % 10) * 10} className="h-2" />
                    <p className="text-xs text-slate-500">
                      Next resource unlock at {Math.ceil(gameState.depth / 10) * 10}m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {RESOURCES.map(resource => {
                    const amount = gameState[resource.id as keyof GameState] as number
                    const isUnlocked = gameState.depth >= resource.unlockDepth
                    
                    return (
                      <div 
                        key={resource.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isUnlocked 
                            ? 'bg-slate-700/50 border-slate-600' 
                            : 'bg-slate-800/30 border-slate-700 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{resource.icon}</span>
                          <div>
                            <p className="text-white font-medium">{resource.name}</p>
                            <p className="text-xs text-slate-400">
                              {isUnlocked ? `Value: ${resource.value}` : `Unlock at ${resource.unlockDepth}m`}
                            </p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {amount.toLocaleString()}
                        </p>
                        {isUnlocked && amount > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full mt-2 text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
                            onClick={() => sellResource(resource.id, amount)}
                          >
                            Sell All
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shop & Equipment */}
          <div className="space-y-6">
            <Tabs defaultValue="equipment" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
                <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
              </TabsList>
              <TabsContent value="equipment">
                <Card className="bg-slate-800/50 border-slate-700 mt-2">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="h-5 w-5 text-green-400" />
                      Equipment Shop
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gameState.equipment.map(equipment => {
                      const cost = equipment.cost * Math.pow(1.5, equipment.owned)
                      const canAfford = gameState.money >= cost
                      
                      return (
                        <div 
                          key={equipment.id}
                          className="p-3 rounded-lg bg-slate-700/30 border border-slate-600"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-white font-medium">{equipment.name}</p>
                              <p className="text-xs text-slate-400">{equipment.description}</p>
                              {equipment.owned > 0 && (
                                <Badge variant="secondary" className="mt-1">
                                  Owned: {equipment.owned}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-300">
                                {equipment.type === 'automation' ? `+${equipment.power}/sec` : `+${equipment.power}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-yellow-400">
                              Cost: ${cost.toLocaleString()}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => buyEquipment(equipment.id)}
                              disabled={!canAfford}
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              Buy
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="upgrades">
                <Card className="bg-slate-800/50 border-slate-700 mt-2">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ArrowUpCircle className="h-5 w-5 text-purple-400" />
                      Money Upgrades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gameState.moneyUpgrades.map(upgrade => {
                      const cost = upgrade.cost * Math.pow(2, upgrade.level)
                      const canAfford = gameState.money >= cost

                      return (
                        <div 
                          key={upgrade.id}
                          className="p-3 rounded-lg bg-slate-700/30 border border-slate-600"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-white font-medium">{upgrade.name}</p>
                              <p className="text-xs text-slate-400">{upgrade.description}</p>
                              {upgrade.level > 0 && (
                                <Badge variant="secondary" className="mt-1">
                                  Level: {upgrade.level}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-yellow-400">
                              Cost: ${cost.toLocaleString()}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => buyMoneyUpgrade(upgrade.id)}
                              disabled={!canAfford}
                              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                            >
                              Upgrade
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="skills">
                <Card className="bg-slate-800/50 border-slate-700 mt-2">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BookUser className="h-5 w-5 text-yellow-400" />
                      Skill Tree
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {SKILL_TREE.map(skill => {
                      const level = gameState.skills[skill.id] || 0
                      const cost = skill.getCost(level)
                      const dependenciesMet = !skill.dependencies || skill.dependencies.every(dep => (gameState.skills[dep] || 0) > 0)
                      const canAfford = gameState.skillPoints >= cost && level < skill.maxLevel && dependenciesMet

                      return (
                        <div key={skill.id} className="relative">
                          <div 
                            className={`p-3 rounded-lg bg-slate-700/30 border border-slate-600 ${
                              !dependenciesMet ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-white font-medium">{skill.name}</p>
                                <p className="text-xs text-slate-400">{skill.description}</p>
                                <p className="text-xs text-green-400">{skill.getEffect(level)}</p>
                                {level > 0 && (
                                  <Badge variant="secondary" className="mt-1">
                                    Level: {level} / {skill.maxLevel}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-yellow-400">
                                Cost: {cost} SP
                              </p>
                              <Button
                                size="sm"
                                onClick={() => spendSkillPoint(skill.id)}
                                disabled={!canAfford}
                                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                              >
                                Upgrade
                              </Button>
                            </div>
                          </div>
                          {skill.dependencies?.map(dep => {
                            const depSkill = SKILL_TREE.find(s => s.id === dep)
                            if (!depSkill) return null
                            return (
                              <div key={`${skill.id}-${dep}`} className="absolute top-1/2 left-[-2rem] w-4 h-px bg-slate-500" />
                            )
                          })}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Stats */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Click Power:</span>
                  <span className="text-white font-medium">{gameState.clickPower}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Auto Mining:</span>
                  <span className="text-white font-medium">{gameState.autoMineRate}/sec</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Depth:</span>
                  <span className="text-white font-medium">{Math.floor(gameState.depth)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Mined:</span>
                  <span className="text-white font-medium">{gameState.totalMined.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Value:</span>
                  <span className="text-green-400 font-bold">{totalValue.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App