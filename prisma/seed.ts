/**
 * Meridian LMS — demo seed.
 *
 * Creates a small but realistic school:
 *   - 1 super admin, 2 admins
 *   - 3 parents (Sarah has TWO children — multi-child parent dashboard)
 *   - 4 students across grades 2, 4 and 7
 *   - subjects, courses, chapters, lessons, quizzes/assignments
 *   - graded attempt history (score trends), lesson progress, live classes
 *     with attendance, email templates, announcements and settings
 *
 * Run with: npm run db:seed   (password for every account: Passw0rd!)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PASSWORD = "Passw0rd!";

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysAhead(n: number, hour = 15): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Meridian LMS…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // Wipe in dependency order (idempotent re-seeding).
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.emailLog.deleteMany(),
    db.emailTemplate.deleteMany(),
    db.announcement.deleteMany(),
    db.attendance.deleteMany(),
    db.liveClass.deleteMany(),
    db.activityAttempt.deleteMany(),
    db.question.deleteMany(),
    db.activity.deleteMany(),
    db.lessonProgress.deleteMany(),
    db.enrollment.deleteMany(),
    db.lesson.deleteMany(),
    db.chapter.deleteMany(),
    db.course.deleteMany(),
    db.subject.deleteMany(),
    db.parentChildLink.deleteMany(),
    db.parentProfile.deleteMany(),
    db.studentProfile.deleteMany(),
    db.user.deleteMany(),
    db.setting.deleteMany(),
  ]);

  // --- Staff -----------------------------------------------------------------
  const superAdmin = await db.user.create({
    data: {
      email: "root@meridian.school",
      passwordHash,
      firstName: "Riya",
      lastName: "Kapoor",
      role: "SUPER_ADMIN",
      avatarColor: "#0f766e",
    },
  });
  const admin = await db.user.create({
    data: {
      email: "admin@meridian.school",
      passwordHash,
      firstName: "Marcus",
      lastName: "Lee",
      role: "ADMIN",
      avatarColor: "#0ea5e9",
    },
  });
  await db.user.create({
    data: {
      email: "jane.doe@meridian.school",
      passwordHash,
      firstName: "Jane",
      lastName: "Doe",
      role: "ADMIN",
      avatarColor: "#8b5cf6",
    },
  });

  // --- Parents ----------------------------------------------------------------
  const sarah = await db.user.create({
    data: {
      email: "sarah.thompson@meridian.school",
      passwordHash,
      firstName: "Sarah",
      lastName: "Thompson",
      role: "PARENT",
      avatarColor: "#f59e0b",
      parentProfile: { create: { phone: "+1 555 0101" } },
    },
    include: { parentProfile: true },
  });
  const david = await db.user.create({
    data: {
      email: "david.chen@meridian.school",
      passwordHash,
      firstName: "David",
      lastName: "Chen",
      role: "PARENT",
      avatarColor: "#6366f1",
      parentProfile: { create: { phone: "+1 555 0102" } },
    },
    include: { parentProfile: true },
  });
  const priya = await db.user.create({
    data: {
      email: "priya.patel@meridian.school",
      passwordHash,
      firstName: "Priya",
      lastName: "Patel",
      role: "PARENT",
      avatarColor: "#14b8a6",
      parentProfile: { create: { phone: "+1 555 0103" } },
    },
    include: { parentProfile: true },
  });

  // --- Students ----------------------------------------------------------------
  async function student(opts: {
    email: string;
    firstName: string;
    lastName: string;
    admissionNo: string;
    gradeLevel: number;
    section: string;
    color: string;
    parents: Array<{ parentId: string; relationship: string }>;
  }) {
    return db.user.create({
      data: {
        email: opts.email,
        passwordHash,
        firstName: opts.firstName,
        lastName: opts.lastName,
        role: "STUDENT",
        avatarColor: opts.color,
        studentProfile: {
          create: {
            admissionNo: opts.admissionNo,
            gradeLevel: opts.gradeLevel,
            section: opts.section,
            parents: { create: opts.parents },
          },
        },
      },
      include: { studentProfile: true },
    });
  }

  const ava = await student({
    email: "ava.thompson@student.meridian.school",
    firstName: "Ava",
    lastName: "Thompson",
    admissionNo: "MRD-00001",
    gradeLevel: 4,
    section: "A",
    color: "#ef4444",
    parents: [{ parentId: sarah.parentProfile!.id, relationship: "mother" }],
  });
  const liam = await student({
    email: "liam.thompson@student.meridian.school",
    firstName: "Liam",
    lastName: "Thompson",
    admissionNo: "MRD-00002",
    gradeLevel: 2,
    section: "B",
    color: "#0ea5e9",
    parents: [{ parentId: sarah.parentProfile!.id, relationship: "mother" }],
  });
  const emma = await student({
    email: "emma.chen@student.meridian.school",
    firstName: "Emma",
    lastName: "Chen",
    admissionNo: "MRD-00003",
    gradeLevel: 4,
    section: "A",
    color: "#8b5cf6",
    parents: [{ parentId: david.parentProfile!.id, relationship: "father" }],
  });
  const noah = await student({
    email: "noah.patel@student.meridian.school",
    firstName: "Noah",
    lastName: "Patel",
    admissionNo: "MRD-00004",
    gradeLevel: 7,
    section: "A",
    color: "#059669",
    parents: [{ parentId: priya.parentProfile!.id, relationship: "mother" }],
  });

  // --- Subjects -----------------------------------------------------------------
  const [math, science, english, , cs] = await Promise.all(
    [
      { name: "Mathematics", code: "MATH", icon: "bar-chart" },
      { name: "Science", code: "SCI", icon: "book" },
      { name: "English", code: "ENG", icon: "book-open" },
      { name: "Social Studies", code: "SOC", icon: "users" },
      { name: "Computer Science", code: "CS", icon: "settings" },
      { name: "Art", code: "ART", icon: "file-text" },
    ].map((s) => db.subject.create({ data: s })),
  );

  // --- Courses with content -------------------------------------------------------
  const g4Math = await db.course.create({
    data: {
      title: "Mathematics — Grade 4",
      slug: "mathematics-g4",
      description:
        "Numbers, fractions, geometry and measurement — the Grade 4 core mathematics course.",
      subjectId: math.id,
      gradeLevel: 4,
      coverColor: "#059669",
      isPublished: true,
      createdById: admin.id,
      chapters: {
        create: [
          {
            title: "Numbers & Place Value",
            description: "Reading, writing and comparing numbers up to 100,000.",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "Understanding place value",
                  contentType: "ARTICLE",
                  durationMinutes: 15,
                  sortOrder: 0,
                  content:
                    "# Place value\n\nEvery digit in a number has a **place** and a **value**.\n\n## The place value chart\n\n- Ones\n- Tens\n- Hundreds\n- Thousands\n- Ten thousands\n\nFor example, in the number **34,152**:\n\n1. The digit 3 is in the ten-thousands place, so it is worth 30,000\n2. The digit 4 is in the thousands place, so it is worth 4,000\n3. The digit 1 is in the hundreds place, so it is worth 100\n\n## Try it yourself\n\nWrite the value of the digit 7 in `27,483`.",
                },
                {
                  title: "Comparing large numbers",
                  contentType: "VIDEO",
                  videoUrl: "https://www.youtube.com/embed/DlCH6WJctSw",
                  durationMinutes: 12,
                  sortOrder: 1,
                  content:
                    "Watch the video, then remember:\n\n- Compare digits from the **left**\n- The symbols: `<` less than, `>` greater than, `=` equal",
                },
              ],
            },
          },
          {
            title: "Fractions",
            description: "Halves, quarters, equivalent fractions and comparison.",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "What is a fraction?",
                  contentType: "ARTICLE",
                  durationMinutes: 15,
                  sortOrder: 0,
                  content:
                    "# Fractions\n\nA fraction shows **part of a whole**.\n\n- The **numerator** (top) counts the parts you have\n- The **denominator** (bottom) counts the equal parts in the whole\n\n## Everyday fractions\n\n1. Half a pizza is 1/2\n2. A quarter of an hour is 15 minutes, or 1/4\n3. Three quarters of a dollar is 75 cents, or 3/4",
                },
                {
                  title: "Equivalent fractions",
                  contentType: "ARTICLE",
                  durationMinutes: 18,
                  sortOrder: 1,
                  content:
                    "# Equivalent fractions\n\nTwo fractions are **equivalent** when they name the same amount.\n\nMultiply (or divide) the numerator and denominator by the same number:\n\n- 1/2 = 2/4 = 4/8\n- 2/3 = 4/6 = 8/12\n\n**Rule**: whatever you do to the top, do to the bottom.",
                },
              ],
            },
          },
          {
            title: "Geometry",
            description: "Lines, angles and 2-D shapes.",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Types of angles",
                  contentType: "ARTICLE",
                  durationMinutes: 14,
                  sortOrder: 0,
                  content:
                    "# Angles\n\nAn angle is formed where two lines meet.\n\n- **Acute** — smaller than 90°\n- **Right** — exactly 90°\n- **Obtuse** — between 90° and 180°\n- **Straight** — exactly 180°\n\nLook around the room: how many right angles can you spot?",
                },
              ],
            },
          },
        ],
      },
    },
    include: { chapters: { include: { lessons: true } } },
  });

  const g4Science = await db.course.create({
    data: {
      title: "Science — Grade 4",
      slug: "science-g4",
      description: "Living things, matter, energy and our planet.",
      subjectId: science.id,
      gradeLevel: 4,
      coverColor: "#0ea5e9",
      isPublished: true,
      createdById: admin.id,
      chapters: {
        create: [
          {
            title: "Living Things",
            description: "Plants, animals and their habitats.",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "Food chains",
                  contentType: "ARTICLE",
                  durationMinutes: 15,
                  sortOrder: 0,
                  content:
                    "# Food chains\n\nA food chain shows **who eats whom** in a habitat.\n\n1. **Producers** — plants that make their own food from sunlight\n2. **Consumers** — animals that eat plants or other animals\n3. **Decomposers** — break down dead material and recycle nutrients\n\nExample: grass → grasshopper → frog → hawk",
                },
                {
                  title: "Habitats and adaptation",
                  contentType: "ARTICLE",
                  durationMinutes: 16,
                  sortOrder: 1,
                  content:
                    "# Habitats\n\nA habitat gives a living thing **food, water, shelter and space**.\n\n## Adaptations\n\n- A camel's hump stores fat for desert journeys\n- A polar bear's thick fur keeps it warm\n- A cactus stores water in its stem",
                },
              ],
            },
          },
          {
            title: "Matter & Energy",
            description: "Solids, liquids, gases and simple circuits.",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "States of matter",
                  contentType: "ARTICLE",
                  durationMinutes: 14,
                  sortOrder: 0,
                  content:
                    "# States of matter\n\nMatter exists in three main states:\n\n- **Solid** — fixed shape and volume (ice)\n- **Liquid** — fixed volume, takes the shape of its container (water)\n- **Gas** — fills all available space (steam)\n\nHeating and cooling move matter between states.",
                },
              ],
            },
          },
        ],
      },
    },
    include: { chapters: { include: { lessons: true } } },
  });

  const g4English = await db.course.create({
    data: {
      title: "English — Grade 4",
      slug: "english-g4",
      description: "Reading comprehension, grammar and creative writing.",
      subjectId: english.id,
      gradeLevel: 4,
      coverColor: "#8b5cf6",
      isPublished: true,
      createdById: admin.id,
      chapters: {
        create: [
          {
            title: "Grammar Foundations",
            description: "Nouns, verbs, adjectives and sentence structure.",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "Nouns and verbs",
                  contentType: "ARTICLE",
                  durationMinutes: 12,
                  sortOrder: 0,
                  content:
                    "# Nouns and verbs\n\n- A **noun** names a person, place or thing: *teacher, park, book*\n- A **verb** is an action or state: *run, think, is*\n\nEvery complete sentence needs at least one noun and one verb.",
                },
                {
                  title: "Descriptive writing",
                  contentType: "ARTICLE",
                  durationMinutes: 20,
                  sortOrder: 1,
                  content:
                    "# Descriptive writing\n\nGood writers **show**, they don't just tell.\n\n- Telling: *The garden was nice.*\n- Showing: *Bees hummed between rows of tulips while the smell of fresh soil drifted by.*\n\nUse your five senses when you describe a scene.",
                },
              ],
            },
          },
        ],
      },
    },
    include: { chapters: { include: { lessons: true } } },
  });

  const g2Math = await db.course.create({
    data: {
      title: "Mathematics — Grade 2",
      slug: "mathematics-g2",
      description: "Addition, subtraction and shapes for young mathematicians.",
      subjectId: math.id,
      gradeLevel: 2,
      coverColor: "#f59e0b",
      isPublished: true,
      createdById: admin.id,
      chapters: {
        create: [
          {
            title: "Addition & Subtraction",
            description: "Working with numbers up to 100.",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "Adding two-digit numbers",
                  contentType: "ARTICLE",
                  durationMinutes: 12,
                  sortOrder: 0,
                  content:
                    "# Adding two-digit numbers\n\nLine up the **ones** and the **tens**, then add column by column.\n\nExample: 23 + 45\n\n1. Ones: 3 + 5 = 8\n2. Tens: 2 + 4 = 6\n3. Answer: **68**",
                },
                {
                  title: "Subtraction with borrowing",
                  contentType: "ARTICLE",
                  durationMinutes: 14,
                  sortOrder: 1,
                  content:
                    "# Borrowing\n\nWhen the top digit is smaller, **borrow** ten from the next column.\n\nExample: 52 − 27\n\n1. 2 is smaller than 7, borrow: 12 − 7 = 5\n2. Tens: 4 − 2 = 2\n3. Answer: **25**",
                },
              ],
            },
          },
        ],
      },
    },
    include: { chapters: { include: { lessons: true } } },
  });

  const g7Cs = await db.course.create({
    data: {
      title: "Computer Science — Grade 7",
      slug: "computer-science-g7",
      description: "Algorithms, logic and a first taste of programming.",
      subjectId: cs.id,
      gradeLevel: 7,
      coverColor: "#14b8a6",
      isPublished: true,
      createdById: admin.id,
      chapters: {
        create: [
          {
            title: "Thinking in Algorithms",
            description: "Step-by-step problem solving.",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "What is an algorithm?",
                  contentType: "ARTICLE",
                  durationMinutes: 15,
                  sortOrder: 0,
                  content:
                    "# Algorithms\n\nAn **algorithm** is a precise list of steps that solves a problem.\n\nA recipe is an algorithm:\n\n1. Crack two eggs\n2. Whisk with milk\n3. Cook for 3 minutes\n\nComputers need every step spelled out — they cannot guess.",
                },
                {
                  title: "Variables and values",
                  contentType: "ARTICLE",
                  durationMinutes: 18,
                  sortOrder: 1,
                  content:
                    "# Variables\n\nA **variable** is a named box that stores a value.\n\n`score = 10` puts the value 10 in a box called `score`.\n\nLater, `score = score + 5` updates the box to 15.",
                },
              ],
            },
          },
        ],
      },
    },
    include: { chapters: { include: { lessons: true } } },
  });

  // --- Enrollments ------------------------------------------------------------
  const avaP = ava.studentProfile!;
  const liamP = liam.studentProfile!;
  const emmaP = emma.studentProfile!;
  const noahP = noah.studentProfile!;

  await db.enrollment.createMany({
    data: [
      { studentId: avaP.id, courseId: g4Math.id },
      { studentId: avaP.id, courseId: g4Science.id },
      { studentId: avaP.id, courseId: g4English.id },
      { studentId: emmaP.id, courseId: g4Math.id },
      { studentId: emmaP.id, courseId: g4Science.id },
      { studentId: emmaP.id, courseId: g4English.id },
      { studentId: liamP.id, courseId: g2Math.id },
      { studentId: noahP.id, courseId: g7Cs.id },
    ],
  });

  // --- Activities & questions ---------------------------------------------------
  const fractionsLesson = g4Math.chapters[1].lessons[0];
  const quizFractions = await db.activity.create({
    data: {
      courseId: g4Math.id,
      lessonId: fractionsLesson.id,
      title: "Fractions basics quiz",
      type: "QUIZ",
      instructions: "Answer all questions. You can only submit once, so check your work!",
      maxScore: 100,
      passScore: 40,
      timeLimitMinutes: 15,
      isPublished: true,
      questions: {
        create: [
          {
            prompt: "What is the top number of a fraction called?",
            type: "MCQ",
            options: JSON.stringify(["Numerator", "Denominator", "Divisor", "Quotient"]),
            correctAnswer: "Numerator",
            points: 25,
            sortOrder: 0,
          },
          {
            prompt: "1/2 is equivalent to 2/4.",
            type: "TRUE_FALSE",
            options: JSON.stringify(["True", "False"]),
            correctAnswer: "True",
            points: 25,
            sortOrder: 1,
          },
          {
            prompt: "Which fraction is the largest?",
            type: "MCQ",
            options: JSON.stringify(["1/4", "1/3", "1/2", "1/8"]),
            correctAnswer: "1/2",
            points: 25,
            sortOrder: 2,
          },
          {
            prompt: "How many quarters make a whole? (answer with a number)",
            type: "SHORT_ANSWER",
            options: JSON.stringify([]),
            correctAnswer: "4",
            points: 25,
            sortOrder: 3,
          },
        ],
      },
    },
    include: { questions: true },
  });

  const quizPlaceValue = await db.activity.create({
    data: {
      courseId: g4Math.id,
      lessonId: g4Math.chapters[0].lessons[0].id,
      title: "Place value check",
      type: "QUIZ",
      instructions: "A quick check on place value.",
      maxScore: 100,
      passScore: 40,
      isPublished: true,
      questions: {
        create: [
          {
            prompt: "In 34,152 what is the value of the digit 4?",
            type: "MCQ",
            options: JSON.stringify(["4", "40", "400", "4,000"]),
            correctAnswer: "4,000",
            points: 50,
            sortOrder: 0,
          },
          {
            prompt: "78,912 is greater than 79,000.",
            type: "TRUE_FALSE",
            options: JSON.stringify(["True", "False"]),
            correctAnswer: "False",
            points: 50,
            sortOrder: 1,
          },
        ],
      },
    },
    include: { questions: true },
  });

  const quizFoodChains = await db.activity.create({
    data: {
      courseId: g4Science.id,
      lessonId: g4Science.chapters[0].lessons[0].id,
      title: "Food chains quiz",
      type: "QUIZ",
      instructions: "Think about who eats whom!",
      maxScore: 100,
      passScore: 40,
      isPublished: true,
      questions: {
        create: [
          {
            prompt: "Which of these is a producer?",
            type: "MCQ",
            options: JSON.stringify(["Grass", "Frog", "Hawk", "Grasshopper"]),
            correctAnswer: "Grass",
            points: 40,
            sortOrder: 0,
          },
          {
            prompt: "Decomposers recycle nutrients from dead material.",
            type: "TRUE_FALSE",
            options: JSON.stringify(["True", "False"]),
            correctAnswer: "True",
            points: 30,
            sortOrder: 1,
          },
          {
            prompt: "What do plants need from the sun to make food? (one word)",
            type: "SHORT_ANSWER",
            options: JSON.stringify([]),
            correctAnswer: "sunlight",
            points: 30,
            sortOrder: 2,
          },
        ],
      },
    },
    include: { questions: true },
  });

  const essayAssignment = await db.activity.create({
    data: {
      courseId: g4English.id,
      lessonId: g4English.chapters[0].lessons[1].id,
      title: "Describe your favourite place",
      type: "ASSIGNMENT",
      instructions:
        "Write 5-8 sentences describing your favourite place using at least three senses. Submit your text in the box.",
      maxScore: 50,
      passScore: 20,
      isPublished: true,
    },
  });

  const g2Quiz = await db.activity.create({
    data: {
      courseId: g2Math.id,
      lessonId: g2Math.chapters[0].lessons[0].id,
      title: "Addition sprint",
      type: "QUIZ",
      instructions: "Add carefully!",
      maxScore: 100,
      passScore: 40,
      isPublished: true,
      questions: {
        create: [
          {
            prompt: "23 + 45 = ?",
            type: "MCQ",
            options: JSON.stringify(["58", "68", "78", "65"]),
            correctAnswer: "68",
            points: 50,
            sortOrder: 0,
          },
          {
            prompt: "17 + 26 = ? (answer with a number)",
            type: "SHORT_ANSWER",
            options: JSON.stringify([]),
            correctAnswer: "43",
            points: 50,
            sortOrder: 1,
          },
        ],
      },
    },
    include: { questions: true },
  });

  await db.activity.create({
    data: {
      courseId: g7Cs.id,
      lessonId: g7Cs.chapters[0].lessons[0].id,
      title: "Algorithms quiz",
      type: "QUIZ",
      instructions: "Precision matters.",
      maxScore: 100,
      passScore: 40,
      isPublished: true,
      questions: {
        create: [
          {
            prompt: "An algorithm is…",
            type: "MCQ",
            options: JSON.stringify([
              "A precise list of steps",
              "A programming language",
              "A type of computer",
              "A random guess",
            ]),
            correctAnswer: "A precise list of steps",
            points: 100,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  // --- Attempt history (drives parent score-trend charts) ------------------------
  type SeededQuiz = { id: string; maxScore: number; questions: Array<{ id: string; correctAnswer: string; points: number }> };

  async function gradedAttempt(
    quiz: SeededQuiz,
    studentProfileId: string,
    pct: number,
    submittedDaysAgo: number,
  ) {
    // Build answers achieving roughly `pct` of the points.
    const target = (pct / 100) * quiz.questions.reduce((s, q) => s + q.points, 0);
    let earned = 0;
    const answers: Record<string, string> = {};
    for (const q of quiz.questions) {
      if (earned + q.points <= target + 0.01) {
        answers[q.id] = q.correctAnswer;
        earned += q.points;
      } else {
        answers[q.id] = "wrong-answer";
      }
    }
    const total = quiz.questions.reduce((s, q) => s + q.points, 0);
    const score = Math.round((earned / total) * quiz.maxScore * 100) / 100;
    await db.activityAttempt.create({
      data: {
        activityId: quiz.id,
        studentId: studentProfileId,
        status: "GRADED",
        answers: JSON.stringify(answers),
        score,
        maxScore: quiz.maxScore,
        startedAt: daysAgo(submittedDaysAgo, 9),
        submittedAt: daysAgo(submittedDaysAgo, 10),
      },
    });
  }

  // Ava: strong upward trend
  await gradedAttempt(quizPlaceValue, avaP.id, 50, 28);
  await gradedAttempt(quizFoodChains, avaP.id, 70, 21);
  await gradedAttempt(quizFractions, avaP.id, 75, 12);
  await gradedAttempt(quizFoodChains, avaP.id, 100, 5);
  // Emma: consistent high performer
  await gradedAttempt(quizPlaceValue, emmaP.id, 100, 26);
  await gradedAttempt(quizFractions, emmaP.id, 75, 14);
  await gradedAttempt(quizFoodChains, emmaP.id, 70, 6);
  // Liam: young learner, mixed results
  await gradedAttempt(g2Quiz, liamP.id, 50, 10);
  await gradedAttempt(g2Quiz, liamP.id, 100, 3);

  // Ava's essay: submitted, waiting for manual grading (shows in the queue).
  await db.activityAttempt.create({
    data: {
      activityId: essayAssignment.id,
      studentId: avaP.id,
      status: "SUBMITTED",
      answers: JSON.stringify({
        response:
          "My favourite place is my grandmother's kitchen. The air always smells of cinnamon and warm bread. I can hear the old kettle whistling while rain taps the window. The wooden table feels smooth under my hands, worn by years of family dinners. When I sit there with hot cocoa, I feel safe and happy.",
      }),
      maxScore: 50,
      startedAt: daysAgo(1, 16),
      submittedAt: daysAgo(1, 17),
    },
  });

  // Emma's essay: already graded with feedback.
  await db.activityAttempt.create({
    data: {
      activityId: essayAssignment.id,
      studentId: emmaP.id,
      status: "GRADED",
      answers: JSON.stringify({
        response:
          "The beach near my house is my favourite place. Waves crash softly and seagulls call overhead. The sand is warm between my toes and the salty breeze cools my face. Sometimes I find shells shaped like tiny fans.",
      }),
      score: 42,
      maxScore: 50,
      feedback: "Lovely sensory detail, Emma! Next time try adding a taste or sound in the closing sentence.",
      gradedById: admin.id,
      startedAt: daysAgo(4, 16),
      submittedAt: daysAgo(4, 17),
    },
  });

  // --- Lesson progress -----------------------------------------------------------
  const progressRows: Array<{
    studentId: string;
    lessonId: string;
    status: "COMPLETED" | "IN_PROGRESS";
    minutes: number;
    daysBack: number;
  }> = [];

  const g4MathLessons = g4Math.chapters.flatMap((c) => c.lessons);
  const g4SciLessons = g4Science.chapters.flatMap((c) => c.lessons);
  const g4EngLessons = g4English.chapters.flatMap((c) => c.lessons);
  const g2Lessons = g2Math.chapters.flatMap((c) => c.lessons);
  const g7Lessons = g7Cs.chapters.flatMap((c) => c.lessons);

  // Ava: most of math + science done
  g4MathLessons.slice(0, 4).forEach((l, i) =>
    progressRows.push({ studentId: avaP.id, lessonId: l.id, status: "COMPLETED", minutes: 15, daysBack: 25 - i * 5 }),
  );
  progressRows.push({ studentId: avaP.id, lessonId: g4SciLessons[0].id, status: "COMPLETED", minutes: 16, daysBack: 8 });
  progressRows.push({ studentId: avaP.id, lessonId: g4SciLessons[1].id, status: "IN_PROGRESS", minutes: 6, daysBack: 2 });
  progressRows.push({ studentId: avaP.id, lessonId: g4EngLessons[0].id, status: "COMPLETED", minutes: 12, daysBack: 6 });
  // Emma: everything in math, some science/english
  g4MathLessons.forEach((l, i) =>
    progressRows.push({ studentId: emmaP.id, lessonId: l.id, status: "COMPLETED", minutes: 14, daysBack: 24 - i * 4 }),
  );
  progressRows.push({ studentId: emmaP.id, lessonId: g4SciLessons[0].id, status: "COMPLETED", minutes: 15, daysBack: 7 });
  progressRows.push({ studentId: emmaP.id, lessonId: g4EngLessons[0].id, status: "COMPLETED", minutes: 11, daysBack: 5 });
  progressRows.push({ studentId: emmaP.id, lessonId: g4EngLessons[1].id, status: "COMPLETED", minutes: 19, daysBack: 4 });
  // Liam & Noah
  progressRows.push({ studentId: liamP.id, lessonId: g2Lessons[0].id, status: "COMPLETED", minutes: 13, daysBack: 9 });
  progressRows.push({ studentId: liamP.id, lessonId: g2Lessons[1].id, status: "IN_PROGRESS", minutes: 4, daysBack: 1 });
  progressRows.push({ studentId: noahP.id, lessonId: g7Lessons[0].id, status: "COMPLETED", minutes: 15, daysBack: 3 });

  for (const row of progressRows) {
    await db.lessonProgress.create({
      data: {
        studentId: row.studentId,
        lessonId: row.lessonId,
        status: row.status,
        timeSpentMinutes: row.minutes,
        completedAt: row.status === "COMPLETED" ? daysAgo(row.daysBack, 18) : null,
      },
    });
  }

  // --- Live classes & attendance --------------------------------------------------
  const pastClass1 = await db.liveClass.create({
    data: {
      title: "Fractions revision workshop",
      description: "Interactive revision before the fractions quiz.",
      courseId: g4Math.id,
      gradeLevel: 4,
      hostId: admin.id,
      startTime: daysAgo(9, 15),
      durationMinutes: 40,
      status: "ENDED",
      provider: "manual",
      joinUrl: "https://zoom.us/j/94018253746",
    },
  });
  const pastClass2 = await db.liveClass.create({
    data: {
      title: "Science lab: states of matter",
      description: "Live demonstration with ice, water and steam.",
      courseId: g4Science.id,
      gradeLevel: 4,
      hostId: admin.id,
      startTime: daysAgo(3, 14),
      durationMinutes: 45,
      status: "ENDED",
      provider: "manual",
      joinUrl: "https://zoom.us/j/98217364550",
    },
  });
  await db.liveClass.create({
    data: {
      title: "Storytelling hour",
      description: "Reading aloud and discussing descriptive language.",
      courseId: g4English.id,
      gradeLevel: 4,
      hostId: admin.id,
      startTime: daysAhead(2, 15),
      durationMinutes: 40,
      status: "SCHEDULED",
      provider: "manual",
      joinUrl: "https://zoom.us/j/91553320981",
    },
  });
  await db.liveClass.create({
    data: {
      title: "Addition games",
      description: "Fun mental math games for Grade 2.",
      courseId: g2Math.id,
      gradeLevel: 2,
      hostId: admin.id,
      startTime: daysAhead(1, 10),
      durationMinutes: 30,
      status: "SCHEDULED",
      provider: "manual",
      joinUrl: "https://zoom.us/j/95012347788",
    },
  });

  await db.attendance.createMany({
    data: [
      { liveClassId: pastClass1.id, studentId: avaP.id, status: "PRESENT", joinedAt: daysAgo(9, 15) },
      { liveClassId: pastClass1.id, studentId: emmaP.id, status: "LATE", joinedAt: daysAgo(9, 15) },
      { liveClassId: pastClass2.id, studentId: avaP.id, status: "PRESENT", joinedAt: daysAgo(3, 14) },
      { liveClassId: pastClass2.id, studentId: emmaP.id, status: "ABSENT" },
    ],
  });

  // --- Email templates --------------------------------------------------------------
  const footer =
    '<p style="color:#6b7280;font-size:12px;margin-top:24px">Meridian LMS · <a href="{{appUrl}}">Open your portal</a></p>';
  await db.emailTemplate.createMany({
    data: [
      {
        key: "welcome_student",
        name: "Welcome — student",
        description: "Sent when a student account is created.",
        subject: "Welcome to Meridian, {{studentName}}!",
        bodyHtml: `<h2>Hi {{studentName}} 👋</h2><p>Your student account is ready. Your admission number is <strong>{{admissionNo}}</strong>.</p><p>Sign in to see your courses, lessons and live classes.</p>${footer}`,
        variables: JSON.stringify(["studentName", "admissionNo"]),
      },
      {
        key: "welcome_parent",
        name: "Welcome — parent",
        description: "Sent when a parent account is created.",
        subject: "Welcome to Meridian, {{parentName}}",
        bodyHtml: `<h2>Hello {{parentName}},</h2><p>Your parent account is ready. Once your children are linked, you'll see their scores, progress and attendance on your dashboard.</p>${footer}`,
        variables: JSON.stringify(["parentName"]),
      },
      {
        key: "activity_result",
        name: "Activity result — parent copy",
        description: "Sent to parents when a child's activity is graded.",
        subject: "{{studentName}} scored {{score}}/{{maxScore}} on {{activityTitle}}",
        bodyHtml: `<h2>New result for {{studentName}}</h2><p>Hi {{parentName}},</p><p><strong>{{activityTitle}}</strong> was just graded: <strong>{{score}}/{{maxScore}}</strong>.</p><p>Open the parent dashboard for the full report.</p>${footer}`,
        variables: JSON.stringify(["parentName", "studentName", "activityTitle", "score", "maxScore"]),
      },
      {
        key: "live_class_scheduled",
        name: "Live class scheduled",
        description: "Sent to students when a live class is scheduled for their grade.",
        subject: "New live class: {{classTitle}}",
        bodyHtml: `<h2>{{classTitle}}</h2><p>Hi {{studentName}}, a live class was scheduled for <strong>{{classTime}}</strong>.</p><p>Join from the Live Classes page — attendance is taken automatically.</p>${footer}`,
        variables: JSON.stringify(["studentName", "classTitle", "classTime"]),
      },
      {
        key: "password_reset",
        name: "Password reset",
        description: "Sent when staff resets a user's password.",
        subject: "Your Meridian password was reset",
        bodyHtml: `<h2>Password reset</h2><p>Hi {{name}}, your password was reset by the school. Your temporary password is <strong>{{tempPassword}}</strong>.</p><p>Please sign in and change it right away.</p>${footer}`,
        variables: JSON.stringify(["name", "tempPassword"]),
      },
    ],
  });

  // --- Announcements ------------------------------------------------------------------
  await db.announcement.createMany({
    data: [
      {
        title: "Welcome to the new academic year!",
        body: "We're excited to kick off 2026-2027 on Meridian. Students: check your enrolled courses. Parents: your dashboard now shows live progress for every child.",
        audience: "ALL",
        isPinned: true,
        createdById: superAdmin.id,
        publishedAt: daysAgo(14, 9),
      },
      {
        title: "Science fair sign-ups open",
        body: "Grade 4-10 students can sign up for the annual science fair until the end of the month. Ask your science teacher for the project guidelines.",
        audience: "STUDENTS",
        createdById: admin.id,
        publishedAt: daysAgo(6, 11),
      },
      {
        title: "Parent-teacher meetings next week",
        body: "Slots for the termly parent-teacher meetings are now open. You will receive an email with your suggested time. Meetings run Tuesday to Thursday, 4-7 pm.",
        audience: "PARENTS",
        createdById: admin.id,
        publishedAt: daysAgo(2, 12),
      },
    ],
  });

  // --- Settings ---------------------------------------------------------------------
  await db.setting.createMany({
    data: [
      { key: "platform.name", value: "Meridian LMS" },
      { key: "platform.academicYear", value: "2026-2027" },
      { key: "activities.defaultPassPct", value: "40" },
      { key: "liveClasses.lateThresholdMinutes", value: "10" },
    ],
  });

  // --- A few notifications -------------------------------------------------------------
  await db.notification.createMany({
    data: [
      {
        userId: sarah.id,
        title: "Ava scored 100/100 on Food chains quiz",
        body: "Activity: Food chains quiz",
        link: "/parent",
        createdAt: daysAgo(5, 10),
      },
      {
        userId: ava.id,
        title: "Live class scheduled: Storytelling hour",
        body: "In 2 days · Grade 4",
        link: "/student/live-classes",
        createdAt: daysAgo(1, 9),
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Accounts (password for all: Passw0rd!):");
  console.log("  Super admin : root@meridian.school");
  console.log("  Admin       : admin@meridian.school");
  console.log("  Parent (2 kids): sarah.thompson@meridian.school");
  console.log("  Parent      : david.chen@meridian.school");
  console.log("  Student     : ava.thompson@student.meridian.school");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
