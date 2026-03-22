import { useState, useRef, useEffect, useCallback } from 'react'

function App() {
  const [imageData, setImageData] = useState<{ file: File; url: string } | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Adjustments (0-100)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [sepia, setSepia] = useState(0)
  const [blur, setBlur] = useState(0)
  const [sharpen, setSharpen] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    if (canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d')
    }
  }, [])

  const applyFilters = useCallback(() => {
    const ctx = ctxRef.current
    const img = originalImageRef.current
    if (!ctx || !img || !canvasRef.current) return

    const canvas = canvasRef.current
    const w = img.naturalWidth
    const h = img.naturalHeight
    
    canvas.width = w
    canvas.height = h

    // Build CSS filter string
    const filters: string[] = []
    filters.push(`brightness(${brightness}%)`)
    filters.push(`contrast(${contrast}%)`)
    filters.push(`saturate(${saturation}%)`)
    filters.push(`sepia(${sepia}%)`)
    filters.push(`blur(${blur}px)`)
    
    ctx.filter = filters.join(' ')
    ctx.drawImage(img, 0, 0, w, h)
    
    // Sharpening via convolution (if needed)
    if (sharpen > 0 && w > 0 && h > 0) {
      sharpenImage(ctx, w, h, sharpen / 100)
    }
  }, [brightness, contrast, saturation, sepia, blur, sharpen])

  const sharpenImage = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const factor = amount * 2
    
    // Simple unsharp mask approximation
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4
        const iL = (y * w + x - 1) * 4
        const iR = (y * w + x + 1) * 4
        const iT = ((y - 1) * w + x) * 4
        const iB = ((y + 1) * w + x) * 4
        
        for (let c = 0; c < 3; c++) {
          const center = data[i + c]
          const neighbors = (data[iL + c] + data[iR + c] + data[iT + c] + data[iB + c]) / 4
          data[i + c] = Math.min(255, Math.max(0, center + (center - neighbors) * factor))
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      alert('File too large (max 20MB)')
      return
    }

    setLoading(true)
    const url = URL.createObjectURL(file)
    
    const img = new Image()
    img.onload = () => {
      originalImageRef.current = img
      setImageData({ file, url })
      
      // Reset filters
      setBrightness(100)
      setContrast(100)
      setSaturation(100)
      setSepia(0)
      setBlur(0)
      setSharpen(0)
      
      // Draw initial image
      setTimeout(applyFilters, 50)
      setLoading(false)
    }
    img.onerror = () => {
      alert('Failed to load image')
      setLoading(false)
    }
    img.src = url
  }

  const handleFilter = (filter: string) => {
    switch (filter) {
      case 'vintage':
        setSepia(50)
        setContrast(120)
        setSaturation(70)
        break
      case 'cool':
        setSepia(0)
        setContrast(110)
        setSaturation(120)
        setBrightness(105)
        break
      case 'warm':
        setSepia(40)
        setSaturation(130)
        break
      case 'sharpen':
        setSharpen(80)
        break
      case 'blur':
        setBlur(3)
        break
      case 'bright':
        setBrightness(130)
        setContrast(110)
        break
      case 'dramatic':
        setContrast(150)
        setBrightness(90)
        break
      case 'bw':
        setSaturation(0)
        break
      case 'vivid':
        setSaturation(160)
        setContrast(115)
        break
    }
    setTimeout(applyFilters, 50)
  }

  const handleAIEnhance = () => {
    setBrightness(110)
    setContrast(120)
    setSaturation(130)
    setSharpen(30)
    setTimeout(applyFilters, 50)
  }

  const handleReset = () => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setSepia(0)
    setBlur(0)
    setSharpen(0)
    setTimeout(applyFilters, 50)
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    
    const link = document.createElement('a')
    link.download = 'edited-image.jpg'
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.95)
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
              className="w-full text-sm"
            />
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Adjustments</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm flex justify-between">
                  <span>Brightness</span>
                  <span>{brightness}%</span>
                </label>
                <input
                  type="range" min="0" max="200" step="1"
                  value={brightness}
                  onChange={(e) => {
                    setBrightness(parseInt(e.target.value))
                    applyFilters()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Contrast</span>
                  <span>{contrast}%</span>
                </label>
                <input
                  type="range" min="0" max="200" step="1"
                  value={contrast}
                  onChange={(e) => {
                    setContrast(parseInt(e.target.value))
                    applyFilters()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Saturation</span>
                  <span>{saturation}%</span>
                </label>
                <input
                  type="range" min="0" max="200" step="1"
                  value={saturation}
                  onChange={(e) => {
                    setSaturation(parseInt(e.target.value))
                    applyFilters()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Sepia</span>
                  <span>{sepia}%</span>
                </label>
                <input
                  type="range" min="0" max="100" step="1"
                  value={sepia}
                  onChange={(e) => {
                    setSepia(parseInt(e.target.value))
                    applyFilters()
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Blur</span>
                  <span>{blur}px</span>
                </label>
                <input
                  type="range" min="0" max="10" step="0.5"
                  value={blur}
                  onChange={(e) => {
                    setBlur(parseFloat(e.target.value))
                    applyFilters()
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
                  disabled={!imageData || loading}
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
              disabled={!imageData || loading}
              className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              ✨ Auto Enhance
            </button>
          </div>
        </aside>

        <div className="flex-1 bg-white rounded-lg shadow p-4">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : imageData ? (
            <div className="flex justify-center items-center overflow-auto">
              <canvas 
                ref={canvasRef} 
                style={{ maxWidth: '100%', maxHeight: '500px' }}
              />
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