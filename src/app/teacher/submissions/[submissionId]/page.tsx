import GradingForm from "./grading-form";

export default function GradeSubmissionPage({ params }: { params: { submissionId: string } }) {  
  return <GradingForm submissionId={params.submissionId} />;
} 