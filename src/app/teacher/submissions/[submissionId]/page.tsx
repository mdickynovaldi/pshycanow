import GradingForm from "./grading-form";

export default function GradeSubmissionPage({ params }: any) {  
  return <GradingForm submissionId={params.submissionId} />;
} 