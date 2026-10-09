import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type NonAttribute,
    type Sequelize,
} from "sequelize";
import type { PermissionModel } from "./permissions.model";

export const DEFAULT_ROLES = [
    "membership officer",
    "certification & training coordinator",
    "partnership officer",
    "registrar/membership manager",
    "membership committee",
    "management / governing council",
    "finance",
    "system administrator",
] as const;

export { SYSTEM_ADMINISTRATOR_ROLE } from "../domain/permissions";

export class RoleModel extends Model<InferAttributes<RoleModel>, InferCreationAttributes<RoleModel>> {
    declare id: CreationOptional<string>;
    declare title: string;
    declare description: string | null;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare permissions?: NonAttribute<PermissionModel[]>;
}

export const initRoleModel = (sequelize: Sequelize): void => {
    RoleModel.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            title: { type: DataTypes.STRING(100), allowNull: false, unique: true },
            description: { type: DataTypes.STRING(255), allowNull: true },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "roles", modelName: "Role" },
    );
};
