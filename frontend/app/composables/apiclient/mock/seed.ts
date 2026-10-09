import type { IAffiliation, IProfile, IProfileDocument, IRelationship } from "../profile"
import type { IOrganisation } from "../organisation"
import type { IEvent } from "../event"
import type { IApplication } from "../application"

// Mirrors backend/src/domain/permissions.ts (PERMISSIONS and DEFAULT_ROLE_PERMISSIONS).
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
    "enquiries:read": "View enquiries",
    "enquiries:write": "Capture and manage enquiries",
    "applications:read": "View membership applications",
    "applications:write": "Capture and manage membership applications",
    "applications:screen": "Screen applications for eligibility and forward them to the Committee",
    "applications:review": "Review forwarded applications and record decisions with comments",
    "persons:read": "View person records",
    "persons:write": "Maintain person records",
    "interactions:log": "Log interactions with people and organisations",
    "events:register-members": "Register members for events",
    "events:manage-registrations": "Manage event registrations",
    "communications:send": "Send communications to assigned segments",
    "certifications:manage": "Manage certification candidates",
    "training:manage": "Manage training cohorts",
    "assessments:record": "Record attendance, exam results, project report outcomes and CEUs",
    "partnerships:manage": "Manage the corporate, institutional and partner pipeline, proposals and MoUs",
    "members:issue-number": "Issue membership numbers",
    "members:approve-changes": "Approve grade upgrades, waivers and reinstatements",
    "work:reassign": "Reassign work between staff",
    "reports:view": "View dashboards and reports",
    "members:view-register-summary": "View the member register summary",
    "payments:read": "View dues and fee payment status and payment references",
    "payments:confirm-offline": "Mark offline payments as confirmed",
    "system:configure": "Full system configuration",
    "users:read": "View staff users",
    "users:manage": "Create and manage staff users",
    "roles:manage": "View the permission catalog and change role permissions",
    "integrations:manage": "Administer integrations",
    "audit-log:read": "Access the audit log",
}

export const ALL_PERMISSIONS = Object.keys(PERMISSION_DESCRIPTIONS)

const MEMBERSHIP_OFFICER = [
    "enquiries:read", "enquiries:write", "applications:read", "applications:write", "persons:read", "persons:write",
    "interactions:log", "events:register-members", "communications:send",
]

const ROLE_PERMISSIONS: [string, string, string[]][] = [
    ["membership officer", "Handles enquiries, applications and member records.", MEMBERSHIP_OFFICER],
    ["certification & training coordinator", "Runs certification candidates, training cohorts and events.",
        ["certifications:manage", "training:manage", "assessments:record", "events:manage-registrations", "persons:read"]],
    ["partnership officer", "Manages corporate, institutional and partner relationships.", ["partnerships:manage", "interactions:log", "persons:read"]],
    ["registrar/membership manager", "Screens applications, issues membership numbers and approves changes.",
        [...MEMBERSHIP_OFFICER, "applications:screen", "members:issue-number", "members:approve-changes", "work:reassign"]],
    ["membership committee", "Reviews forwarded applications and records decisions.", ["applications:review"]],
    ["management / governing council", "Sees dashboards, reports and the register summary.", ["reports:view", "members:view-register-summary"]],
    ["finance", "Tracks dues and fee payments.", ["payments:read", "payments:confirm-offline"]],
    ["system administrator", "Full system configuration, user management and audit-log access.", ALL_PERMISSIONS],
]

export interface MockRole {
    id: string
    title: string
    description: string | null
    permissions: string[]
}

export interface MockStaffUser {
    id: string
    firstName: string
    lastName: string
    email: string
    isActive: boolean
    roleId: string | null
    lastLoginAt: string | null
    createdAt: string
}

/** Can sign in (any password); their role and status come from the staff users list below. */
export const SIGN_IN_EMAILS = ["admin@iema.mock", "reader@iema.mock", "noaccess@iema.mock"]

