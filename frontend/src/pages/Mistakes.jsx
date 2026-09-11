import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Mistakes() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [mistakes, setMistakes] = useState([])
  const [practicing, setPracticing] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answered, setAnswered] = useState(false)

  useEffect(() => {
    fetchMistakes()
  }, [])

  const fetchMistakes = async () => {
    setLoading(true)
    try {
      const res = await api.get('/mistakes')
      setMistakes(res.data.mistakes || [])
    } catch {
      setMistakes([])
    } finally {
      setLoading(false)
    }
  }

  const markReviewed = async (questionId, mastered) => {
    try {
      await api.post(`/mistakes/${questionId}/review`, { mastered })
      setMistakes(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, mastered, reviewed_at: new Date().toISOString() } : q
        )
      )
    } catch {}
  }

  const startPractice = () => {
    if (unmasteredMistakes.length === 0) return
    setPracticing(true)
    setPracticeIndex(0)
    setSelectedAnswer(null)
    setAnswered(false)
  }

  const handleAnswer = (optionIndex) => {
    if (answered) return
    setSelectedAnswer(optionIndex)
    setAnswered(true)
  }

  const nextPracticeQuestion = () => {
    if (practiceIndex + 1 >= unmasteredMistakes.length) {
      setPracticing(false)
      return
    }
    setPracticeIndex(prev => prev + 1)
    setSelectedAnswer(null)
    setAnswered(false)
  }

  const totalMistakes = mistakes.length
  const masteredCount = mistakes.filter(q => q.mastered).length
  const needsReviewCount = totalMistakes - masteredCount

  const groupedBySubject = mistakes.reduce((acc, q) => {
    const subject = q.subject || 'غير محدد'
    if (!acc[subject]) acc[subject] = []
    acc[subject].push(q)
    return acc
  }, {})

  const unmasteredMistakes = mistakes.filter(q => !q.mastered)

  const currentQuestion = unmasteredMistakes[practiceIndex]
  const isCorrect = answered && selectedAnswer === currentQuestion?.correct_answer_index

  const difficultyLabel = (level) => {
    const labels = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }
    return labels[level] || level
  }

  const difficultyColor = (level) => {
    const colors = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-amber-100 text-amber-700', hard: 'bg-rose-100 text-rose-700' }
    return colors[level] || 'bg-slate-100 text-slate-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 pb-24" dir="rtl">
        <div className="bg-gradient-to-r from-rose-600 via-pink-700 to-cyan-800 pt-12 pb-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl mb-4 animate-pulse">🔍</div>
            <div className="h-8 w-48 mx-auto bg-white/20 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 -mt-8">
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
                <div className="h-8 w-12 mx-auto bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-4 w-16 mx-auto bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
              <div className="h-5 w-32 bg-slate-100 rounded animate-pulse mb-4" />
              {[1, 2].map(j => (
                <div key={j} className="h-4 w-full bg-slate-50 rounded animate-pulse mb-3" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (practicing && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 pb-24" dir="rtl">
        <div className="bg-gradient-to-r from-rose-600 via-pink-700 to-cyan-800 pt-12 pb-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-white mb-1">مراجعة الأخطاء</h1>
            <p className="text-white/80 text-sm">{practiceIndex + 1} / {unmasteredMistakes.length}</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 -mt-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${difficultyColor(currentQuestion.difficulty)}`}>
                {difficultyLabel(currentQuestion.difficulty)}
              </span>
              {currentQuestion.subject && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-100 text-cyan-700">
                  {currentQuestion.subject}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-800 leading-relaxed mb-6">{currentQuestion.question_text}</h2>

            <div className="space-y-3 mb-6">
              {currentQuestion.options?.map((option, index) => {
                let optionStyle = 'bg-slate-50 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'
                if (answered) {
                  if (index === currentQuestion.correct_answer_index) {
                    optionStyle = 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                  } else if (index === selectedAnswer && index !== currentQuestion.correct_answer_index) {
                    optionStyle = 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                  } else {
                    optionStyle = 'bg-slate-50 border-slate-200 opacity-50'
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={answered}
                    className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${optionStyle}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center text-sm font-bold shrink-0">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="font-medium text-slate-700">{option}</span>
                      {answered && index === currentQuestion.correct_answer_index && (
                        <span className="mr-auto text-emerald-500 text-xl">✓</span>
                      )}
                      {answered && index === selectedAnswer && index !== currentQuestion.correct_answer_index && (
                        <span className="mr-auto text-rose-500 text-xl">✗</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className={`p-4 rounded-2xl mb-4 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                <p className={`font-bold mb-1 ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isCorrect ? 'أحسنت! إجابة صحيحة ✨' : 'إجابة خاطئة ❌'}
                </p>
                {!isCorrect && currentQuestion.correct_answer !== undefined && (
                  <p className="text-slate-600 text-sm">
                    الإجابة الصحيحة: <span className="font-bold text-emerald-700">{currentQuestion.options?.[currentQuestion.correct_answer_index]}</span>
                  </p>
                )}
              </div>
            )}

            {answered && currentQuestion.explanation && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 mb-4">
                <p className="text-sm font-bold text-cyan-800 mb-1">التوضيح:</p>
                <p className="text-sm text-slate-600 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}

            {answered && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                <p className="text-sm font-bold text-slate-700 mb-2">الجدول الزمني للمراجعة:</p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-lg">📅</span>
                  <span>المراجعة القادمة: بعد 3 أيام</span>
                </div>
                {currentQuestion.next_review && (
                  <p className="text-xs text-slate-500 mt-1">{new Date(currentQuestion.next_review).toLocaleDateString('ar-SA')}</p>
                )}
              </div>
            )}

            {answered && (
              <button
                onClick={nextPracticeQuestion}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold py-3 px-6 rounded-2xl hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md"
              >
                {practiceIndex + 1 >= unmasteredMistakes.length ? 'إنهاء المراجعة' : 'التالي →'}
              </button>
            )}
          </div>

          <button
            onClick={() => setPracticing(false)}
            className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-2xl hover:bg-slate-50 transition-all"
          >
            خروج من المراجعة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 pb-24" dir="rtl">
      <div className="bg-gradient-to-r from-rose-600 via-pink-700 to-cyan-800 pt-12 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-1">مراجعتي لأخطائي</h1>
          <p className="text-white/80 text-sm">راجع أخطاءك وحوّلها إلى معرفة</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">{totalMistakes}</p>
            <p className="text-xs text-slate-500 mt-1">إجمالي الأخطاء</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{masteredCount}</p>
            <p className="text-xs text-slate-500 mt-1">تم الإتقان</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{needsReviewCount}</p>
            <p className="text-xs text-slate-500 mt-1">يحتاج مراجعة</p>
          </div>
        </div>

        {needsReviewCount > 0 && (
          <button
            onClick={startPractice}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md mb-6 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🎯</span>
            مارس الأخطاء ({needsReviewCount})
          </button>
        )}

        {totalMistakes === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">أحسنت! لا توجد أخطاء للمراجعة</h3>
            <p className="text-slate-500 text-sm">استمر في التقدم الممتاز</p>
          </div>
        ) : (
          Object.entries(groupedBySubject).map(([subject, questions]) => (
            <div key={subject} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800">{subject}</h2>
                <span className="bg-cyan-100 text-cyan-700 text-xs font-semibold px-3 py-1 rounded-full">
                  {questions.length} {questions.length === 1 ? 'خطأ' : 'أخطاء'}
                </span>
              </div>

              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className={`rounded-2xl border p-4 transition-all ${q.mastered ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-slate-800 leading-relaxed flex-1">{q.question_text}</p>
                      {q.mastered && <span className="text-emerald-500 text-lg shrink-0">✓</span>}
                    </div>

                    {q.student_answer !== undefined && q.student_answer !== null && (
                      <div className="flex items-center gap-2 mb-2 text-sm">
                        <span className="text-slate-500">إجابتك:</span>
                        <span className="text-rose-600 font-semibold line-through">{q.student_answer}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <span className="text-slate-500">الإجابة الصحيحة:</span>
                      <span className="text-emerald-600 font-bold">{q.correct_answer}</span>
                    </div>

                    {q.explanation && (
                      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 mb-3">
                        <p className="text-xs font-bold text-cyan-800 mb-1">التوضيح:</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${difficultyColor(q.difficulty)}`}>
                          {difficultyLabel(q.difficulty)}
                        </span>
                        {q.next_review && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <span>📅</span>
                            المراجعة القادمة: بعد 3 أيام
                          </span>
                        )}
                      </div>

                      {!q.mastered && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => markReviewed(q.id, true)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                          >
                            ✓ أحباط
                          </button>
                          <button
                            onClick={() => markReviewed(q.id, false)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition-all"
                          >
                            ✗ لم أحباط
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
