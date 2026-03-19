import { useState, useRef, useEffect } from 'react'
import { Canvas, FabricImage, FabricObject } from 'fabric'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

interface ImageData {
  image_id: string
  quota_remaining: number
  is_free: boolean
  price: number
}

function App() {
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  
  // Adjustment values
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [saturation, setSaturation] = useState(1)
  const [temperature, setTemperature] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)

  // Initialize Fabric canvas
  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      fabricRef.current = new Canvas(canvasRef.current, {
        width: 600,
        height: 400,
        backgroundColor: '#f0f0f0'
      })
    }
    return () => {
      fabricRef.current?.dispose()
    }
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('session_id', sessionId)
      formData.append('file', file)

      const res = await axios.post(`${API_URL}/upload`, formData)
      setImageData(res.data)
      
      // Load image to canvas
      if (fabricRef.current && file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            FabricImage.fromURL(event.target.result as string).then((img: FabricObject) => {
              if (fabricRef.current) {
                fabricRef.current.clear()
                fabricRef.current.backgroundColor = '#f0f0f0'
                
                // Scale image to fit
                const scale = Math.min(
                  580 / ((img.width || 1) * (img.scaleX || 1)),
                  380 / ((img.height || 1) * (img.scaleY || 1))
                )
                img.scale(scale)
                img.set({
                  left: (600 - ((img.width || 0) * (img.scaleX || 1) * scale)) / 2,
                  top: (400 - ((img.height || 0) * (img.scaleY || 1) * scale)) / 2
                })
                fabricRef.current.add(img)
                fabricRef.current.renderAll()
              }
            })
          }
        }
        reader.readAsDataURL(file)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      alert(error.response?.data?.detail || 'Upload failed')
    }
    setLoading(false)
  }

  const handleAdjust = async () => {
    if (!imageData) return
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image_id', imageData.image_id)
      formData.append('brightness', brightness.toString())
      formData.append('contrast', contrast.toString())
      formData.append('saturation', saturation.toString())
      formData.append('temperature', temperature.toString())

      const res = await axios.post(`${API_URL}/adjust`, formData)
      
      // Update canvas with new image
      if (fabricRef.current && res.data.preview) {
        FabricImage.fromURL(res.data.preview).then((img: FabricObject) => {
          if (fabricRef.current) {
            fabricRef.current.clear()
            fabricRef.current.backgroundColor = '#f0f0f0'
            const scale = Math.min(580 / (img.width || 1), 380 / (img.height || 1))
            img.scale(scale)
            fabricRef.current.add(img)
            fabricRef.current.renderAll()
          }
        })
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleFilter = async (filter: string) => {
    if (!imageData) return
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image_id', imageData.image_id)
      const res = await axios.post(`${API_URL}/filter/${filter}`, formData)
      
      if (fabricRef.current && res.data.preview) {
        FabricImage.fromURL(res.data.preview).then((img: FabricObject) => {
          if (fabricRef.current) {
            fabricRef.current.clear()
            fabricRef.current.backgroundColor = '#f0f0f0'
            const scale = Math.min(580 / (img.width || 1), 380 / (img.height || 1))
            img.scale(scale)
            fabricRef.current.add(img)
            fabricRef.current.renderAll()
          }
        })
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleAIEnhance = async () => {
    if (!imageData) return
    
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/ai-enhance`, 
        new FormData())
      
      if (fabricRef.current && res.data.preview) {
        FabricImage.fromURL(res.data.preview).then((img: FabricObject) => {
          if (fabricRef.current) {
            fabricRef.current.clear()
            fabricRef.current.backgroundColor = '#f0f0f0'
            const scale = Math.min(580 / (img.width || 1), 380 / (img.height || 1))
            img.scale(scale)
            fabricRef.current.add(img)
            fabricRef.current.renderAll()
          }
        })
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleDownload = async () => {
    if (!imageData) return
    
    try {
      const res = await axios.get(`${API_URL}/download/${imageData.image_id}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'edited_image.jpg')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error(err)
    }
  }

  const filters = [
    { name: 'vintage', label: 'Vintage' },
    { name: 'cool', label: 'Cool' },
    { name: 'warm', label: 'Warm' },
    { name: 'sharpen', label: 'Sharpen' },
    { name: 'blur', label: 'Blur' },
    { name: 'bright', label: 'Bright' },
    { name: 'dramatic', label: 'Dramatic' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">📸 Image Editor</h1>
          <div className="flex gap-4 items-center">
            {imageData && (
              <>
                <span className="text-sm text-gray-600">
                  Free quota: {imageData.quota_remaining} | 
                  {imageData.is_free ? ' Free' : ` $${imageData.price}`}
                </span>
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
        {/* Left Sidebar - Tools */}
        <aside className="w-64 space-y-6">
          {/* Upload */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Upload</h3>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="w-full text-sm"
            />
          </div>

          {/* Basic Adjustments */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Adjustments</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm flex justify-between">
                  <span>Brightness</span>
                  <span>{brightness.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={brightness}
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Contrast</span>
                  <span>{contrast.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Saturation</span>
                  <span>{saturation.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={saturation}
                  onChange={(e) => setSaturation(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm flex justify-between">
                  <span>Temperature</span>
                  <span>{temperature}</span>
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleAdjust}
                disabled={!imageData || loading}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Apply Adjustments
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Filters</h3>
            <div className="grid grid-cols-2 gap-2">
              {filters.map((f) => (
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

          {/* AI Enhance */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">AI Tools</h3>
            <button
              onClick={handleAIEnhance}
              disabled={!imageData || loading}
              className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              ✨ AI Enhance
            </button>
          </div>
        </aside>

        {/* Main Canvas Area */}
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
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App