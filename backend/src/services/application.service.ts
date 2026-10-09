import {
    AWAITING_SCREENING_STATUSES,
    COMMITTEE_STATUSES,
    type Application,
    type ApplicationListFilter,
    type ApplicationMetrics,
    type ApplicationRepository,
    type ApplicationStatus,
} from "../domain/application";
import type { Page } from "../domain/pagination";
import { PERMISSIONS } from "../domain/permissions";
import type { AuthPrincipal } from "../domain/user";
import type { IListApplications } from "../dto/application";
import { ForbiddenError } from "../errors/app-error";

export class ApplicationService {
    constructor(private readonly applications: ApplicationRepository) {}

    list({ search, status, grade, page, pageSize }: IListApplications, principal: AuthPrincipal): Promise<Page<Application>> {
        const visible = this.visibleStatuses(principal);
        const filter: ApplicationListFilter = {};
        if (search) filter.search = search;
        if (grade) filter.grade = grade;
        if (status) {
            // A status outside the caller's scope simply matches nothing.
            filter.statuses = visible ? visible.filter((s) => s === status) : [status];
        } else if (visible) {
            filter.statuses = visible;
        }
        return this.applications.list(filter, { limit: pageSize, offset: (page - 1) * pageSize });
    }

    async metrics(principal: AuthPrincipal): Promise<ApplicationMetrics> {
        const counts = await this.applications.countByStatus(this.visibleStatuses(principal));
        const sum = (statuses: readonly ApplicationStatus[]) => statuses.reduce((total, s) => total + counts[s], 0);
        return {
            total: Object.values(counts).reduce((a, b) => a + b, 0),
            awaitingScreening: sum(AWAITING_SCREENING_STATUSES),
            withCommittee: counts.with_committee,
            approved: counts.approved,
            rejected: counts.rejected,
        };
    }

    /**
     * Staff with `applications:read` see everything. The Membership Committee (`applications:review`
     * only) sees just the applications forwarded to it, and the decisions made on them.
     * Returns undefined for "no restriction".
     */
    private visibleStatuses(principal: AuthPrincipal): readonly ApplicationStatus[] | undefined {
        if (principal.permissions.has(PERMISSIONS.APPLICATIONS_READ)) return undefined;
        if (principal.permissions.has(PERMISSIONS.APPLICATIONS_REVIEW)) return COMMITTEE_STATUSES;
        throw new ForbiddenError();
    }
}
