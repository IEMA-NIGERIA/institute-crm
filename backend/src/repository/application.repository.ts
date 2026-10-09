import { col, fn, Op, where, type WhereOptions } from "sequelize";
import {
    APPLICATION_STATUSES,
    type Application,
    type ApplicationListFilter,
    type ApplicationRepository,
    type ApplicationStatus,
} from "../domain/application";
import type { Page, PageRequest } from "../domain/pagination";
import { ApplicationModel, ProfileModel } from "../models";
import { escapeLike } from "./sql";

const APPLICANT_INCLUDE = {
    model: ProfileModel,
    as: "applicant",
    attributes: ["id", "title", "firstName", "lastName", "email", "mobile"],
    required: true,
};

const toApplication = (model: ApplicationModel): Application => {
    const applicant = model.applicant!;
    return {
        id: model.id,
        reference: model.reference,
        grade: model.grade,
        status: model.status,
        applicant: {
            id: applicant.id,
            title: applicant.title,
            firstName: applicant.firstName,
            lastName: applicant.lastName,
            email: applicant.email,
            mobile: applicant.mobile,
        },
        submittedAt: model.submittedAt,
        updatedAt: model.updatedAt,
        decidedAt: model.decidedAt ?? null,
    };
};

export class SequelizeApplicationRepository implements ApplicationRepository {
    async list(filter: ApplicationListFilter, { limit, offset }: PageRequest): Promise<Page<Application>> {
        const conditions: WhereOptions[] = [];
        if (filter.statuses) {
            conditions.push({ status: { [Op.in]: [...filter.statuses] } });
        }
        if (filter.grade) {
            conditions.push({ grade: filter.grade });
        }
        if (filter.search) {
            const pattern = { [Op.like]: `%${escapeLike(filter.search)}%` };
            conditions.push({
                [Op.or]: [
                    { reference: pattern },
                    { "$applicant.firstName$": pattern },
                    { "$applicant.lastName$": pattern },
                    { "$applicant.email$": pattern },
                    where(fn("CONCAT", col("applicant.firstName"), " ", col("applicant.lastName")), pattern),
                ],
            });
        }

        const { rows, count } = await ApplicationModel.findAndCountAll({
            where: { [Op.and]: conditions },
            include: [APPLICANT_INCLUDE],
            order: [["submittedAt", "DESC"], ["id", "ASC"]],
            limit,
            offset,
            // One applicant per application, so a flat join is safe and lets the search
            // filter on applicant columns while paginating.
            subQuery: false,
        });
        return { items: rows.map(toApplication), total: count };
    }

    async countByStatus(statuses?: readonly ApplicationStatus[]): Promise<Record<ApplicationStatus, number>> {
        const rows = (await ApplicationModel.findAll({
            attributes: ["status", [fn("COUNT", col("id")), "count"]],
            ...(statuses ? { where: { status: { [Op.in]: [...statuses] } } } : {}),
            group: ["status"],
            raw: true,
        })) as unknown as { status: ApplicationStatus; count: number | string }[];

        const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
        for (const row of rows) counts[row.status] = Number(row.count);
        return counts;
    }
}