// email, first, last, role, active, last sign-in (days ago), created (days ago)
const STAFF: [string, string, string, string, boolean, number | null, number][] = [
    ["admin@iema.mock", "Ada", "Admin", "system administrator", true, 0, 280],
    ["reader@iema.mock", "Remi", "Reader", "partnership officer", true, 7, 200],
    ["noaccess@iema.mock", "Nora", "Noaccess", "finance", true, 60, 190],
    ["tunde.bello@iema.mock", "Tunde", "Bello", "membership officer", true, 1, 170],
    ["halima.yusuf@iema.mock", "Halima", "Yusuf", "registrar/membership manager", true, 3, 160],
    ["obinna.okeke@iema.mock", "Obinna", "Okeke", "certification & training coordinator", true, 12, 150],
    ["bisi.coker@iema.mock", "Bisi", "Coker", "finance", true, 41, 120],
    ["aisha.garba@iema.mock", "Aisha", "Garba", "membership committee", true, 5, 110],
    ["segun.afolabi@iema.mock", "Segun", "Afolabi", "management / governing council", true, null, 60],
    ["emeka.nwosu@iema.mock", "Emeka", "Nwosu", "membership officer", false, 130, 300],
    ["ngozi.eze@iema.mock", "Ngozi", "Eze", "partnership officer", true, 2, 90],
    ["femi.ogunleye@iema.mock", "Femi", "Ogunleye", "membership officer", true, null, 2],
]

// Fictional people and organisations.
const PEOPLE: [string | null, string, string, string, string | null, string, string][] = [
    // title, first, last, job role, employer, sector, state
    ["Dr", "Chioma", "Okafor", "HSE Manager", "Lagoon Energy Ltd", "Oil & Gas", "Lagos"],
    ["Mr", "Tunde", "Bello", "Environmental Officer", "Savanna Cement Plc", "Manufacturing", "Ogun"],
    ["Mrs", "Kemi", "Adeyemi", "Sustainability Lead", "Northgate Bank", "Finance", "Lagos"],
    ["Engr", "Ibrahim", "Musa", "Process Engineer", "Lagoon Energy Ltd", "Oil & Gas", "Rivers"],
    ["Ms", "Ngozi", "Eze", "Lecturer", "University of Eastbridge", "Education", "Enugu"],
    [null, "Femi", "Ogunleye", "Graduate Trainee", null, "Consulting", "Oyo"],
    ["Prof", "Aisha", "Garba", "Head of Department", "University of Eastbridge", "Education", "Kaduna"],
    ["Mr", "Emeka", "Nwosu", "QHSE Coordinator", "Delta Marine Services", "Maritime", "Delta"],
    ["Miss", "Zainab", "Lawal", "Student", null, "Education", "Kano"],
    ["Mr", "Segun", "Afolabi", "Environmental Consultant", "GreenLeaf Advisory", "Consulting", "Lagos"],
    ["Mrs", "Halima", "Yusuf", "HR Manager", "Savanna Cement Plc", "Manufacturing", "Ogun"],
    ["Dr", "Obinna", "Okeke", "Research Fellow", "Institute of Climate Studies", "Research", "FCT"],
    ["Ms", "Bisi", "Coker", "Finance Officer", "Northgate Bank", "Finance", "Lagos"],
    ["Engr", "Yakubu", "Danjuma", "Plant Manager", "Savanna Cement Plc", "Manufacturing", "Niger"],
    ["Mr", "Chinedu", "Obi", "Auditor", "GreenLeaf Advisory", "Consulting", "Anambra"],
    ["Mrs", "Funke", "Akindele", "L&D Manager", "Lagoon Energy Ltd", "Oil & Gas", "Lagos"],
    [null, "Musa", "Abdullahi", "Field Technician", "Delta Marine Services", "Maritime", "Rivers"],
    ["Ms", "Ifeoma", "Chukwu", "Programme Officer", "Institute of Climate Studies", "Research", "FCT"],
    ["Mr", "Babatunde", "Ola", "Operations Director", "Delta Marine Services", "Maritime", "Lagos"],
    ["Dr", "Amina", "Sani", "Environmental Scientist", null, "Public sector", "Kano"],
    ["Mr", "Dayo", "Adewale", "Compliance Officer", "Northgate Bank", "Finance", "Lagos"],
    ["Mrs", "Uche", "Nnaji", "Sustainability Analyst", "GreenLeaf Advisory", "Consulting", "Enugu"],
    ["Miss", "Temi", "Fashola", "Student", null, "Education", "Lagos"],
    ["Engr", "Sadiq", "Bello", "Energy Auditor", "Lagoon Energy Ltd", "Oil & Gas", "Bayelsa"],
]

