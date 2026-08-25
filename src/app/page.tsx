import { CertificationCard } from "@/components/CertificationCard";
import { PageHeading } from "@/components/PageHeading";
import { getCertifications, getCoursesFor, summarizeStudyTime } from "@/lib/content";

export default function Home() {
  const certifications = getCertifications().map((certification) => {
    const courses = getCoursesFor(certification);

    return {
      certification,
      courseIds: courses.map((course) => course.id),
      studyTime: summarizeStudyTime(courses),
    };
  });

  return (
    <>
      <PageHeading
        title="資格を選ぶ"
        description="目指す資格を選ぶと、必要なコースが推奨学習順で並びます。目標は複数選べます。"
      />

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {certifications.map((item) => (
          <li key={item.certification.id}>
            <CertificationCard {...item} />
          </li>
        ))}
      </ul>
    </>
  );
}
