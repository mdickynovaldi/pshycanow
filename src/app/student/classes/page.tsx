import { redirect } from "next/navigation";

export default function ClassesRedirect() {
  // Redirect ke halaman courses
  redirect("/student/courses");
} 