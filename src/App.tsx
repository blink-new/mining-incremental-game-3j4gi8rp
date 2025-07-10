import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Progress } from './components/ui/progress'
import { Badge } from './components/ui/badge'
import { Separator } from './components/ui/separator'
import { 
  Pickaxe, 
  TrendingUp, 
  Coins, 
  Mountain,
  Settings,
  Star,
  Timer
} from 'lucide-react'

// Game types
interface Resource {
  id: string
  name: string
  color: string
  value: number
  unlockDepth: number
  icon: string
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

interface GameState {
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
  }
}

const RESOURCES: Resource[] = [
  { id: 'coal', name: 'Coal', color: '#2d3748', value: 1, unlockDepth: 0, icon: '⚫' },
  { id: 'iron', name: 'Iron', color: '#718096', value: 5, unlockDepth: 10, icon: '🔧' },
  { id: 'gold', name: 'Gold', color: '#d69e2e', value: 25, unlockDepth: 25, icon: '✨' },
  { id: 'diamond', name: 'Diamond', color: '#3182ce', value: 100, unlockDepth: 50, icon: '💎' },
]

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'basic_pickaxe',
    name: 'Iron Pickaxe',
    type: 'pickaxe',
    power: 2,
    cost: 50,
    owned: 0,
    description: 'Doubles your mining power'
  },
  {
    id: 'steel_pickaxe',
    name: 'Steel Pickaxe',
    type: 'pickaxe',
    power: 5,
    cost: 200,
    owned: 0,
    description: '5x mining power'
  },
  {
    id: 'auto_miner',
    name: 'Auto Miner',
    type: 'automation',
    power: 1,
    cost: 300,
    owned: 0,
    description: 'Mines 1 resource per second'
  },
  {
    id: 'drill',
    name: 'Power Drill',
    type: 'drill',
    power: 10,
    cost: 1000,
    owned: 0,
    description: '10x mining power'
  },
  {
    id: 'mega_drill',
    name: 'Mega Drill',
    type: 'drill',
    power: 50,
    cost: 5000,
    owned: 0,
    description: '50x mining power + depth bonus'
  }
]

function App() {
  const [gameState, setGameState] = useState<GameState>({
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
      efficiencyBonus: 1
    }
  })

  const [miningAnimation, setMiningAnimation] = useState(false)

  // Calculate current mining resource based on depth
  const getCurrentResource = useCallback(() => {
    const availableResources = RESOURCES.filter(r => gameState.depth >= r.unlockDepth)
    return availableResources[availableResources.length - 1] || RESOURCES[0]
  }, [gameState.depth])

  // Mine resources manually
  const mineResource = useCallback(() => {
    const resource = getCurrentResource()
    const power = gameState.clickPower * gameState.upgrades.clickMultiplier
    
    setGameState(prev => ({
      ...prev,
      [resource.id]: prev[resource.id as keyof GameState] as number + power,
      totalMined: prev.totalMined + power,
      depth: prev.depth + (power * 0.1) // Progress depth based on mining
    }))
    
    setMiningAnimation(true)
    setTimeout(() => setMiningAnimation(false), 200)
  }, [gameState.clickPower, gameState.upgrades.clickMultiplier, getCurrentResource])

  // Auto mining effect
  useEffect(() => {
    if (gameState.autoMineRate === 0) return

    const interval = setInterval(() => {
      const resource = getCurrentResource()
      const power = gameState.autoMineRate * gameState.upgrades.autoMultiplier
      
      setGameState(prev => ({
        ...prev,
        [resource.id]: prev[resource.id as keyof GameState] as number + power,
        totalMined: prev.totalMined + power,
        depth: prev.depth + (power * 0.05)
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState.autoMineRate, gameState.upgrades.autoMultiplier, getCurrentResource])

  // Buy equipment
  const buyEquipment = useCallback((equipmentId: string) => {
    const equipment = gameState.equipment.find(e => e.id === equipmentId)
    if (!equipment) return

    const totalResources = gameState.coal + gameState.iron * 5 + gameState.gold * 25 + gameState.diamond * 100
    const cost = equipment.cost * Math.pow(1.5, equipment.owned)

    if (totalResources < cost) return

    // Deduct cost (prioritize higher value resources)
    let remainingCost = cost
    const newState = { ...gameState }
    
    // Deduct from diamond first
    const diamondCost = Math.min(remainingCost / 100, newState.diamond)
    newState.diamond -= diamondCost
    remainingCost -= diamondCost * 100
    
    // Then gold
    const goldCost = Math.min(remainingCost / 25, newState.gold)
    newState.gold -= goldCost
    remainingCost -= goldCost * 25
    
    // Then iron
    const ironCost = Math.min(remainingCost / 5, newState.iron)
    newState.iron -= ironCost
    remainingCost -= ironCost * 5
    
    // Finally coal
    newState.coal -= remainingCost

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
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mountain className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Deep Mine Empire</h1>
            </div>
            <div className="flex items-center gap-4">
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
                    Click to mine! Power: {gameState.clickPower}x
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
                    <p className="text-slate-400 text-sm">Depth Progress</p>
                    <Progress value={(gameState.depth % 10) * 10} className="h-2" />
                    <p className="text-xs text-slate-500">
                      Next resource unlock at {Math.ceil(gameState.depth / 10) * 10}m
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Total Mined</p>
                    <p className="text-2xl font-bold text-white">
                      {gameState.totalMined.toLocaleString()}
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
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shop & Equipment */}
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-400" />
                  Equipment Shop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gameState.equipment.map(equipment => {
                  const cost = equipment.cost * Math.pow(1.5, equipment.owned)
                  const canAfford = totalValue >= cost
                  
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
                            {equipment.type === 'automation' ? `${equipment.power}/sec` : `${equipment.power}x`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-yellow-400">
                          Cost: {cost.toLocaleString()}
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
                  <span className="text-white font-medium">{gameState.clickPower}x</span>
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
                <Separator className="bg-slate-600" />
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