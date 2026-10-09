import type { Request, Response } from "express";
import type { Organisation } from "../domain/organisation";
import { createOrganisationSchema, listOrganisationsSchema } from "../dto/organisation";
import { idParamSchema } from "../dto/user";
import { getPrincipal } from "../middleware/authorize_user";
import { parseInput } from "../middleware/error-handler";
import type { OrganisationService } from "../services/organisation.service";

export const toOrganisationResponse = (organisation: Organisation) => ({
    id: organisation.id,
    name: organisation.name,
    types: organisation.types,
    registrationReference: organisation.registrationReference,
    email: organisation.email,
    phone: organisation.phone,
    sector: organisation.sector,
    size: organisation.size,
    website: organisation.website,
    addressLine1: organisation.addressLine1,
    city: organisation.city,
    stateProvince: organisation.stateProvince,
    postalCode: organisation.postalCode,
    country: organisation.country,
    profileCount: organisation.profileCount,
    createdAt: organisation.createdAt.toISOString(),
    updatedAt: organisation.updatedAt.toISOString(),
});

export class OrganisationController {
    constructor(private readonly organisationService: OrganisationService) {}

    list = async (req: Request, res: Response): Promise<void> => {
        const query = parseInput(listOrganisationsSchema, req.query);
        const { items, total } = await this.organisationService.list(query);
        res.json({ items: items.map(toOrganisationResponse), total, page: query.page, pageSize: query.pageSize });
    };

    metrics = async (_req: Request, res: Response): Promise<void> => {
        res.json(await this.organisationService.metrics());
    };

    create = async (req: Request, res: Response): Promise<void> => {
        const input = parseInput(createOrganisationSchema, req.body);
        const organisation = await this.organisationService.create(input, getPrincipal(req).userId);
        res.status(201)
            .location(`${req.baseUrl}/${organisation.id}`)
            .json({ organisation: toOrganisationResponse(organisation) });
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        const { id } = parseInput(idParamSchema, req.params);
        const organisation = await this.organisationService.getById(id);
        res.json({ organisation: toOrganisationResponse(organisation) });
    };
}
