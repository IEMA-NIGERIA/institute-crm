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
    ORGANISATION_SIZES,
    ORGANISATION_TYPES,
    type OrganisationSize,
    type OrganisationType,
} from "../domain/organisation";
import type { UserModel } from "./user.model";

export class OrganisationModel extends Model<InferAttributes<OrganisationModel>, InferCreationAttributes<OrganisationModel>> {
    declare id: CreationOptional<string>;
    declare name: string;
    declare nameKey: string;
    declare registrationReference: string | null;
    declare registrationKey: string | null;
    declare email: string | null;
    declare phone: string | null;
    declare sector: string | null;
    declare size: OrganisationSize | null;
    declare website: string | null;
    declare addressLine1: string | null;
    declare city: string | null;
    declare stateProvince: string | null;
    declare postalCode: string | null;
    declare country: string | null;
    declare createdById: ForeignKey<UserModel["id"]> | null;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare typeRows?: NonAttribute<OrganisationTypeModel[]>;
}

export class OrganisationTypeModel extends Model<
    InferAttributes<OrganisationTypeModel>,
    InferCreationAttributes<OrganisationTypeModel>
> {
    declare organisationId: ForeignKey<OrganisationModel["id"]>;
    declare type: OrganisationType;
}

export const initOrganisationModels = (sequelize: Sequelize): void => {
    OrganisationModel.init(
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            name: { type: DataTypes.STRING(200), allowNull: false },
            nameKey: { type: DataTypes.STRING(200), allowNull: false, unique: "organisations_name_key_unique" },
            registrationReference: { type: DataTypes.STRING(50), allowNull: true },
            registrationKey: { type: DataTypes.STRING(50), allowNull: true, unique: "organisations_registration_key_unique" },
            email: { type: DataTypes.STRING(255), allowNull: true },
            phone: { type: DataTypes.STRING(20), allowNull: true },
            sector: { type: DataTypes.STRING(100), allowNull: true },
            size: { type: DataTypes.ENUM(...ORGANISATION_SIZES), allowNull: true },
            website: { type: DataTypes.STRING(255), allowNull: true },
            addressLine1: { type: DataTypes.STRING(255), allowNull: true },
            city: { type: DataTypes.STRING(100), allowNull: true },
            stateProvince: { type: DataTypes.STRING(100), allowNull: true },
            postalCode: { type: DataTypes.STRING(20), allowNull: true },
            country: { type: DataTypes.STRING(100), allowNull: true },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "organisations", modelName: "Organisation" },
    );

    OrganisationTypeModel.init(
        {
            organisationId: { type: DataTypes.UUID, primaryKey: true },
            type: { type: DataTypes.ENUM(...ORGANISATION_TYPES), primaryKey: true },
        },
        { sequelize, tableName: "organisation_types", modelName: "OrganisationType", timestamps: false },
    );
};
