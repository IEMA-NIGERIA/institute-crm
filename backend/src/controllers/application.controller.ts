import type { Request, Response } from "express";
import type { Application } from "../domain/application";
import { listApplicationsSchema } from "../dto/application";
import { getPrincipal } from "../middleware/authorize_user";
import { parseInput } from "../middleware/error-handler";
import type { ApplicationService } from "../services/application.service";

export const toApplicationResponse = (application: Application) => ({
    id: application.id,
    reference: application.reference,
    grade: application.grade,
    status: application.status,
    applicant: application.applicant,
    submittedAt: application.submittedAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    decidedAt: application.decidedAt?.toISOString() ?? null,
});

export class ApplicationController {
    constructor(private readonly applicationService: ApplicationService) {}

    list = async (req: Request, res: Response): Promise<void> => {
        const query = parseInput(listApplicationsSchema, req.query);
        const { items, total } = await this.applicationService.list(query, getPrincipal(req));
        res.json({ items: items.map(toApplicationResponse), total, page: query.page, pageSize: query.pageSize });
    };

    metrics = async (req: Request, res: Response): Promise<void> => {
        res.json(await this.applicationService.metrics(getPrincipal(req)));
    };
}
