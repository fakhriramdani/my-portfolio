export interface Profile {
  fullName: string;
  headline: string;
  location: string;
  summary: string;
}

export interface Contact {
  kind: 'email' | 'linkedin';
  label: string;
  href: string;
}

export interface ExperienceGroup {
  name: string;
  bullets: string[];
}

export interface ExperienceItem {
  employer: string;
  role: string;
  start: string; // YYYY-MM
  end: string | null; // YYYY-MM or null
  groups: ExperienceGroup[];
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  start: string;
  end: string;
  highlights: string[];
}

export interface SkillItem {
  name: string;
  category: 'hard' | 'soft';
  level: 'Advanced' | 'Intermediate' | null;
}

export interface LanguageItem {
  name: string;
  proficiency: string;
}

export interface SiteMeta {
  title: string;
  description: string;
  ogImage: string;
  cvPdf: string;
  cvPdfSha256: string;
}

// TASK-205: New v2 content types
export interface ProjectItem {
  id: string;
  title: string;
  employer: string;
  role: string;
  period: string;
  source: string;
  summary: string; // 80-240 chars
  description: string; // 150-1200 chars
  tags: string[]; // 2-4 items, from 14-item whitelist
}

export interface SkillGroup {
  title: string;
  skills: string[];
}

export interface EducationCard {
  title: string;
  subtitle: string;
  description: string;
}

export interface LanguageCard {
  name: string;
  proficiency: string;
}

export interface CVData {
  profile: Profile;
  contacts: Contact[];
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  site: SiteMeta;
  // TASK-205: v2 collections
  projects: ProjectItem[];
  skillGroups: SkillGroup[];
  educationCards: EducationCard[];
  languageCards: LanguageCard[];
}

