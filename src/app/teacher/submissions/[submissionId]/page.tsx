import GradingForm from "./grading-form";

interface PageProps {
  params: Promise<{ submissionId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  // Await params untuk mendapatkan submissionId
  const { submissionId } = await params;
  
  return <GradingForm submissionId={submissionId} />;
} 