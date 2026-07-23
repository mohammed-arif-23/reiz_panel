import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { SheetTemplate } from "@/models/SheetTemplate";
import { SheetData } from "@/models/SheetData";
import { Holiday } from "@/models/Holiday";
import { AuditLog } from "@/models/AuditLog";
import { hashPassword } from "@/lib/bcrypt";

const DEFAULT_PASSWORD = "reiz2026";

// ---------------------------------------------------------------------------
// Template definitions (spec-aligned; only text/number/select column types)
// ---------------------------------------------------------------------------
const TEMPLATES_DATA = [
  {
    name: "Content Writer Template",
    assignedRoles: ["Content Writer"],
    isActive: true,
    columns: [
      {
        key: "designType",
        label: "Design Type",
        type: "select",
        options: ["Social Media", "Banner", "UI/UX", "Ad", "Blog", "Other"],
      },
      { key: "designTitle", label: "Design Title", type: "text" },
      { key: "revisionNo", label: "Revision No.", type: "number" },
      { key: "figmaLink", label: "Figma Link", type: "text" },
      { key: "fileName", label: "File Name", type: "text" },
      { key: "hoursSpent", label: "Hours Spent", type: "number" },
    ],
  },
  {
    name: "Video Editor Template",
    assignedRoles: ["Video Editor"],
    isActive: true,
    columns: [
      { key: "videoTitle", label: "Video Title", type: "text" },
      { key: "rawDuration", label: "Raw Duration (Min)", type: "text" },
      { key: "editedDuration", label: "Edited Duration (Min)", type: "text" },
      { key: "renderTime", label: "Render Time (Min)", type: "number" },
      { key: "fileName", label: "File Name", type: "text" },
      { key: "hoursSpent", label: "Hours Spent", type: "number" },
    ],
  },
  {
    name: "Social Media Manager Template",
    assignedRoles: ["Social Media Manager"],
    isActive: true,
    columns: [
      {
        key: "platform",
        label: "Platform",
        type: "select",
        options: ["Instagram", "Facebook", "LinkedIn", "YouTube", "Twitter/X", "TikTok", "Other"],
      },
      { key: "postTitle", label: "Post Title", type: "text" },
      { key: "scheduledTime", label: "Scheduled Time", type: "text" },
      { key: "liveLink", label: "Live Link", type: "text" },
      { key: "estEngagement", label: "Est. Engagement", type: "number" },
    ],
  },
  {
    name: "General Employee Template",
    assignedRoles: ["General"],
    isActive: true,
    columns: [
      { key: "taskTitle", label: "Task Title", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "hoursSpent", label: "Hours Spent", type: "number" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["In Progress", "Completed", "Blocked"],
      },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Holiday definitions
// ---------------------------------------------------------------------------
const HOLIDAYS_DATA = [
  { date: "2026-01-26", name: "Republic Day",                             isOptional: false },
  { date: "2026-03-15", name: "Company Foundation Day",                   isOptional: true  },
  { date: "2026-08-15", name: "Independence Day / Parsi New Year's Day",   isOptional: false },
  { date: "2026-08-26", name: "Milad-un-Nabi (Prophet's Birthday) / Onam",isOptional: false },
  { date: "2026-08-28", name: "Raksha Bandhan",                           isOptional: true  },
  { date: "2026-09-04", name: "Krishna Jayanthi / Janmashtami",           isOptional: false },
  { date: "2026-09-14", name: "Vinayakar Chathurthi / Ganesh Chaturthi",   isOptional: false },
  { date: "2026-10-02", name: "Mahatma Gandhi's Birthday",                isOptional: false },
  { date: "2026-10-19", name: "Ayudha Poojai / Maha Navami",               isOptional: false },
  { date: "2026-10-20", name: "Vijaya Dasami / Dussehra",                 isOptional: false },
  { date: "2026-10-26", name: "Maharishi Valmiki's Birthday",             isOptional: true  },
  { date: "2026-10-29", name: "Karaka Chaturthi (Karwa Chouth)",           isOptional: true  },
  { date: "2026-11-08", name: "Deepavali / Diwali",                       isOptional: false },
  { date: "2026-11-09", name: "Govardhan Puja",                           isOptional: true  },
  { date: "2026-11-11", name: "Bhai Duj / Balipratipada",                 isOptional: true  },
  { date: "2026-11-15", name: "Chhath Puja / Surya Shashthi",             isOptional: true  },
  { date: "2026-11-24", name: "Guru Nanak's Birthday",                     isOptional: false },
  { date: "2026-12-24", name: "Christmas Eve",                             isOptional: true  },
  { date: "2026-12-25", name: "Christmas Day",                             isOptional: false },
];

// ---------------------------------------------------------------------------
// GET /api/auth/seed
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const force = new URL(request.url).searchParams.get("force") === "true";
    const update = new URL(request.url).searchParams.get("update") === "true";

    // Guard against accidental re-seeding
    if (!force && !update) {
      const superAdminExists = await User.findOne({ role: "SUPER_ADMIN" });
      if (superAdminExists) {
        return NextResponse.json({
          message: "Database already seeded. Use /api/auth/seed?force=true to re-seed or ?update=true to update/add users without wiping.",
        });
      }
    }

    // -----------------------------------------------------------------------
    // Wipe existing seed data when force=true
    // -----------------------------------------------------------------------
    if (force) {
      await Promise.all([
        User.deleteMany({}),
        SheetTemplate.deleteMany({}),
        SheetData.deleteMany({}),
        Holiday.deleteMany({}),
        AuditLog.deleteMany({ action: "DB_SEED" }),
      ]);
    }

    // -----------------------------------------------------------------------
    // 1. Upsert Templates
    // -----------------------------------------------------------------------
    const upsertedTemplates: any[] = [];
    for (const tpl of TEMPLATES_DATA) {
      const doc = await SheetTemplate.findOneAndUpdate(
        { name: tpl.name },
        { $set: tpl },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upsertedTemplates.push(doc);
    }

    const contentWriterTemplate  = upsertedTemplates[0]; // Content Writer Template
    const videoEditorTemplate    = upsertedTemplates[1]; // Video Editor Template
    const socialMediaTemplate   = upsertedTemplates[2]; // Social Media Manager Template
    const generalTemplate        = upsertedTemplates[3]; // General Employee Template

    // -----------------------------------------------------------------------
    // 2. Hash shared password once
    // -----------------------------------------------------------------------
    const hashed = await hashPassword(DEFAULT_PASSWORD);

    // -----------------------------------------------------------------------
    // 3. Upsert Users
    // -----------------------------------------------------------------------
    const USERS_DATA = [
      {
        name:               "Super Admin",
        email:              "superadmin@reizmedia.com",
        password:           hashed,
        role:               "SUPER_ADMIN",
        designation:        "CEO",
        department:         "Management",
        status:             "ACTIVE",
        assignedTemplateId: generalTemplate._id,
      },
      {
        name:               "HR Admin",
        email:              "admin@reizmedia.com",
        password:           hashed,
        role:               "ADMIN",
        designation:        "HR Lead",
        department:         "Human Resources",
        status:             "ACTIVE",
        assignedTemplateId: generalTemplate._id,
      },
      {
        name:               "Creative Manager",
        email:              "manager@reizmedia.com",
        password:           hashed,
        role:               "MANAGER",
        designation:        "Creative Director",
        department:         "Creative",
        status:             "ACTIVE",
        assignedTemplateId: generalTemplate._id,
      },
      {
        name:               "Video Editor",
        email:              "employee1@reizmedia.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Video Editor",
        department:         "Production",
        status:             "ACTIVE",
        assignedTemplateId: videoEditorTemplate._id,
      },
      {
        name:               "Content Writer",
        email:              "employee2@reizmedia.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Content Writer",
        department:         "Content",
        status:             "ACTIVE",
        assignedTemplateId: contentWriterTemplate._id,
      },
      {
        name:               "Raja Prasanna",
        email:              "rajaprasanna07@gmail.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Video Editor",
        department:         "Production",
        status:             "ACTIVE",
        assignedTemplateId: videoEditorTemplate._id,
      },
      {
        name:               "Mohammed Arif",
        email:              "mohammedarif2303@gmail.com",
        password:           hashed,
        role:               "ADMIN",
        designation:        "Admin",
        department:         "Management",
        status:             "ACTIVE",
        assignedTemplateId: generalTemplate._id,
      },
      {
        name:               "Jaissy V",
        email:              "vjaissy@gmail.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Content Writer",
        department:         "Content",
        status:             "ACTIVE",
        assignedTemplateId: contentWriterTemplate._id,
      },
      {
        name:               "Divya Bharathi",
        email:              "divyabharathi020100@gmail.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Content Writer",
        department:         "Content",
        status:             "ACTIVE",
        assignedTemplateId: contentWriterTemplate._id,
      },
      {
        name:               "Gowtham",
        email:              "gowthameditz25@gmail.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Video Editor",
        department:         "Production",
        status:             "ACTIVE",
        assignedTemplateId: videoEditorTemplate._id,
      },
      {
        name:               "Mohammed Abbas",
        email:              "contact.mohammedabbas1308@gmail.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Video Editor",
        department:         "Production",
        status:             "ACTIVE",
        assignedTemplateId: videoEditorTemplate._id,
      },
    ];

    const upsertedUsers: any[] = [];
    for (const u of USERS_DATA) {
      const doc = await User.findOneAndUpdate(
        { email: u.email },
        { $set: u },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upsertedUsers.push(doc);
    }

    const employee1 = upsertedUsers[3]; // employee1@reizmedia.com

    // -----------------------------------------------------------------------
    // 4. Sample SheetData entries for employee1 (Video Editor)
    //    Today's date in YYYY-MM-DD (local IST approximation via UTC)
    // -----------------------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);

    const sampleSheetEntries = [
      {
        date:       today,
        userId:     employee1._id,
        templateId: videoEditorTemplate._id,
        columnsSnapshot: videoEditorTemplate.columns,
        data: {
          videoTitle:     "MAY VR 8 - Brand Video",
          rawDuration:    "45",
          editedDuration: "3",
          renderTime:     15,
          fileName:       "MAY_VR_8_Final_v2.mp4",
          hoursSpent:     6,
        },
        tasks: [
          {
            title:       "Edit MAY VR 8 - Brand Video",
            description: "Full edit + colour grade + audio mix for the brand video",
            category:    "Video Editing",
            priority:    "HIGH",
            status:      "COMPLETED",
          },
          {
            title:       "Begin MAY PD 13 - Product Demo",
            description: "Rough cut + b-roll assembly for the product demo video",
            category:    "Video Editing",
            priority:    "MEDIUM",
            status:      "IN_PROGRESS",
          },
          {
            title:       "Export & Upload to Drive",
            description: "Export MAY VR 8 in 4K and upload to shared G-Drive folder",
            category:    "Delivery",
            priority:    "HIGH",
            status:      "COMPLETED",
          },
          {
            title:       "Sync with Creative Director",
            description: "Share progress update and get feedback on MAY PD 13 rough cut",
            category:    "Communication",
            priority:    "LOW",
            status:      "NOT_STARTED",
          },
        ],
        eodSummary:
          "Completed editing MAY VR 8, started on MAY PD 13. Exported and uploaded to Drive. Will begin audio mix on MAY PD 13 tomorrow.",
        submittedAt: new Date(),
      },
    ];

    const upsertedSheetData: any[] = [];
    for (const entry of sampleSheetEntries) {
      const { data, ...rest } = entry;
      const doc = await SheetData.findOneAndUpdate(
        { userId: rest.userId, date: rest.date },
        { $set: { ...rest, data: new Map(Object.entries(data)) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upsertedSheetData.push(doc);
    }

    // -----------------------------------------------------------------------
    // 5. Upsert Holidays
    // -----------------------------------------------------------------------
    const upsertedHolidays: any[] = [];
    for (const h of HOLIDAYS_DATA) {
      const doc = await Holiday.findOneAndUpdate(
        { date: h.date },
        { $set: h },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upsertedHolidays.push(doc);
    }

    // -----------------------------------------------------------------------
    // 6. Audit log
    // -----------------------------------------------------------------------
    await AuditLog.create({
      userId:    upsertedUsers[0]._id,
      action:    "DB_SEED",
      details:   "Database seeded with users, templates, sample sheet data, and holidays",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // -----------------------------------------------------------------------
    // Response summary
    // -----------------------------------------------------------------------
    return NextResponse.json({
      message:  "Database seeded successfully",
      password: DEFAULT_PASSWORD,
      summary: {
        users: upsertedUsers.map((u: any) => ({
          email:       u.email,
          role:        u.role,
          name:        u.name,
          designation: u.designation,
        })),
        templates: upsertedTemplates.map((t: any) => ({
          name:         t.name,
          columnsCount: t.columns.length,
        })),
        sheetData: upsertedSheetData.map((s: any) => ({
          date:      s.date,
          userId:    s.userId,
          taskCount: s.tasks?.length ?? 0,
        })),
        holidays: upsertedHolidays.map((h: any) => ({
          name:       h.name,
          date:       h.date,
          isOptional: h.isOptional,
        })),
      },
    });
  } catch (error: any) {
    console.error("Seeding API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