export const cvData: CVData = {
  profile: {
    fullName: "Fakhri Ramdani",
    headline: "Software Engineer",
    location: "West Jakarta, DKI Jakarta",
    summary: "Backend Developer with 5+ years of experience designing and building production-grade backend services in the banking sector using Go, Java (Spring Boot), ASP.NET, PostgreSQL, Oracle, and SQL Server. Proven track record of modernizing legacy systems, improving API consistency through OpenAPI-driven development, and strengthening code quality via automated testing and CI/CD pipelines. Skilled at collaborating across frontend, QA, and product teams to deliver secure, reliable, and well-tested features on time."
  },
  contacts: [
    {
      kind: "email",
      label: "fakhriramdani1@gmail.com",
      href: "mailto:fakhriramdani1@gmail.com"
    },
    {
      kind: "linkedin",
      label: "linkedin.com/in/fakhri-ramdani-183769ab",
      href: "https://www.linkedin.com/in/fakhri-ramdani-183769ab"
    }
  ],
  experience: [
    {
      employer: "Bank Sinarmas",
      role: "Backend Developer",
      start: "2021-09",
      end: null,
      groups: [
        {
          name: "Syariah Banking Project",
          bullets: [
            "Designed and deployed backend services using Go, PostgreSQL, Git, and Docker to power a real-time currency and media content display system across all Syariah banking branches, ensuring seamless data synchronization between locations.",
            "Led the loan system revamp from a legacy architecture to Go, Docker, Mockery, and oapi-codegen, improving API consistency and expanding automated test coverage through OpenAPI-driven development.",
            "Built loan system functionality using ASP.NET and SQL Server, supporting critical lending workflows while maintaining data integrity.",
            "Collaborated with frontend, QA, and product teams through CI/CD pipelines and code reviews to deliver secure, well-tested, and maintainable code."
          ]
        },
        {
          name: "Digital Banking Project",
          bullets: [
            "Developed and maintained a digital banking application using Java (Spring Boot) and Oracle Database, enabling flexible and easy-to-access transactions with high availability and production-grade performance.",
            "Partnered with frontend developers, QA engineers, and product owners to deliver integrated, secure, and thoroughly tested features aligned with business requirements."
          ]
        }
      ],
      bullets: []
    },
    {
      employer: "PT CDC Global Informatika",
      role: "Web Developer",
      start: "2019-10",
      end: "2021-09",
      groups: [],
      bullets: [
        "Developed and maintained a full-featured Dealer Management System (DMS) for a large-scale automotive company, covering bike sales operations, inventory tracking, and customer management.",
        "Built backend and frontend components using PHP (CakePHP), JavaScript, HTML, and CSS, along with MySQL, delivering responsive performance and reliable data handling.",
        "Translated complex business requirements and design specifications into scalable, production-ready code aligned with enterprise standards.",
        "Collaborated with end users, product owners, and testers to validate workflows and deliver high-quality releases through iterative development."
      ]
    }
  ],
  education: [
    {
      degree: "Bachelor's Degree in Informatics Engineering",
      institution: "Indonesia Computer University (UNIKOM)",
      start: "2015-09",
      end: "2019-09",
      highlights: [
        "Won a Silver Medal in the Robo Speeder category at Robogames California.",
        "Contributed to the development of the UNIKOM Robot Icon, covering mechanical design, control systems, and public demonstrations as part of a campus innovation initiative."
      ]
    }
  ],
  skills: [
    // Hard skills (14)
    { name: "Go", category: "hard", level: "Advanced" },
    { name: "Git", category: "hard", level: "Advanced" },
    { name: "PostgreSQL", category: "hard", level: "Advanced" },
    { name: "MySQL", category: "hard", level: "Advanced" },
    { name: "SQL Server", category: "hard", level: "Advanced" },
    { name: "Java / Spring Boot", category: "hard", level: "Intermediate" },
    { name: "ASP.NET", category: "hard", level: "Intermediate" },
    { name: "PHP / CakePHP", category: "hard", level: "Intermediate" },
    { name: "Docker", category: "hard", level: "Intermediate" },
    { name: "Oracle Database", category: "hard", level: null },
    { name: "REST API Design", category: "hard", level: null },
    { name: "OpenAPI/Swagger", category: "hard", level: null },
    { name: "Unit Testing (Mockery)", category: "hard", level: null },
    { name: "CI/CD", category: "hard", level: null },
    // Soft skills (6)
    { name: "Cross-functional collaboration", category: "soft", level: null },
    { name: "Problem solving", category: "soft", level: null },
    { name: "Effective communication", category: "soft", level: null },
    { name: "Adaptability", category: "soft", level: null },
    { name: "Time management", category: "soft", level: null },
    { name: "Attention to detail", category: "soft", level: null }
  ],
  languages: [
    { name: "English", proficiency: "Fluent" },
    { name: "Indonesian", proficiency: "Native" }
  ],
  site: {
    title: "Fakhri Ramdani — Software Engineer",
    description: "Software engineer with 5+ years in banking systems: Go, Java Spring Boot, ASP.NET, PostgreSQL, Oracle. Based in West Jakarta. Experience, skills, and contact.",
    ogImage: "/og.png",
    cvPdf: "/fakhriramdani-cv.pdf",
    cvPdfSha256: "d12066267c5932fb734e2a8d999e149d460949bc2975228060d7dac88b9558bf"
  },
  // TASK-205: v2 content collections
  projects: [
    {
      id: "syariah-banking-display",
      title: "Syariah Banking Display System",
      employer: "Bank Sinarmas",
      role: "Backend Developer",
      period: "2021-09 – Present",
      source: "Bank Sinarmas – Syariah Banking Project",
      summary: "Real-time currency and media content display system across all Syariah banking branches using Go, PostgreSQL, Git, and Docker with seamless multi-branch synchronization.",
      description: "Designed and deployed backend services using Go, PostgreSQL, Git, and Docker to power a real-time currency and media content display system across all Syariah banking branches, ensuring seamless data synchronization between locations.",
      tags: ["Go", "PostgreSQL", "Docker", "Git"]
    },
    {
      id: "loan-system-revamp",
      title: "Loan System Revamp",
      employer: "Bank Sinarmas",
      role: "Backend Developer",
      period: "2021-09 – Present",
      source: "Bank Sinarmas – Syariah Banking Project",
      summary: "End-to-end loan system architecture modernization to Go, Docker, Mockery, and oapi-codegen, standardizing API consistency and expanding automated test coverage.",
      description: "Designed and developed the loan system revamp from a legacy architecture to Go, Docker, Mockery, and oapi-codegen, improving API consistency and expanding automated test coverage through OpenAPI-driven development.",
      tags: ["Go", "Docker", "OpenAPI/Swagger", "Unit Testing (Mockery)"]
    },
    {
      id: "loan-system-legacy",
      title: "Loan System (Legacy)",
      employer: "Bank Sinarmas",
      role: "Backend Developer",
      period: "2021-09 – Present",
      source: "Bank Sinarmas – Syariah Banking Project",
      summary: "Critical lending workflows and core banking services implementation using ASP.NET and SQL Server, guaranteeing ACID compliance and robust financial data integrity.",
      description: "Built loan system functionality using ASP.NET and SQL Server, supporting critical lending workflows while maintaining data integrity across core banking services for enterprise banking operations.",
      tags: ["ASP.NET", "SQL Server"]
    },
    {
      id: "digital-banking-app",
      title: "Digital Banking App",
      employer: "Bank Sinarmas",
      role: "Backend Developer",
      period: "2021-09 – Present",
      source: "Bank Sinarmas – Digital Banking Project",
      summary: "High-availability digital banking application backend engineered with Java (Spring Boot) and Oracle Database for secure, high-throughput financial transactions.",
      description: "Developed and maintained a digital banking application using Java (Spring Boot) and Oracle Database, enabling flexible and easy-to-access transactions with high availability and production-grade performance.",
      tags: ["Java / Spring Boot", "Oracle Database"]
    },
    {
      id: "dealer-management-system",
      title: "Dealer Management System",
      employer: "PT CDC Global Informatika",
      role: "Web Developer",
      period: "2019-10 – 2021-09",
      source: "PT CDC Global Informatika – Dealer Management System",
      summary: "Comprehensive Dealer Management System (DMS) covering bike sales operations, inventory tracking, and customer management with PHP CakePHP and MySQL.",
      description: "Developed and maintained a full-featured Dealer Management System (DMS) for a large-scale automotive company, covering bike sales operations, inventory tracking, and customer management using PHP (CakePHP) and MySQL.",
      tags: ["PHP / CakePHP", "MySQL"]
    }
  ],
  skillGroups: [
    {
      title: "Backend Languages & Frameworks",
      skills: ["Go", "Java / Spring Boot", "ASP.NET", "PHP / CakePHP"]
    },
    {
      title: "Databases & Storage Engines",
      skills: ["PostgreSQL", "MySQL", "SQL Server", "Oracle Database"]
    },
    {
      title: "API Design & DevOps Tools",
      skills: ["Git", "Docker", "REST API Design", "OpenAPI/Swagger", "Unit Testing (Mockery)", "CI/CD"]
    },
    {
      title: "Professional & Interpersonal Skills",
      skills: ["Cross-functional collaboration", "Problem solving", "Effective communication", "Adaptability", "Time management", "Attention to detail"]
    }
  ],
  educationCards: [
    {
      title: "Bachelor's Degree in Informatics Engineering",
      subtitle: "Indonesia Computer University (UNIKOM) · Sep 2015 – Sep 2019",
      description: "Bachelor's Degree in Informatics Engineering from Indonesia Computer University (UNIKOM)."
    },
    {
      title: "Robogames California — Silver Medalist",
      subtitle: "Award",
      description: "Won a Silver Medal in the Robo Speeder category at Robogames California."
    },
    {
      title: "Campus Innovation: UNIKOM Robot Icon",
      subtitle: "Campus Innovation",
      description: "Contributed to the development of the UNIKOM Robot Icon, covering mechanical design, control systems, and public demonstrations as part of a campus innovation initiative."
    }
  ],
  languageCards: [
    {
      name: "English",
      proficiency: "Fluent"
    },
    {
      name: "Indonesian",
      proficiency: "Native"
    }
  ]
};
