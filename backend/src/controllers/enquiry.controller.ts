import type { Request, Response } from "express";
import type { Enquiry } from "../domain/enquiry";
import { createEnquirySchema, listEnquiriesSchema, updateEnquirySchema } from "../dto/enquiry";
import { idParamSchema } from "../dto/user";
import { getPrincipal } from "../middleware/authorize_user";
import { parseInput } from "../middleware/error-handler";
import type { EnquiryService } from "../services/enquiry.service";

export const toEnquiryResponse = (enquiry: Enquiry) => ({
    id: enquiry.id,
    enquirerType: enquiry.enquirerType,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    employer: enquiry.employer,
    sector: enquiry.sector,
    addressLine1: enquiry.addressLine1,
    city: enquiry.city,
    stateProvince: enquiry.stateProvince,
    postalCode: enquiry.postalCode,
    country: enquiry.country,
    interestType: enquiry.interestType,
    source: enquiry.source,
    estimatedValue: enquiry.estimatedValue,
    assignedToId: enquiry.assignedToId,
    assignedTo: enquiry.assignedTo,
    assignmentStatus: enquiry.assignmentStatus,
    responseTag: enquiry.responseTag,
    pipelineStage: enquiry.pipelineStage,
    closingRemark: enquiry.closingRemark,
    createdById: enquiry.createdById,
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt.toISOString(),
});

export class EnquiryController {
    constructor(private readonly enquiryService: EnquiryService) {}

    list = async (req: Request, res: Response): Promise<void> => {
        const query = parseInput(listEnquiriesSchema, req.query);
        const { items, total } = await this.enquiryService.list(query);
        res.json({ enquiries: items.map(toEnquiryResponse), page: query.page, pageSize: query.pageSize, total });
    };

    metrics = async (_req: Request, res: Response): Promise<void> => {
        const metrics = await this.enquiryService.metrics();
        res.json(metrics);
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        const { id } = parseInput(idParamSchema, req.params);
        const enquiry = await this.enquiryService.getById(id);
        res.json({ enquiry: toEnquiryResponse(enquiry) });
    };

    create = async (req: Request, res: Response): Promise<void> => {
        const input = parseInput(createEnquirySchema, req.body);
        const enquiry = await this.enquiryService.create(input, getPrincipal(req).userId);
        res.status(201).location(`${req.baseUrl}/${enquiry.id}`).json({ enquiry: toEnquiryResponse(enquiry) });
    };

    update = async (req: Request, res: Response): Promise<void> => {
        const { id } = parseInput(idParamSchema, req.params);
        const input = parseInput(updateEnquirySchema, req.body);
        const enquiry = await this.enquiryService.update(id, input);
        res.json({ enquiry: toEnquiryResponse(enquiry) });
    };
}
