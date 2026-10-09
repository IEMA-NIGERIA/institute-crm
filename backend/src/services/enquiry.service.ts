import type { Enquiry, EnquiryMetrics, EnquiryRepository, Page, UpdateEnquiryInput } from "../domain/enquiry";
import type { UserRepository } from "../domain/user";
import type { ICreateEnquiry, IListEnquiries, IUpdateEnquiry } from "../dto/enquiry";
import { NotFoundError, ValidationError } from "../errors/app-error";

export class EnquiryService {
    constructor(
        private readonly enquiries: EnquiryRepository,
        private readonly users: UserRepository,
    ) {}

    async getById(id: string): Promise<Enquiry> {
        const enquiry = await this.enquiries.findById(id);
        if (!enquiry) {
            throw new NotFoundError("enquiry");
        }
        return enquiry;
    }

    list({ page, pageSize, ...filter }: IListEnquiries): Promise<Page<Enquiry>> {
        return this.enquiries.list(filter, { limit: pageSize, offset: (page - 1) * pageSize });
    }

    create(input: ICreateEnquiry, createdById: string): Promise<Enquiry> {
        return this.enquiries.create({
            ...input,
            createdById,
            assignedToId: null,
            assignmentStatus: "unassigned",
            responseTag: null,
            pipelineStage: null,
            closingRemark: null,
        });
    }

    async update(id: string, input: IUpdateEnquiry): Promise<Enquiry> {
        const enquiry = await this.enquiries.findById(id);
        if (!enquiry) throw new NotFoundError("enquiry");

        const patch: UpdateEnquiryInput = {};

        if (input.assignedToId !== undefined) {
            if (input.assignedToId !== null) {
                const user = await this.users.findById(input.assignedToId);
                if (!user) throw new ValidationError([{ path: "assignedToId", message: "user not found" }]);
            }
            patch.assignedToId = input.assignedToId;
            // Auto-promote from unassigned to assigned when a user is assigned.
            if (input.assignedToId !== null && enquiry.assignmentStatus === "unassigned") {
                patch.assignmentStatus = "assigned";
            }
            // Clear assignment status back to unassigned when un-assigning.
            if (input.assignedToId === null && enquiry.assignmentStatus === "assigned") {
                patch.assignmentStatus = "unassigned";
            }
        }

        if (input.assignmentStatus !== undefined) {
            if (input.assignmentStatus === "closed") {
                const remark = input.closingRemark ?? enquiry.closingRemark;
                if (!remark) {
                    throw new ValidationError([{ path: "closingRemark", message: "a remark is required to close an enquiry" }]);
                }
                patch.closingRemark = input.closingRemark ?? enquiry.closingRemark;
            }
            patch.assignmentStatus = input.assignmentStatus;
        }

        if (input.responseTag !== undefined) patch.responseTag = input.responseTag;
        if (input.pipelineStage !== undefined) patch.pipelineStage = input.pipelineStage;
        if (input.closingRemark !== undefined && patch.closingRemark === undefined) patch.closingRemark = input.closingRemark;

        return this.enquiries.update(id, patch);
    }

    metrics(): Promise<EnquiryMetrics> {
        return this.enquiries.countByStatus();
    }
}
