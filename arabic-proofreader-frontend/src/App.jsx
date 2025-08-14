import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Upload, FileText, CheckCircle, AlertCircle, Download, BarChart3, Eye, Settings } from 'lucide-react'
import axios from 'axios'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [proofreadResult, setProofreadResult] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [fileMetadata, setFileMetadata] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // API base URL
  const API_BASE = 'http://localhost:5000/api'

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setActiveTab('extract')
      setUploadProgress(0)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setUploadProgress(0)
    
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      const result = response.data
      
      if (result.success) {
        setExtractedText(result.text)
        setFileMetadata(result.metadata)
        setActiveTab('proofread')
        
        // Auto-analyze the text
        await analyzeText(result.text)
      } else {
        alert(result.error || 'خطأ في رفع الملف')
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم')
      console.error('Upload error:', error)
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const handleProofread = async () => {
    if (!extractedText.trim()) return

    setIsLoading(true)

    try {
      const response = await axios.post(`${API_BASE}/proofread`, {
        text: extractedText
      })

      const result = response.data
      
      if (result.success) {
        setProofreadResult(result)
        setActiveTab('results')
      } else {
        alert(result.error || 'خطأ في التدقيق')
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم')
      console.error('Proofread error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeText = async (text = extractedText) => {
    if (!text.trim()) return

    try {
      const response = await axios.post(`${API_BASE}/analyze`, {
        text: text
      })

      const result = response.data
      
      if (result.success) {
        setAnalysisResult(result.analysis)
      }
    } catch (error) {
      console.error('Analysis error:', error)
    }
  }

  const downloadResult = () => {
    if (!proofreadResult) return

    const content = `تقرير التدقيق اللغوي
===================

معلومات الملف:
${fileMetadata ? `العنوان: ${fileMetadata.title || 'غير محدد'}
المؤلف: ${fileMetadata.author || 'غير محدد'}
نوع الملف: ${fileMetadata.file_type || 'غير محدد'}
` : ''}

إحصائيات النص:
عدد الكلمات الأصلي: ${proofreadResult.stats.original_words}
عدد الكلمات بعد التحسين: ${proofreadResult.stats.processed_words}
عدد الاقتراحات: ${proofreadResult.stats.suggestions_count}

النص الأصلي:
${proofreadResult.original_text}

النص المُحسَّن:
${proofreadResult.corrected_text}

الاقتراحات والتحسينات:
${proofreadResult.suggestions.map((s, i) => `${i + 1}. ${s.description}
   النوع: ${s.type}
   ${s.original ? `الأصلي: ${s.original}` : ''}
   ${s.improved || s.suggestion ? `المقترح: ${s.improved || s.suggestion}` : ''}
`).join('\n')}

تم إنشاء هذا التقرير بواسطة المدقق الأكاديمي الذكي
`
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `تقرير_التدقيق_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getSuggestionTypeColor = (type) => {
    const colors = {
      'spelling': 'bg-red-100 text-red-800',
      'punctuation': 'bg-blue-100 text-blue-800',
      'style': 'bg-green-100 text-green-800',
      'terminology': 'bg-purple-100 text-purple-800',
      'citation': 'bg-orange-100 text-orange-800',
      'voice': 'bg-indigo-100 text-indigo-800',
      'complexity': 'bg-yellow-100 text-yellow-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getSuggestionTypeLabel = (type) => {
    const labels = {
      'spelling': 'إملائي',
      'punctuation': 'ترقيم',
      'style': 'أسلوب',
      'terminology': 'مصطلحات',
      'citation': 'مراجع',
      'voice': 'صيغة',
      'complexity': 'تعقيد'
    }
    return labels[type] || type
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            مدقّق أكاديمي ذكي
          </h1>
          <p className="text-lg text-gray-600">
            منصة التدقيق اللغوي للأبحاث الجامعية باللغة العربية
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              رفع الملف
            </TabsTrigger>
            <TabsTrigger value="extract" disabled={!selectedFile} className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              استخراج النص
            </TabsTrigger>
            <TabsTrigger value="proofread" disabled={!extractedText} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              التدقيق
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!proofreadResult} className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              النتائج
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  رفع الملف
                </CardTitle>
                <CardDescription>
                  اختر ملف PDF أو Word لبدء عملية التدقيق (حتى 10 ميجابايت)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      اضغط لاختيار ملف أو اسحبه هنا
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, DOCX, DOC (حتى 10 ميجابايت)
                    </p>
                  </label>
                  {selectedFile && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-blue-600">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} ميجابايت
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Extract Tab */}
          <TabsContent value="extract" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  استخراج النص
                </CardTitle>
                <CardDescription>
                  استخرج النص من الملف المرفوع
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-medium">الملف: {selectedFile.name}</p>
                        <Badge variant="outline">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} ميجابايت
                        </Badge>
                      </div>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-2">
                          <Progress value={uploadProgress} className="w-full" />
                          <p className="text-sm text-gray-600 mt-1">
                            جاري الرفع... {uploadProgress}%
                          </p>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={isLoading}
                      className="w-full"
                      size="lg"
                    >
                      {isLoading ? 'جاري الاستخراج...' : 'استخراج النص'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    يرجى اختيار ملف أولاً
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Proofread Tab */}
          <TabsContent value="proofread" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      النص المستخرج
                    </CardTitle>
                    <CardDescription>
                      راجع النص وعدّله إذا لزم الأمر قبل بدء التدقيق
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      placeholder="النص المستخرج سيظهر هنا..."
                      className="min-h-[400px] text-right arabic-text"
                      dir="rtl"
                    />
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-600">
                        عدد الكلمات: {extractedText.split(' ').filter(word => word.trim()).length}
                      </div>
                      <Button 
                        onClick={handleProofread} 
                        disabled={isLoading || !extractedText.trim()}
                        size="lg"
                      >
                        {isLoading ? 'جاري التدقيق...' : 'بدء التدقيق'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* File Metadata */}
                {fileMetadata && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">معلومات الملف</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {fileMetadata.title && (
                        <div>
                          <span className="font-medium">العنوان: </span>
                          <span className="text-sm">{fileMetadata.title}</span>
                        </div>
                      )}
                      {fileMetadata.author && (
                        <div>
                          <span className="font-medium">المؤلف: </span>
                          <span className="text-sm">{fileMetadata.author}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">نوع الملف: </span>
                        <Badge variant="outline">{fileMetadata.file_type}</Badge>
                      </div>
                      {fileMetadata.page_count && (
                        <div>
                          <span className="font-medium">عدد الصفحات: </span>
                          <span className="text-sm">{fileMetadata.page_count}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Text Analysis */}
                {analysisResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="w-5 h-5" />
                        تحليل النص
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>الكلمات: {analysisResult.word_count}</div>
                        <div>الأحرف: {analysisResult.character_count}</div>
                        <div>الجمل: {analysisResult.sentence_count}</div>
                        <div>الفقرات: {analysisResult.paragraph_count}</div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="text-sm">
                          <span className="font-medium">التعقيد: </span>
                          <Badge variant={analysisResult.readability.complexity === 'بسيط' ? 'default' : 
                                        analysisResult.readability.complexity === 'متوسط' ? 'secondary' : 'destructive'}>
                            {analysisResult.readability.complexity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {analysisResult.readability.recommendation}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {proofreadResult && (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {proofreadResult.stats.suggestions_count}
                      </div>
                      <p className="text-sm text-gray-600">اقتراح للتحسين</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {proofreadResult.stats.original_words}
                      </div>
                      <p className="text-sm text-gray-600">كلمة أصلية</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {proofreadResult.stats.improvement_types?.length || 0}
                      </div>
                      <p className="text-sm text-gray-600">نوع تحسين</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <Button onClick={downloadResult} className="w-full" size="sm">
                        <Download className="w-4 h-4 ml-2" />
                        تحميل التقرير
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Text Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        النص الأصلي
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto text-right arabic-text" dir="rtl">
                        {proofreadResult.original_text}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        النص المُحسَّن
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-green-50 p-4 rounded-lg max-h-96 overflow-y-auto text-right arabic-text" dir="rtl">
                        {proofreadResult.corrected_text}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Suggestions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      الاقتراحات والتحسينات ({proofreadResult.suggestions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {proofreadResult.suggestions.map((suggestion, index) => (
                        <div key={index} className="p-4 bg-orange-50 rounded-lg border-r-4 border-orange-400">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-orange-800 text-right flex-1" dir="rtl">
                              {suggestion.description}
                            </h4>
                            <Badge className={getSuggestionTypeColor(suggestion.type)}>
                              {getSuggestionTypeLabel(suggestion.type)}
                            </Badge>
                          </div>
                          {suggestion.original && (
                            <div className="text-sm mb-1">
                              <span className="text-red-600 font-medium">الأصلي: </span>
                              <span className="text-right arabic-text" dir="rtl">{suggestion.original}</span>
                            </div>
                          )}
                          {(suggestion.improved || suggestion.suggestion) && (
                            <div className="text-sm">
                              <span className="text-green-600 font-medium">المقترح: </span>
                              <span className="text-right arabic-text" dir="rtl">
                                {suggestion.improved || suggestion.suggestion}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App

