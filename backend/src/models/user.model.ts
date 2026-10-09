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
import type { RoleModel } from "./roles.model";

export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
    declare id: CreationOptional<string>;
    declare firstName: string;
    declare lastName: string;
    declare email: string;
    declare passwordHash: string;
    declare isActive: CreationOptional<boolean>;
    declare roleId: ForeignKey<RoleModel["id"]> | null;
    declare lastLoginAt: CreationOptional<Date | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare role?: NonAttribute<RoleModel>;
}

export const initUserModel = (sequelize: Sequelize): void => {
    UserModel.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            firstName: { type: DataTypes.STRING(100), allowNull: false },
            lastName: { type: DataTypes.STRING(100), allowNull: false },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
                set(value: string) {
                    this.setDataValue("email", value.trim().toLowerCase());
                },
            },
            passwordHash: { type: DataTypes.STRING(255), allowNull: false },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            lastLoginAt: { type: DataTypes.DATE, allowNull: true },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        {
            sequelize,
            tableName: "users",
            modelName: "User",
            defaultScope: { attributes: { exclude: ["passwordHash"] } },
            scopes: { withPassword: { attributes: { include: ["passwordHash"] } } },
        },
    );
};
