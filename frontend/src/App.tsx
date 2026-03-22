import { useState, useRef, useEffect } from 'react'
import { Canvas, FabricImage, FabricObject } from 'fabric'

interface ImageData {
  file: File
  originalUrl: string
}

// Filter definitions matching Fabric.js v7 API
const filterConfigs: Record<string, any[]> = {
  vintage: [
    { type: 'Sepia', sepia: 0.6 },
    { type: 'Contrast', contrast: 0.15 },
    { type: 'Saturation', saturation: -0.4 }
  ],
  cool: [
    { type: 'Contrast', contrast: 0.1 },
    { type: 'Saturation', saturation: 0.15 },
    { type: 'Noise', noise: 8 }
  ],
  warm: [
    { type: 'Sepia', sepia: 0.4 },
    { type: 'Saturation', saturation: 0.3 },
    { type: 'Brightness', brightness: 0.05 }
  ],
  sharpen: [
    { type: 'Sharpen', sharpness: 0.8 }
  ],
  blur: [
    { type: 'Blur', blur: 0.4 }
  ],
  bright: [
    { type: 'Brightness', brightness: 0.25 },
    { type: 'Contrast', contrast: 0.1 },
    { type: 'Saturation', saturation: 0.2 }
  ],
  dramatic: [
    { type: 'Contrast', contrast: 0.35 },
    { type: 'Brightness', brightness: -0.08 }
  ],
  bw: [
    { type: 'Grayscale' }
  ],
  vivid: [
    { type: 'Saturation', saturation: 0.6 },
    { type: 'Contrast', contrast: 0.1 }
  ]
}

