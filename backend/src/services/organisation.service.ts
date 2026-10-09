import {
    duplicateOrganisationError,
    organisationKeys,
    type Organisation,
    type OrganisationListFilter,
    type OrganisationMetrics,
    type OrganisationRepository,
} from "../domain/organisation";
import type { Page } from "../domain/pagination";
import type { ICreateOrganisation, IListOrganisations } from "../dto/organisation";
import { NotFoundError } from "../errors/app-error";

export class OrganisationService {
    constructor(private readonly organisations: OrganisationRepository) {}

    async create(input: ICreateOrganisation, createdById: string): Promise<Organisation> {
        const keys = organisationKeys(input.name, input.registrationReference);
        // Friendly early answer; the repository still relies on the unique indexes under races.
        const duplicate = await this.organisations.findDuplicate(keys);
        if (duplicate) throw duplicateOrganisationError(duplicate);
        return this.organisations.create({ ...input, createdById }, keys);
    }

    async getById(id: string): Promise<Organisation> {
        const organisation = await this.organisations.findById(id);
        if (!organisation) throw new NotFoundError("organisation");
        return organisation;
    }

    list({ search, type, sector, size, page, pageSize }: IListOrganisations): Promise<Page<Organisation>> {
        const filter: OrganisationListFilter = {};
        if (search) filter.search = search;
        if (type) filter.type = type;
        if (sector) filter.sector = sector;
        if (size) filter.size = size;
        return this.organisations.list(filter, { limit: pageSize, offset: (page - 1) * pageSize });
    }

    async metrics(): Promise<OrganisationMetrics> {
        const { total, byType } = await this.organisations.countByType();
        return {
            total,
            corporateMembers: byType.corporate_member,
            institutionalMembers: byType.institutional_member,
            partners: byType.partner,
            employers: byType.employer,
        };
    }
}
