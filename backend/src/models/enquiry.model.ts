import {
    DataTypes,
    Model,
    type CreationOptional,
    type ForeignKey,
    type InferAttributes,
    type InferCreationAttributes,
    type NonAttribute,
    type Sequelize,
} from "sequelize";
import {
    ASSIGNMENT_STATUSES,
    ENQUIRER_TYPES,
    ENQUIRY_SOURCES,
    INTEREST_TYPES,
    PIPELINE_STAGES,
    RESPONSE_TAGS,
    type AssignmentStatus,
    type EnquirerType,
    type EnquirySource,
    type InterestType,
    type PipelineStage,
    type ResponseTag,
} from "../domain/enquiry";
import type { UserModel } from "./user.model";

export class EnquiryModel extends Model<InferAttributes<EnquiryModel>, InferCreationAttributes<EnquiryModel>> {
    declare id: CreationOptional<string>;
    declare enquirerType: EnquirerType;
    declare name: string;
    declare email: string | null;
    declare phone: string | null;
    declare employer: string | null;
    declare sector: string | null;
    declare addressLine1: string | null;
    declare city: string | null;
    declare stateProvince: string | null;
    declare postalCode: string | null;
    declare country: string | null;
    declare interestType: InterestType;
    declare source: EnquirySource;
    // mysql2 returns DECIMAL columns as strings to avoid precision loss.
    declare estimatedValue: string | number | null;
    declare assignedToId: ForeignKey<UserModel["id"]> | null;
    declare assignmentStatus: CreationOptional<AssignmentStatus>;
    declare responseTag: ResponseTag | null;
    declare pipelineStage: PipelineStage | null;
    declare closingRemark: string | null;
    declare createdById: ForeignKey<UserModel["id"]> | null;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare assignedTo?: NonAttribute<UserModel | null>;
}

export const initEnquiryModel = (sequelize: Sequelize): void => {
    EnquiryModel.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            enquirerType: { type: DataTypes.ENUM(...ENQUIRER_TYPES), allowNull: false },
            name: { type: DataTypes.STRING(200), allowNull: false },
            email: { type: DataTypes.STRING(255), allowNull: true },
            phone: { type: DataTypes.STRING(30), allowNull: true },
            employer: { type: DataTypes.STRING(200), allowNull: true },
            sector: { type: DataTypes.STRING(100), allowNull: true },
            addressLine1: { type: DataTypes.STRING(255), allowNull: true },
            city: { type: DataTypes.STRING(100), allowNull: true },
            stateProvince: { type: DataTypes.STRING(100), allowNull: true },
            postalCode: { type: DataTypes.STRING(20), allowNull: true },
            country: { type: DataTypes.STRING(100), allowNull: true },
            interestType: { type: DataTypes.ENUM(...INTEREST_TYPES), allowNull: false },
            source: { type: DataTypes.ENUM(...ENQUIRY_SOURCES), allowNull: false },
            estimatedValue: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
            assignedToId: { type: DataTypes.UUID, allowNull: true },
            assignmentStatus: { type: DataTypes.ENUM(...ASSIGNMENT_STATUSES), allowNull: false, defaultValue: "unassigned" },
            responseTag: { type: DataTypes.ENUM(...RESPONSE_TAGS), allowNull: true },
            pipelineStage: { type: DataTypes.ENUM(...PIPELINE_STAGES), allowNull: true },
            closingRemark: { type: DataTypes.TEXT, allowNull: true },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "enquiries", modelName: "Enquiry" },
    );
};