const QUALIFICATIONS = ["phd", "masters", "bachelors", "hnd", "pgd", "masters", "phd", "bachelors"]

// name, types, reference, sector, size, website, city, state
const ORGANISATIONS: [string, string[], string | null, string, string, string | null, string, string][] = [
    ["Lagoon Energy Ltd", ["corporate_member", "employer"], "RC 1045523", "Oil & Gas", "1000+", "https://lagoonenergy.example", "Victoria Island", "Lagos"],
    ["Savanna Cement Plc", ["corporate_member", "employer"], "RC 220871", "Manufacturing", "501-1000", "https://savannacement.example", "Abeokuta", "Ogun"],
    ["Northgate Bank", ["partner", "employer"], "RC 77812", "Finance", "1000+", "https://northgatebank.example", "Ikoyi", "Lagos"],
    ["University of Eastbridge", ["institutional_member"], "NUC/ACC/0412", "Education", "1000+", "https://eastbridge.example", "Nsukka", "Enugu"],
    ["Delta Marine Services", ["employer"], "RC 908114", "Maritime", "201-500", null, "Warri", "Delta"],
    ["GreenLeaf Advisory", ["partner", "employer"], "RC 1520077", "Consulting", "11-50", "https://greenleaf.example", "Lekki", "Lagos"],
    ["Institute of Climate Studies", ["institutional_member", "partner"], "NUC/ACC/0977", "Research", "51-200", "https://climatestudies.example", "Garki", "FCT"],
    ["Harmattan Logistics", ["corporate_member"], "RC 610032", "Logistics", "51-200", null, "Kano", "Kano"],
]

const daysAgo = (days: number) => new Date(Date.now() - days * 864e5).toISOString()
const dateOnly = (iso: string) => iso.slice(0, 10)

/** A one-page PDF reading "Sample document", for downloads. */
export const samplePdf = () => new Blob([
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 360 140]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
    "4 0 obj<</Length 52>>stream\nBT /F1 20 Tf 40 62 Td (Sample document) Tj ET\nendstream endobj\n" +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
], { type: "application/pdf" })

export interface MockDb {
    profiles: IProfile[]
    organisations: IOrganisation[]
    relationships: IRelationship[]
    affiliations: IAffiliation[]
    documents: (IProfileDocument & { profileId: string, blob: Blob | null })[]
    events: IEvent[]
    applications: IApplication[]
    roles: MockRole[]
    users: MockStaffUser[]
}

// status, grade, submitted (days ago), decided (days ago)
const APPLICATIONS: [string, string, number, number | null][] = [
    ["submitted", "graduate", 1, null], ["submitted", "associate", 2, null], ["submitted", "student", 3, null],
    ["screening", "full", 5, null], ["screening", "associate", 8, null], ["info_requested", "full", 12, null],
    ["info_requested", "graduate", 16, null], ["with_committee", "fellow", 20, null], ["with_committee", "full", 24, null],
    ["with_committee", "associate", 27, null], ["approved", "full", 40, 18], ["approved", "associate", 55, 30],
    ["approved", "student", 61, 44], ["approved", "graduate", 70, 52], ["approved", "fellow", 95, 60],
    ["rejected", "full", 48, 25], ["rejected", "associate", 88, 64], ["submitted", "full", 0, null],
]

