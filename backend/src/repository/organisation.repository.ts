import { col, fn, literal, Op, UniqueConstraintError, type WhereOptions } from "sequelize";
import {
    duplicateOrganisationError,
    ORGANISATION_TYPES,
    registrationKey,
    type CreateOrganisationInput,
    type Organisation,
    type OrganisationDuplicate,
    type OrganisationKeys,
    type OrganisationListFilter,
    type OrganisationRepository,
    type OrganisationType,
} from "../domain/organisation";
import type { Page, PageRequest } from "../domain/pagination";
import { OrganisationModel, OrganisationTypeModel } from "../models";
import { escapeLike } from "./sql";

const TYPES_INCLUDE = { model: OrganisationTypeModel, as: "typeRows", attributes: ["type"] };

const typeOrder = (type: OrganisationType) => ORGANISATION_TYPES.indexOf(type);

const toOrganisation = (model: OrganisationModel): Organisation => ({
    id: model.id,
    name: model.name,
    types: (model.typeRows ?? []).map((row) => row.type).sort((a, b) => typeOrder(a) - typeOrder(b)),
    registrationReference: model.registrationReference,
    email: model.email,
    phone: model.phone,
    sector: model.sector,
    size: model.size,
    website: model.website,
    addressLine1: model.addressLine1,
    city: model.city,
    stateProvince: model.stateProvince,
    postalCode: model.postalCode,
    country: model.country,
    // TODO: count linked profiles once profiles reference organisations.
    profileCount: 0,
    createdById: model.createdById ?? null,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
});

export class SequelizeOrganisationRepository implements OrganisationRepository {
    async findById(id: string): Promise<Organisation | null> {
        const model = await OrganisationModel.findByPk(id, { include: [TYPES_INCLUDE] });
        return model ? toOrganisation(model) : null;
    }

    async findDuplicate(keys: OrganisationKeys): Promise<OrganisationDuplicate | null> {
        const clauses: WhereOptions<OrganisationModel>[] = [{ nameKey: keys.nameKey }];
        if (keys.registrationKey) clauses.push({ registrationKey: keys.registrationKey });

        const matches = await OrganisationModel.findAll({
            attributes: ["id", "nameKey", "registrationKey"],
            where: { [Op.or]: clauses },
        });
        // A clashing registration reference is the stronger signal, so report it first.
        const byReference = keys.registrationKey ? matches.find((m) => m.registrationKey === keys.registrationKey) : undefined;
        if (byReference) return { id: byReference.id, field: "registrationReference" };
        const byName = matches.find((m) => m.nameKey === keys.nameKey);
        return byName ? { id: byName.id, field: "name" } : null;
    }

    async create(input: CreateOrganisationInput, keys: OrganisationKeys): Promise<Organisation> {
        const { types, ...fields } = input;
        let id: string;
        try {
            id = await OrganisationModel.sequelize!.transaction(async (transaction) => {
                const created = await OrganisationModel.create({ ...fields, ...keys }, { transaction });
                await OrganisationTypeModel.bulkCreate(
                    types.map((type) => ({ organisationId: created.id, type })),
                    { transaction },
                );
                return created.id;
            });
        } catch (err) {
            // Lost a race with a concurrent create: the unique indexes are the source of truth.
            if (err instanceof UniqueConstraintError) {
                const duplicate = await this.findDuplicate(keys);
                if (duplicate) throw duplicateOrganisationError(duplicate);
            }
            throw err;
        }
        const organisation = await this.findById(id);
        if (!organisation) {
            throw new Error(`organisation ${id} disappeared immediately after creation`);
        }
        return organisation;
    }

    async list(filter: OrganisationListFilter, { limit, offset }: PageRequest): Promise<Page<Organisation>> {
        const conditions: WhereOptions[] = [];
        if (filter.search) {
            const pattern = { [Op.like]: `%${escapeLike(filter.search)}%` };
            const searchClauses: WhereOptions[] = [{ name: pattern }, { registrationReference: pattern }, { website: pattern }];
            // "rc123456" should find "RC 123456".
            const referenceKey = registrationKey(filter.search);
            if (referenceKey) searchClauses.push({ registrationKey: { [Op.like]: `%${referenceKey}%` } });
            conditions.push({ [Op.or]: searchClauses });
        }
        if (filter.sector) conditions.push({ sector: filter.sector });
        if (filter.size) conditions.push({ size: filter.size });
        if (filter.type) {
            // Filter on a subquery so the returned organisations still carry all of their types.
            const escaped = OrganisationModel.sequelize!.escape(filter.type);
            conditions.push({
                id: { [Op.in]: literal(`(SELECT organisationId FROM organisation_types WHERE type = ${escaped})`) },
            });
        }

        const { rows, count } = await OrganisationModel.findAndCountAll({
            where: { [Op.and]: conditions },
            include: [TYPES_INCLUDE],
            order: [["name", "ASC"], ["id", "ASC"]],
            limit,
            offset,
            // The types join returns one row per type; count organisations.
            distinct: true,
            col: "id",
        });
        return { items: rows.map(toOrganisation), total: count };
    }

    async countByType(): Promise<{ total: number; byType: Record<OrganisationType, number> }> {
        const [total, rows] = await Promise.all([
            OrganisationModel.count(),
            OrganisationTypeModel.findAll({
                attributes: ["type", [fn("COUNT", col("organisationId")), "count"]],
                group: ["type"],
                raw: true,
            }) as unknown as Promise<{ type: OrganisationType; count: number | string }[]>,
        ]);
        const byType = Object.fromEntries(ORGANISATION_TYPES.map((t) => [t, 0])) as Record<OrganisationType, number>;
        for (const row of rows) byType[row.type] = Number(row.count);
        return { total, byType };
    }
}
