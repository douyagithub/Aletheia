import { useState, useRef, useEffect, useCallback } from 'react'

function App() {
  const [imageData, setImageData] = useState<{ file: File; url: string } | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Adjustments (default 100 = no change)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [sepia, setSepia] = useState(0)
  const [blur, setBlur] = useState(0)
  const [sharpen, setSharpen] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const applyFilters = useCallback(() => {
    const canvas = canvasRef.current
    const img = originalImageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas to image size
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    // Build CSS filter string
    let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) blur(${blur}px)`
    ctx.filter = filterStr
    
    // Draw image
    ctx.drawImage(img, 0, 0)
    
    // Apply sharpen manually if needed
    if (sharpen > 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const w = canvas.width
      const h = canvas.height
      const amount = sharpen / 100
      
      // Simple sharpen kernel
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
            data[i + c] = Math.min(255, Math.max(0, center + (center - neighbors) * amount * 3))
          }
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }
  }, [brightness, contrast, saturation, sepia, blur, sharpen])

  // Load and display image
  useEffect(() => {
    if (imageData) {
      const img = new Image()
      img.onload = () => {
        originalImageRef.current = img
        // Small delay to ensure canvas is ready
        setTimeout(applyFilters, 100)
      }
      img.src = imageData.url
    }
  }, [imageData])

  // Apply filters when parameters change
  useEffect(() => {
    if (originalImageRef.current) {
      applyFilters()
    }
  }, [brightness, contrast, saturation, sepia, blur, sharpen, applyFilters])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      alert('File too large (max 20MB)')
      return
    }

    setLoading(true)
    const url = URL.createObjectURL(file)
    
    // Test image loads
    const img = new Image()
    img.onload = () => {
      setImageData({ file, url })
      
      // Reset filters
      setBrightness(100)
      setContrast(100)
      setSaturation(100)
      setSepia(0)
      setBlur(0)
      setSharpen(0)
      
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
        setBrightness(100)
        setContrast(120)
        setSaturation(70)
        setSepia(50)
        setBlur(0)
        setSharpen(0)
        break
      case 'cool':
        setBrightness(105)
        setContrast(110)
        setSaturation(120)
        setSepia(0)
        setBlur(0)
        setSharpen(0)
        break
      case 'warm':
        setBrightness(105)
        setContrast(100)
        setSaturation(130)
        setSepia(40)
        setBlur(0)
        setSharpen(0)
        break
      case 'sharpen':
        setBrightness(100)
        setContrast(100)
        setSaturation(100)
        setSepia(0)
        setBlur(0)
        setSharpen(80)
        break
      case 'blur':
        setBrightness(100)
        setContrast(100)
        setSaturation(100)
        setSepia(0)
        setBlur(3)
        setSharpen(0)
        break
      case 'bright':
        setBrightness(130)
        setContrast(110)
        setSaturation(120)
        setSepia(0)
        setBlur(0)
        setSharpen(0)
        break
      case 'dramatic':
        setBrightness(90)
        setContrast(150)
        setSaturation(100)
        setSepia(0)
        setBlur(0)
        setSharpen(0)
        break
      case 'bw':
        setBrightness(100)
        setContrast(110)
        setSaturation(0)
        setSepia(0)
        setBlur(0)
        setSharpen(0)
        break
      case 'vivid':
        setBrightness(105)
        setContrast(115)
        setSaturation(160)
        setSepia(0)
        setBlur(0)
        setSharpen(0)
        break
    }
  }

  const handleAIEnhance = () => {
    setBrightness(110)
    setContrast(120)
    setSaturation(130)
    setSepia(0)
    setBlur(0)
    setSharpen(30)
  }

  const handleReset = () => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setSepia(0)
    setBlur(0)
    setSharpen(0)
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Create a temporary canvas for clean export
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return
    
    tempCtx.drawImage(canvas, 0, 0)
    
    const link = document.createElement('a')
    link.download = 'edited-image.jpg'
    link.href = tempCanvas.toDataURL('image/jpeg', 0.95)
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
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
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
                  onChange={(e) => setContrast(parseInt(e.target.value))}
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
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
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
                  onChange={(e) => setSepia(parseInt(e.target.value))}
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
                  onChange={(e) => setBlur(parseFloat(e.target.value))}
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
            <div 
              ref={containerRef}
              className="flex justify-center items-center overflow-auto"
              style={{ minHeight: '400px' }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  border: '1px solid #e5e7eb'
                }}
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