// title, type, start (days from today), length in days, hours, mode, venue, capacity, member fee, non-member fee
const EVENTS: [string, string, number, number, [number, number], string, string | null, number | null, number, number][] = [
    ["Environmental Impact Assessment Foundations", "training_course", 12, 3, [9, 16], "in_person", "IEMA Training Centre, Victoria Island", 30, 150_000, 220_000],
    ["Annual Sustainability Conference 2026", "conference", 34, 2, [9, 18], "hybrid", "Eko Convention Hall, Lagos", 400, 75_000, 120_000],
    ["ISO 14001 Internal Auditor Workshop", "workshop", 5, 1, [10, 15], "online", null, 60, 40_000, 65_000],
    ["Climate Risk Disclosure Seminar", "seminar", 21, 1, [14, 17], "online", null, null, 0, 15_000],
    ["Excellence in Environmental Practice Awards", "award_ceremony", 58, 1, [18, 22], "in_person", "Transcorp Ballroom, Abuja", 250, 50_000, 50_000],
    ["Waste Management Regulations Update", "seminar", -9, 1, [10, 13], "online", null, 200, 0, 0],
    ["Lead Auditor Certification Course", "training_course", -40, 5, [9, 17], "in_person", "IEMA Training Centre, Victoria Island", 24, 350_000, 480_000],
    ["Carbon Accounting Masterclass", "workshop", 0, 2, [0, 23], "hybrid", "GreenLeaf Advisory, Lekki", 40, 90_000, 130_000],
    ["Northern Region Members' Seminar", "seminar", 75, 1, [10, 14], "in_person", "Kano Chamber of Commerce", 80, 0, 10_000],
    ["Young Professionals Awards Night", "award_ceremony", -120, 1, [18, 22], "in_person", "Landmark Centre, Lagos", 300, 25_000, 40_000],
]

const eventDate = (days: number, hour: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
}

