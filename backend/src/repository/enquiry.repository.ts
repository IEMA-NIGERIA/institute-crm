import { fn, col, Op, type IncludeOptions, type WhereOptions } from "sequelize";
import type {
    CreateEnquiryInput,
    Enquiry,
    EnquiryListFilter,
    EnquiryMetrics,
    EnquiryRepository,
    Page,
    UpdateEnquiryInput,
} from "../domain/enquiry";
import { ASSIGNMENT_STATUSES, type AssignmentStatus } from "../domain/enquiry";
import type { PageRequest } from "../domain/pagination";
import { EnquiryModel, UserModel } from "../models";
import { escapeLike } from "./sql";

const ASSIGNED_TO_INCLUDE: IncludeOptions = {
    model: UserModel,
    as: "assignedTo",
    attributes: ["id", "firstName", "lastName"],
    required: false,
};

const toEnquiry = (model: EnquiryModel): Enquiry => {
    const assignedUser = model.assignedTo;
    return {
        id: model.id,
        enquirerType: model.enquirerType,
        name: model.name,
        email: model.email,
        phone: model.phone,
        employer: model.employer,
        sector: model.sector,
        addressLine1: model.addressLine1,
        city: model.city,
        stateProvince: model.stateProvince,
        postalCode: model.postalCode,
        country: model.country,
        interestType: model.interestType,
        source: model.source,
        estimatedValue: model.estimatedValue === null ? null : Number(model.estimatedValue),
        assignedToId: model.assignedToId ?? null,
        assignedTo: assignedUser
            ? { id: assignedUser.id, firstName: assignedUser.firstName, lastName: assignedUser.lastName }
            : null,
        assignmentStatus: model.assignmentStatus,
        responseTag: model.responseTag,
        pipelineStage: model.pipelineStage,
        closingRemark: model.closingRemark,
        createdById: model.createdById ?? null,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
    };
};

export class SequelizeEnquiryRepository implements EnquiryRepository {
    async findById(id: string): Promise<Enquiry | null> {
        const model = await EnquiryModel.findByPk(id, { include: [ASSIGNED_TO_INCLUDE] });
        return model ? toEnquiry(model) : null;
    }

    async list(filter: EnquiryListFilter, { limit, offset }: PageRequest): Promise<Page<Enquiry>> {
        const conditions: WhereOptions[] = [];
        if (filter.search) {
            const pattern = `%${escapeLike(filter.search)}%`;
            conditions.push({ [Op.or]: [{ name: { [Op.like]: pattern } }, { email: { [Op.like]: pattern } }] });
        }
        if (filter.assignmentStatus) conditions.push({ assignmentStatus: filter.assignmentStatus });
        if (filter.pipelineStage) conditions.push({ pipelineStage: filter.pipelineStage });
        if (filter.responseTag) conditions.push({ responseTag: filter.responseTag });

        const { rows, count } = await EnquiryModel.findAndCountAll({
            where: { [Op.and]: conditions },
            include: [ASSIGNED_TO_INCLUDE],
            order: [["createdAt", "DESC"], ["id", "ASC"]],
            limit,
            offset,
        });
        return { items: rows.map(toEnquiry), total: count };
    }

    async create(input: CreateEnquiryInput): Promise<Enquiry> {
        const created = await EnquiryModel.create(input);
        const enquiry = await this.findById(created.id);
        if (!enquiry) {
            throw new Error(`enquiry ${created.id} disappeared immediately after creation`);
        }
        return enquiry;
    }

    async update(id: string, input: UpdateEnquiryInput): Promise<Enquiry> {
        await EnquiryModel.update(input, { where: { id } });
        const enquiry = await this.findById(id);
        if (!enquiry) {
            throw new Error(`enquiry ${id} disappeared during update`);
        }
        return enquiry;
    }

    async countByStatus(): Promise<EnquiryMetrics> {
        const rows = await EnquiryModel.findAll({
            attributes: ["assignmentStatus", [fn("COUNT", col("id")), "count"]],
            group: ["assignmentStatus"],
            raw: true,
        }) as unknown as { assignmentStatus: AssignmentStatus; count: number | string }[];

        const counts = Object.fromEntries(ASSIGNMENT_STATUSES.map((s) => [s, 0])) as Record<AssignmentStatus, number>;
        let total = 0;
        for (const row of rows) {
            counts[row.assignmentStatus] = Number(row.count);
            total += Number(row.count);
        }
        return { total, ...counts };
    }
}
