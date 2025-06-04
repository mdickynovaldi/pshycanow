"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SimpleSubmission {
  id: string;
  attemptNumber: number;
  status: string;
  createdAt: string;
  answers: {
    id: string;
    answerText: string;
    isCorrect: boolean | null;
    score: number | null;
    feedback: string | null;
    question: {
      question: string;
      expectedAnswer?: string;
    };
  }[];
}

export default function SubmissionsDebugPage() {
  const params = useParams();
  const [submissions, setSubmissions] = useState<SimpleSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Debug: fetching submissions...');
        
        const response = await fetch(`/api/teacher/quiz-submissions?quizId=${params.quizId}&studentId=${params.studentId}`);
        
        console.log('📡 Debug: Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('📊 Debug: Data received:', data);
        
        if (data.success) {
          setSubmissions(data.data.submissions);
          setStudentName(data.data.studentName);
          console.log('✅ Debug: Successfully set submissions:', data.data.submissions.length);
        } else {
          setError(data.message);
        }
      } catch (err) {
        console.error('❌ Debug: Error:', err);
        setError('Failed to fetch submissions');
      } finally {
        setLoading(false);
        console.log('🏁 Debug: Loading completed');
      }
    };

    fetchData();
  }, [params.quizId, params.studentId]);

  console.log('🎯 Debug: Render state:', { loading, submissionsCount: submissions.length, studentName, error });

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🔄 Loading submissions...</h1>
        <p>Please wait while we fetch the data.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>❌ Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🔍 DEBUG: Submissions Page</h1>
      <p><strong>Student:</strong> {studentName}</p>
      <p><strong>Quiz ID:</strong> {params.quizId}</p>
      <p><strong>Student ID:</strong> {params.studentId}</p>
      <p><strong>Total Submissions:</strong> {submissions.length}</p>
      
      <hr style={{ margin: '20px 0' }} />
      
      {submissions.length === 0 ? (
        <div>
          <h2>No submissions found</h2>
          <p>The student has not taken this quiz yet.</p>
        </div>
      ) : (
        <div>
          <h2>📝 Submissions Found:</h2>
          {submissions.map((submission) => (
            <div key={submission.id} style={{ 
              border: '1px solid #ccc', 
              margin: '10px 0', 
              padding: '15px',
              borderRadius: '5px',
              backgroundColor: '#f9f9f9'
            }}>
              <h3>Attempt #{submission.attemptNumber}</h3>
              <p><strong>Status:</strong> {submission.status}</p>
              <p><strong>Created:</strong> {new Date(submission.createdAt).toLocaleString()}</p>
              <p><strong>Answers:</strong> {submission.answers.length}</p>
              
              <div style={{ marginTop: '10px' }}>
                <h4>Answers:</h4>
                {submission.answers.map((answer, index) => (
                  <div key={answer.id} style={{ 
                    border: '1px solid #ddd', 
                    margin: '5px 0', 
                    padding: '10px',
                    backgroundColor: '#fff'
                  }}>
                    <p><strong>Q{index + 1}:</strong> {answer.question.question}</p>
                    <p><strong>Answer:</strong> {answer.answerText}</p>
                    <p><strong>Correct:</strong> {
                      answer.isCorrect === true ? '✅ Yes' : 
                      answer.isCorrect === false ? '❌ No' : 
                      '⏳ Not graded'
                    }</p>
                    <p><strong>Score:</strong> {answer.score ?? 'Not graded'}</p>
                    <p><strong>Feedback:</strong> {answer.feedback || 'None'}</p>
                    {answer.question.expectedAnswer && (
                      <p><strong>Expected:</strong> {answer.question.expectedAnswer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <hr style={{ margin: '20px 0' }} />
      
      <div>
        <h3>🔗 Links:</h3>
        <p>
          <a href={`/teacher/quizzes/${params.quizId}/students/${params.studentId}/submissions`} 
             style={{ color: 'blue', textDecoration: 'underline' }}>
            → Go to original submissions page
          </a>
        </p>
      </div>
    </div>
  );
} 