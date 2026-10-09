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
import { APPLICATION_STATUSES, MEMBERSHIP_GRADES, type ApplicationStatus, type MembershipGrade } from "../domain/application";
import type { ProfileModel } from "./profiles.model";

// Minimal schema backing the list/metrics API. Workflow data (documents, review notes, decision
// history) will be added when those features are built.
export class ApplicationModel extends Model<InferAttributes<ApplicationModel>, InferCreationAttributes<ApplicationModel>> {
    declare id: CreationOptional<string>;
    declare reference: string;
    declare profileId: ForeignKey<ProfileModel["id"]>;
    declare grade: MembershipGrade;
    declare status: CreationOptional<ApplicationStatus>;
    declare submittedAt: CreationOptional<Date>;
    declare decidedAt: Date | null;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare applicant?: NonAttribute<ProfileModel>;
}

export const initApplicationModel = (sequelize: Sequelize): void => {
    ApplicationModel.init(
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            reference: { type: DataTypes.STRING(30), allowNull: false, unique: true },
            grade: { type: DataTypes.ENUM(...MEMBERSHIP_GRADES), allowNull: false },
            status: { type: DataTypes.ENUM(...APPLICATION_STATUSES), allowNull: false, defaultValue: "submitted" },
            submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            decidedAt: { type: DataTypes.DATE, allowNull: true },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "applications", modelName: "Application" },
    );
};