export const createSeed = (): MockDb => {
    const organisations: IOrganisation[] = ORGANISATIONS.map(([name, types, ref, sector, size, website, city, state], i) => ({
        id: `org-${i + 1}`, name, types, registrationReference: ref, sector, size, website,
        addressLine1: `${10 + i * 7} Marina Road`, city, stateProvince: state, postalCode: null, country: "Nigeria",
        profileCount: 0, createdAt: daysAgo(400 - i * 30), updatedAt: daysAgo(20),
    }))

    const profiles: IProfile[] = PEOPLE.map(([title, firstName, lastName, jobRole, employer, sector, state], i) => ({
        id: `profile-${i + 1}`, title, firstName, lastName,
        email: `${firstName}.${lastName}`.toLowerCase() + "@example.com",
        mobile: i % 4 === 3 ? null : `+234 80${i % 10} ${String(1000000 + i * 7919).slice(0, 3)} ${String(1000 + i * 37).slice(0, 4)}`,
        employer, jobRole, sector, highestQualification: QUALIFICATIONS[i % QUALIFICATIONS.length]!,
        yearsOfExperience: jobRole === "Student" ? 0 : 2 + ((i * 5) % 22),
        stateProvince: state, country: "Nigeria", relationships: [],
        createdAt: daysAgo(300 - i * 11), updatedAt: daysAgo(10),
    }))

    const relationships: IRelationship[] = []
    const relate = (profileIndex: number, type: string, status: string, startDays: number, endDays: number | null = null) =>
        relationships.push({
            id: `rel-${relationships.length + 1}`, profileId: profiles[profileIndex]!.id, type, status,
            startDate: dateOnly(daysAgo(startDays)), endDate: endDays === null ? null : dateOnly(daysAgo(endDays)),
            notes: null, createdAt: daysAgo(startDays),
        })
    profiles.forEach((profile, i) => {
        if (profile.jobRole === "Student") relate(i, "student_member", "active", 120)
        else if (i % 3 !== 2) relate(i, "professional_member", i % 7 === 4 ? "lapsed" : "active", 500 - i * 9)
        if (i % 4 === 0) relate(i, "cpea_candidate", "active", 90 - i)
        if (i % 5 === 1) relate(i, "conference_attendee", "completed", 200, 198)
        if (i % 6 === 3) relate(i, "training_delegate", "pending", 30)
    })

    const affiliations: IAffiliation[] = []
    profiles.forEach((profile, i) => {
        const organisation = organisations.find((o) => o.name === profile.employer)
        if (!organisation) return
        const role =
            /HR|L&D/.test(profile.jobRole ?? "") ? "hr_ld_contact" :
            /Finance/.test(profile.jobRole ?? "") ? "finance_contact" :
            /Manager|Director|Head/.test(profile.jobRole ?? "") && i % 2 === 0 ? "nominated_representative" : "staff_member"
        affiliations.push({
            id: `aff-${affiliations.length + 1}`, role, since: dateOnly(daysAgo(700 - i * 13)),
            profile: { id: profile.id, title: profile.title, firstName: profile.firstName, lastName: profile.lastName, email: profile.email, mobile: profile.mobile },
            organisation: { id: organisation.id, name: organisation.name },
        })
    })

    const uploader = { id: "user-admin", name: "Ada Admin" }
    const documents: MockDb["documents"] = [
        { id: "doc-1", profileId: "profile-1", type: "cv", fileName: "Chioma-Okafor-CV.pdf", contentType: "application/pdf", size: 184_320, uploadedBy: uploader, createdAt: daysAgo(40), blob: samplePdf() },
        { id: "doc-2", profileId: "profile-1", type: "degree_certificate", fileName: "PhD-Certificate.pdf", contentType: "application/pdf", size: 1_248_000, uploadedBy: uploader, createdAt: daysAgo(39), blob: samplePdf() },
    ]

    const events: IEvent[] = EVENTS.map(([title, type, startDays, lengthDays, [startHour, endHour], mode, venue, capacity, memberFee, nonMemberFee], i) => ({
        id: `event-${i + 1}`, title, type,
        description: `${title}, run by IEMA for members and the wider environmental profession.`,
        startsAt: eventDate(startDays, startHour), endsAt: eventDate(startDays + lengthDays - 1, endHour),
        deliveryMode: mode, venueName: venue, venueAddress: null,
        onlineLink: mode === "in_person" ? null : `https://meet.example/iema-${i + 1}`,
        capacity, memberFee, nonMemberFee,
        createdAt: daysAgo(90 - i * 7), updatedAt: daysAgo(5),
    }))

    const applications: IApplication[] = APPLICATIONS.map(([status, grade, submittedDays, decidedDays], i) => {
        const profile = profiles[(i * 5) % profiles.length]!
        return {
            id: `application-${i + 1}`,
            reference: `APP-2026-${String(41 + i).padStart(4, "0")}`,
            grade, status,
            applicant: { id: profile.id, title: profile.title, firstName: profile.firstName, lastName: profile.lastName, email: profile.email, mobile: profile.mobile },
            submittedAt: daysAgo(submittedDays + 0.3),
            updatedAt: daysAgo(decidedDays ?? Math.max(0, submittedDays - 2)),
            decidedAt: decidedDays === null ? null : daysAgo(decidedDays),
        }
    })

    const roles: MockRole[] = ROLE_PERMISSIONS.map(([title, description, permissions]) => ({ id: `role-${title}`, title, description, permissions: [...permissions] }))
    const users: MockStaffUser[] = STAFF.map(([email, firstName, lastName, role, isActive, lastLoginDays, createdDays]) => ({
        id: `user-${email.split("@")[0]}`, firstName, lastName, email, isActive, roleId: `role-${role}`,
        lastLoginAt: lastLoginDays === null ? null : daysAgo(lastLoginDays), createdAt: daysAgo(createdDays),
    }))

    return { profiles, organisations, relationships, affiliations, documents, events, applications, roles, users }
}
