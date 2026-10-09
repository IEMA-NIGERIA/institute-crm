import {
    DataTypes,
    Model,
    type CreationOptional,
    type ForeignKey,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from "sequelize";
import type { RoleModel } from "./roles.model";

export class PermissionModel extends Model<InferAttributes<PermissionModel>, InferCreationAttributes<PermissionModel>> {
    declare id: CreationOptional<string>;
    declare key: string;
    declare description: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export class RolePermissionModel extends Model<
    InferAttributes<RolePermissionModel>,
    InferCreationAttributes<RolePermissionModel>
> {
    declare roleId: ForeignKey<RoleModel["id"]>;
    declare permissionId: ForeignKey<PermissionModel["id"]>;
    declare createdAt: CreationOptional<Date>;
}

export const initPermissionModels = (sequelize: Sequelize): void => {
    PermissionModel.init(
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
            description: { type: DataTypes.STRING(255), allowNull: false },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "permissions", modelName: "Permission" },
    );

    RolePermissionModel.init(
        {
            roleId: { type: DataTypes.UUID, primaryKey: true },
            permissionId: { type: DataTypes.UUID, primaryKey: true },
            createdAt: DataTypes.DATE,
        },
        { sequelize, tableName: "role_permissions", modelName: "RolePermission", updatedAt: false },
    );
};
