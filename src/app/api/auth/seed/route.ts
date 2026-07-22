import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { SheetTemplate } from "@/models/SheetTemplate";
import { SheetData } from "@/models/SheetData";
import { Holiday } from "@/models/Holiday";
import { AuditLog } from "@/models/AuditLog";
import { hashPassword } from "@/lib/bcrypt";

const DEFAULT_PASSWORD = "reizpulse2026";

// ---------------------------------------------------------------------------
// Template definitions (spec-aligned; only text/number/select column types)
// ---------------------------------------------------------------------------
const TEMPLATES_DATA = [
  {
    name: "Video Editor Template",
    assignedRoles: ["Video Editor"],
    columns: [
      { key: "date",             label: "Date",              type: "text"   },
      { key: "login",            label: "Login",             type: "text"   },
      { key: "logout",           label: "Logout",            type: "text"   },
      { key: "workHours",        label: "Work Hours",        type: "number" },
      { key: "video1",           label: "Video 1",           type: "text"   },
      { key: "video2",           label: "Video 2",           type: "text"   },
      { key: "video3",           label: "Video 3",           type: "text"   },
      { key: "video4",           label: "Video 4",           type: "text"   },
      { key: "video5",           label: "Video 5",           type: "text"   },
      { key: "correctionVideos", label: "Correction Videos", type: "text"   },
      { key: "remarks",          label: "Remarks",           type: "text"   },
    ],
  },
  {
    name: "Graphic Designer Template",
    assignedRoles: ["Graphic Designer"],
    columns: [
      { key: "date",         label: "Date",         type: "text"   },
      { key: "login",        label: "Login",        type: "text"   },
      { key: "logout",       label: "Logout",       type: "text"   },
      { key: "workHours",    label: "Work Hours",   type: "number" },
      { key: "poster1",      label: "Poster 1",     type: "text"   },
      { key: "poster2",      label: "Poster 2",     type: "text"   },
      { key: "thumbnail",    label: "Thumbnail",    type: "text"   },
      { key: "carousel",     label: "Carousel",     type: "text"   },
      { key: "revisionWork", label: "Revision Work",type: "text"   },
      { key: "remarks",      label: "Remarks",      type: "text"   },
    ],
  },
  {
    name: "Social Media Manager Template",
    assignedRoles: ["Social Media Manager"],
    columns: [
      { key: "client1",        label: "Client 1",         type: "text"   },
      { key: "client2",        label: "Client 2",         type: "text"   },
      { key: "postsScheduled", label: "Posts Scheduled",  type: "number" },
      { key: "storiesUploaded",label: "Stories Uploaded", type: "number" },
      { key: "reportsSent",    label: "Reports Sent",     type: "number" },
      { key: "meetings",       label: "Meetings",         type: "number" },
      { key: "remarks",        label: "Remarks",          type: "text"   },
    ],
  },
  {
    name: "Sales Template",
    assignedRoles: ["Sales"],
    columns: [
      { key: "callsMade",       label: "Calls Made",        type: "number" },
      { key: "leadsContacted",  label: "Leads Contacted",   type: "number" },
      { key: "followUps",       label: "Follow-Ups",        type: "number" },
      { key: "meetings",        label: "Meetings",          type: "number" },
      { key: "dealsClosed",     label: "Deals Closed",      type: "number" },
      { key: "remarks",         label: "Remarks",           type: "text"   },
    ],
  },
  {
    name: "General Template",
    assignedRoles: ["General"],
    columns: [
      { key: "taskTitle",   label: "Task Title",   type: "text"   },
      { key: "description", label: "Description",  type: "text"   },
      { key: "hoursSpent",  label: "Hours Spent",  type: "number" },
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
  { date: "2026-01-26", name: "Republic Day",             isOptional: false },
  { date: "2026-08-15", name: "Independence Day",         isOptional: false },
  { date: "2026-10-02", name: "Gandhi Jayanti",           isOptional: false },
  { date: "2026-03-15", name: "Company Foundation Day",   isOptional: true  },
];

// ---------------------------------------------------------------------------
// GET /api/auth/seed
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const force = new URL(request.url).searchParams.get("force") === "true";

    // Guard against accidental re-seeding
    if (!force) {
      const superAdminExists = await User.findOne({ role: "SUPER_ADMIN" });
      if (superAdminExists) {
        return NextResponse.json({
          message: "Database already seeded. Use /api/auth/seed?force=true to re-seed.",
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

    const videoEditorTemplate    = upsertedTemplates[0];
    const graphicDesignerTemplate= upsertedTemplates[1];
    const generalTemplate        = upsertedTemplates[4]; // "General Template"

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
        name:               "Graphic Designer",
        email:              "employee2@reizmedia.com",
        password:           hashed,
        role:               "EMPLOYEE",
        designation:        "Graphic Designer",
        department:         "Design",
        status:             "ACTIVE",
        assignedTemplateId: graphicDesignerTemplate._id,
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
          date:             today,
          login:            "09:00",
          logout:           "18:00",
          workHours:        9,
          video1:           "MAY VR 8 - Brand Video",
          video2:           "MAY PD 13 - Product Demo",
          video3:           "",
          video4:           "",
          video5:           "",
          correctionVideos: "",
          remarks:          "Completed MAY VR 8, started colour grade on MAY PD 13",
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
