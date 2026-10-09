import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from "sequelize";

export class ProfileModel extends Model<InferAttributes<ProfileModel>, InferCreationAttributes<ProfileModel>> {
    declare id: CreationOptional<string>;
    declare title: string | null;
    declare firstName: string;
    declare lastName: string;
    declare email: string;
    declare mobile: string | null;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export const initProfileModel = (sequelize: Sequelize): void => {
    ProfileModel.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            title: { type: DataTypes.STRING(20), allowNull: true },
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
            mobile: { type: DataTypes.STRING(30), allowNull: true },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        { sequelize, tableName: "profiles", modelName: "Profile" },
    );
};
