import { DuplicateResourceError } from "../errors/app-error";
import type { Page, PageRequest } from "./pagination";

export const ORGANISATION_TYPES = ["corporate_member", "institutional_member", "partner", "employer"] as const;
export type OrganisationType = (typeof ORGANISATION_TYPES)[number];

export const ORGANISATION_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;
export type OrganisationSize = (typeof ORGANISATION_SIZES)[number];

/** Types for which an RC number / accreditation reference is mandatory. */
export const REGISTRATION_REQUIRED_TYPES: readonly OrganisationType[] = ["corporate_member", "institutional_member"];

export interface Organisation {
    id: string;
    name: string;
    types: OrganisationType[];
    /** RC number for companies, accreditation reference for institutions. */
    registrationReference: string | null;
    email: string | null;
    phone: string | null;
    sector: string | null;
    size: OrganisationSize | null;
    website: string | null;
    addressLine1: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
    country: string | null;
    /** Profiles linked to this organisation (0 until profiles reference organisations). */
    profileCount: number;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateOrganisationInput = Omit<Organisation, "id" | "profileCount" | "createdAt" | "updatedAt">;

export interface OrganisationListFilter {
    /** Matched against name, registration reference and website. */
    search?: string;
    type?: OrganisationType;
    sector?: string;
    size?: OrganisationSize;
}

export interface OrganisationMetrics {
    total: number;
    corporateMembers: number;
    institutionalMembers: number;
    partners: number;
    employers: number;
}

/** Normalised keys used to detect duplicates; both are unique in the database. */
export interface OrganisationKeys {
    nameKey: string;
    registrationKey: string | null;
}

export interface OrganisationRepository {
    findById(id: string): Promise<Organisation | null>;
    /** The existing organisation that clashes with these keys, and on which field. */
    findDuplicate(keys: OrganisationKeys): Promise<OrganisationDuplicate | null>;
    /** Throws DuplicateResourceError if a unique key is already taken (including under a race). */
    create(input: CreateOrganisationInput, keys: OrganisationKeys): Promise<Organisation>;
    /** Ordered by name. */
    list(filter: OrganisationListFilter, page: PageRequest): Promise<Page<Organisation>>;
    /** Organisations holding each type (an organisation can hold several). */
    countByType(): Promise<{ total: number; byType: Record<OrganisationType, number> }>;
}

// ---- Duplicate detection -------------------------------------------------------------------

// Equivalent legal suffixes collapse to one form so "Shell Limited" and "Shell Ltd" clash.
const LEGAL_FORMS: [RegExp, string][] = [
    [/\bpublic limited company\b/g, "plc"],
    [/\blimited liability partnership\b/g, "llp"],
    [/\blimited\b/g, "ltd"],
    [/\bincorporated\b/g, "inc"],
    [/\bcompany\b/g, "co"],
];

/** "Dangote Cement PLC." → "dangote cement plc"; "Shell Nigeria Limited" → "shell nigeria ltd". */
export const organisationNameKey = (name: string): string => {
    let key = name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "") // strip accents
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ");
    for (const [pattern, replacement] of LEGAL_FORMS) key = key.replace(pattern, replacement);
    return key.replace(/\s+/g, " ").trim();
};

// CAC registration numbers: RC (companies), BN (business names), IT (incorporated trustees),
// LP / LLP (partnerships), followed by up to 8 digits. A bare number is treated as an RC number.
const CAC_NUMBER = /^(RC|BN|IT|LLP|LP)?[\s./-]*(\d{1,8})$/i;
// Accreditation references vary by body (e.g. "NUC/ACC/2019/045"): letters, digits and separators.
const ACCREDITATION_REFERENCE = /^(?=.*[A-Za-z0-9])[A-Za-z0-9 ./-]{2,50}$/;

/** Canonical display form of a CAC number ("rc-0123456" → "RC 0123456"), or null if malformed. */
export const formatCacNumber = (input: string): string | null => {
    const match = CAC_NUMBER.exec(input.trim());
    if (!match) return null;
    return `${(match[1] ?? "RC").toUpperCase()} ${match[2]}`;
};

export const isAccreditationReference = (input: string): boolean => ACCREDITATION_REFERENCE.test(input.trim());

/** Uppercase letters and digits only, so formatting differences never hide a duplicate. */
export const registrationKey = (reference: string): string => reference.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const organisationKeys = (name: string, registrationReference: string | null): OrganisationKeys => ({
    nameKey: organisationNameKey(name),
    registrationKey: registrationReference ? registrationKey(registrationReference) : null,
});

export interface OrganisationDuplicate {
    id: string;
    field: "name" | "registrationReference";
}

export const duplicateOrganisationError = ({ id, field }: OrganisationDuplicate) =>
    new DuplicateResourceError("Organisation", id, field, field === "name" ? "name" : "registration reference");
