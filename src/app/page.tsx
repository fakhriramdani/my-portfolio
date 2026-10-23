import { HeaderBlock } from "./components/HeaderBlock";
import { AboutTwoColumn } from "./components/AboutTwoColumn";
import { WorkExperienceSection } from "./components/WorkExperienceSection";
import { DatabaseView } from "./components/DatabaseView";
import { ProjectModal } from "./components/ProjectModal";
import { PageLayout } from "./components/PageLayout";

/**
 * Halaman `/` — dokumen Notion (TECH-SPEC v2.0 §2.2).
 *
 * TASK-202: PageLayout (kontainer 880/358 px + skip-link ke `#main`) + HeaderBlock.
 * TASK-203: AboutTwoColumn (avatar + bio + 2 kontak).
 * TASK-204: WorkExperienceSection (2 employer cards).
 * TASK-206: DatabaseView + TabBar baseline CSS (BR-006: about -> experience -> database).
 * TASK-208: ProjectModal Dialog (5 static dialogs with :target baseline).
 */
export default function Home() {
  return (
    <PageLayout header={<HeaderBlock />}>
      <AboutTwoColumn />
      <WorkExperienceSection />
      <DatabaseView />
      <ProjectModal />
    </PageLayout>
  );
}
