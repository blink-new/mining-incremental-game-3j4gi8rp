import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'

interface MinigameProps {
  open: boolean
  onClose: (result: 'win' | 'lose') => void
  depth: number
}

const Minigame = ({ open, onClose, depth }: MinigameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [timeLeft, setTimeLeft] = useState(10)
  const [result, setResult] = useState<null | 'win' | 'lose'>(null)

  useEffect(() => {
    if (result) {
      onClose(result)
      setResult(null)
    }
  }, [result, onClose])

  useEffect(() => {
    if (!open) return
    setTimeLeft(10)
    setResult(null)

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const player = { x: canvas.width / 2, y: canvas.height - 30, width: 20, height: 20 }
    let gasLines: { x: number, y: number, width: number, height: number, speed: number }[] = []
    let gameLoop: number

    const gameSpeed = 1 + depth / 50 // Gas lines move faster at greater depths

    function drawPlayer() {
      ctx!.fillStyle = '#3b82f6' // Blue
      ctx!.fillRect(player.x, player.y, player.width, player.height)
    }

    function drawGasLines() {
      ctx!.fillStyle = '#ef4444' // Red
      gasLines.forEach(line => {
        ctx!.fillRect(line.x, line.y, line.width, line.height)
      })
    }

    function updateGasLines() {
      gasLines.forEach(line => {
        line.y += line.speed * gameSpeed
      })
      gasLines = gasLines.filter(line => line.y < canvas.height)
    }

    function detectCollision() {
      for (const line of gasLines) {
        if (
          player.x < line.x + line.width &&
          player.x + player.width > line.x &&
          player.y < line.y + line.height &&
          player.y + player.height > line.y
        ) {
          return true
        }
      }
      return false
    }

    function game() {
      ctx!.clearRect(0, 0, canvas.width, canvas.height)
      drawPlayer()
      drawGasLines()
      updateGasLines()

      if (detectCollision()) {
        setResult('lose')
        cancelAnimationFrame(gameLoop)
        return
      }

      gameLoop = requestAnimationFrame(game)
    }

    const spawnInterval = setInterval(() => {
      const width = Math.random() * 100 + 50
      const x = Math.random() * (canvas.width - width)
      const speed = Math.random() * 2 + 1
      gasLines.push({ x, y: -20, width, height: 10, speed })
    }, 500)

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setResult('win')
          clearInterval(timerInterval)
          clearInterval(spawnInterval)
          cancelAnimationFrame(gameLoop)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        player.x = Math.max(0, player.x - 10)
      } else if (e.key === 'ArrowRight') {
        player.x = Math.min(canvas.width - player.width, player.x + 10)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    gameLoop = requestAnimationFrame(game)

    return () => {
      cancelAnimationFrame(gameLoop)
      clearInterval(spawnInterval)
      clearInterval(timerInterval)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose, depth])

  return (
    <Dialog open={open} onOpenChange={() => setResult('lose')}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dodge the Gas Lines!</DialogTitle>
          <DialogDescription>
            Use the arrow keys to dodge the red gas lines for {timeLeft} more seconds.
          </DialogDescription>
        </DialogHeader>
        <canvas ref={canvasRef} width="400" height="500" className="bg-slate-800 rounded-md"></canvas>
        <div className="text-center text-2xl font-bold">{timeLeft}</div>
      </DialogContent>
    </Dialog>
  )
}

export default Minigame