function App() {
  const [imageData, setImageData] = useState<ImageData | null>(null)
  
  // Adjustment values (0-100 scale for UI)
  const [brightness, setBrightness] = useState(50)
  const [contrast, setContrast] = useState(50)
  const [saturation, setSaturation] = useState(50)
  const [temperature, setTemperature] = useState(50)
  const [sharpness, setSharpness] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const fabricImageRef = useRef<FabricImage | null>(null)

  // Initialize Fabric canvas
  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      fabricRef.current = new Canvas(canvasRef.current, {
        width: 600,
        height: 400,
        backgroundColor: '#f3f4f6'
      })
    }
    return () => {
      fabricRef.current?.dispose()
    }
  }, [])

  const applyAdjustments = () => {
    if (!fabricImageRef.current) return
    
    const img = fabricImageRef.current
    
    // Convert 0-100 scale to Fabric.js filter values
    // Brightness: 0-100 -> -0.5 to 0.5
    const bValue = (brightness - 50) / 100
    // Contrast: 0-100 -> -0.5 to 0.5  
    const cValue = (contrast - 50) / 100
    // Saturation: 0-100 -> -1 to 1
    const sValue = (saturation - 50) / 50
    // Sharpness: 0-100 -> 0 to 1
    const shValue = sharpness / 100
    
    // Build filters array
    const filters: any[] = []
    
    if (Math.abs(bValue) > 0.01) {
      filters.push({ type: 'Brightness', brightness: bValue })
    }
    if (Math.abs(cValue) > 0.01) {
      filters.push({ type: 'Contrast', contrast: cValue })
    }
    if (Math.abs(sValue) > 0.01) {
      filters.push({ type: 'Saturation', saturation: sValue })
    }
    if (shValue > 0.01) {
      filters.push({ type: 'Sharpen', sharpness: shValue })
    }
    
    // Temperature: warm (sepia) or cool (noise + blue)
    const tValue = temperature - 50
    if (tValue > 5) {
      // Warm - apply sepia
      filters.push({ type: 'Sepia', sepia: tValue / 100 })
    } else if (tValue < -5) {
      // Cool - apply noise + invert hue
      filters.push({ type: 'Noise', noise: Math.abs(tValue) / 20 })
    }
    
    // Apply filters using Fabric.js v7 syntax
    img.filters = filters.map(f => {
      const { type, ...params } = f
      // @ts-ignore - Fabric.js dynamic filter creation
      return new fabric.Image.filters[type](params)
    })
    
    img.applyFilters()
    fabricRef.current?.renderAll()
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      alert('File too large (max 20MB)')
      return
    }

    const url = URL.createObjectURL(file)
    setImageData({ file, originalUrl: url })
    
    // Reset sliders
    setBrightness(50)
    setContrast(50)
    setSaturation(50)
    setTemperature(50)
    setSharpness(0)
    
    // Load image to canvas
    if (fabricRef.current) {
      fabricRef.current.clear()
      fabricRef.current.backgroundColor = '#f3f4f6'
      
      FabricImage.fromURL(url).then((img: FabricImage) => {
        if (!fabricRef.current) return
        
        // Scale to fit
        const maxW = 580
        const maxH = 380
        const scale = Math.min(maxW / (img.width || 1), maxH / (img.height || 1), 1)
        
        img.scale(scale)
        img.set({
          left: (600 - (img.width! * scale)) / 2,
          top: (400 - (img.height! * scale)) / 2,
          selectable: false
        })
        
        fabricImageRef.current = img
        fabricRef.current.add(img)
        fabricRef.current.renderAll()
      }).catch(err => {
        console.error('Failed to load image:', err)
        alert('Failed to load image')
      })
    }
  }

  const handleFilter = (filterType: string) => {
    if (!fabricImageRef.current) return
    
    const img = fabricImageRef.current
    const config = filterConfigs[filterType]
    if (!config) return
    
    // Build filters from config
    img.filters = config.map(f => {
      const { type, ...params } = f
      // @ts-ignore
      return new fabric.Image.filters[type](params)
    })
    
    img.applyFilters()
    fabricRef.current?.renderAll()
  }

  const handleAIEnhance = () => {
    // Auto-enhance: boost clarity and vibrancy
    setBrightness(60)
    setContrast(65)
    setSaturation(65)
    setTemperature(50)
    setSharpness(40)
    
    setTimeout(applyAdjustments, 50)
  }

  const handleReset = () => {
    setBrightness(50)
    setContrast(50)
    setSaturation(50)
    setTemperature(50)
    setSharpness(0)
    
    if (fabricImageRef.current) {
      fabricImageRef.current.filters = []
      fabricImageRef.current.applyFilters()
      fabricRef.current?.renderAll()
    }
  }

  const handleDownload = () => {
    if (!fabricRef.current || !fabricImageRef.current) return
    
    fabricRef.current.discardActiveObject()
    fabricRef.current.renderAll()
    
    // Use toDataURL with multiplier for better quality
    const dataUrl = fabricRef.current.toDataURL({
      format: 'jpeg',
      quality: 0.95,
      multiplier: 2
    })
    
    const link = document.createElement('a')
    link.download = 'edited-image.jpg'
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filterButtons = [
    { name: 'vintage', label: 'Vintage' },
    { name: 'cool', label: 'Cool' },
    { name: 'warm', label: 'Warm' },
    { name: 'sharpen', label: 'Sharpen' },
    { name: 'blur', label: 'Blur' },
    { name: 'bright', label: 'Bright' },
    { name: 'dramatic', label: 'Dramatic' },
    { name: 'bw', label: 'B&W' },
    { name: 'vivid', label: 'Vivid' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">📸 Image Editor</h1>
          <div className="flex gap-4 items-center">
            {imageData && (
              <>
                <span className="text-sm text-gray-600">✓ Free to use</span>
                <button
                  onClick={handleDownload}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Download
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 flex gap-6">
        <aside className="w-64 space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Upload Image</h3>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              className="w-full text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Adjustments</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm flex justify-between">
                  <span>Brightness</span>
                  <span>{brightness}</span>
                </label>
                <input
                  type="range" min="0" max="100" step="1"
                  value={brightness}
                  onChange={(e) => {
                    setBrightness(parseInt(e.target.value))
                    applyAdjustments()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Contrast</span>
                  <span>{contrast}</span>
                </label>
                <input
                  type="range" min="0" max="100" step="1"
                  value={contrast}
                  onChange={(e) => {
                    setContrast(parseInt(e.target.value))
                    applyAdjustments()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Saturation</span>
                  <span>{saturation}</span>
                </label>
                <input
                  type="range" min="0" max="100" step="1"
                  value={saturation}
                  onChange={(e) => {
                    setSaturation(parseInt(e.target.value))
                    applyAdjustments()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Temperature</span>
                  <span>{temperature}</span>
                </label>
                <input
                  type="range" min="0" max="100" step="1"
                  value={temperature}
                  onChange={(e) => {
                    setTemperature(parseInt(e.target.value))
                    applyAdjustments()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Sharpness</span>
                  <span>{sharpness}</span>
                </label>
                <input
                  type="range" min="0" max="100" step="1"
                  value={sharpness}
                  onChange={(e) => {
                    setSharpness(parseInt(e.target.value))
                    applyAdjustments()
                  }}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleReset}
                disabled={!imageData}
                className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Filters</h3>
            <div className="grid grid-cols-2 gap-2">
              {filterButtons.map((f) => (
                <button
                  key={f.name}
                  onClick={() => handleFilter(f.name)}
                  disabled={!imageData}
                  className="text-sm bg-gray-100 py-2 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">AI Tools</h3>
            <button
              onClick={handleAIEnhance}
              disabled={!imageData}
              className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              ✨ Auto Enhance
            </button>
          </div>
        </aside>

        <div className="flex-1 bg-white rounded-lg shadow p-4">
          {imageData ? (
            <div className="flex justify-center">
              <canvas ref={canvasRef} />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-gray-500">
                <p className="text-4xl mb-2">📷</p>
                <p>Upload an image to start editing</p>
                <p className="text-sm mt-2">Supports JPG, PNG, WebP (max 20MB)</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App