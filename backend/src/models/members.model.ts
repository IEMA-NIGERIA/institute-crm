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
import type { ProfileModel } from "./profiles.model";

export const DEFAULT_GRADES = [
    "Distinguished Fellow",
    "Fellow (Honorary)", 
    "Professional",
    "Associate",
    "Student",
    "Retiree",
    "Corporate and Institutional",
]


export class MemberModel extends Model<InferAttributes<MemberModel>, InferCreationAttributes<MemberModel>> {
    declare id: CreationOptional<string>;
    declare profileId: ForeignKey<ProfileModel["id"]>;
    declare grade: string;
    declare membershipNumber: string;
    declare status: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare profile?: NonAttribute<ProfileModel>;
}

export class Grades extends Model<InferAttributes<Grades>, InferCreationAttributes<Grades>> {
    declare id: CreationOptional<string>;
    declare grade: string;
    declare description: string;
    declare isActive: boolean;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}



export const initMemberModel = (sequelize: Sequelize): void => {
    MemberModel.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            grade: { type: DataTypes.STRING(50), allowNull: false },
            membershipNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
            status: { type: DataTypes.STRING(30), allowNull: false },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "members", modelName: "Member" },
    );

    Grades.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            grade: { type: DataTypes.STRING(100), allowNull: false, unique: true },
            description: { type: DataTypes.STRING(255), allowNull: true },
            isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "grades", modelName: "Grades" },
    );
};
