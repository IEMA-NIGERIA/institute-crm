import { Sequelize } from "sequelize";
import type { AppConfig } from "../config";
import type { Logger } from "../infrastructure/logger";
import { initUserModel, UserModel } from "./user.model";
import { initRoleModel, RoleModel } from "./roles.model";
import { initProfileModel, ProfileModel } from "./profiles.model";
import { initMemberModel, MemberModel } from "./members.model";
import { initEnquiryModel, EnquiryModel } from "./enquiry.model";
import { initApplicationModel, ApplicationModel } from "./applications.model";
import { initPermissionModels, PermissionModel, RolePermissionModel } from "./permissions.model";
import { initOrganisationModels, OrganisationModel, OrganisationTypeModel } from "./organisation.model";

export const createSequelize = (dbConfig: AppConfig["database"], logger: Logger): Sequelize => {
    // Discrete options (not a URI) so credentials are never string-interpolated or logged.
    const sequelize = new Sequelize({
        dialect: "mysql",
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        timezone: "+00:00",
        pool: { max: dbConfig.poolMax, min: 0, acquire: 30_000, idle: 10_000 },
        logging: dbConfig.logQueries ? (sql) => logger.debug({ sql }, "db query") : false,
        define: {
            underscored: false,
            timestamps: true,
        },
    });

    initModels(sequelize);
    return sequelize;
};

export const initModels = (sequelize: Sequelize): void => {
    initRoleModel(sequelize);
    initUserModel(sequelize);
    initProfileModel(sequelize);
    initMemberModel(sequelize);
    initEnquiryModel(sequelize);
    initPermissionModels(sequelize);
    initApplicationModel(sequelize);
    initOrganisationModels(sequelize);

    RoleModel.hasMany(UserModel, { foreignKey: "roleId", as: "users" });
    UserModel.belongsTo(RoleModel, { foreignKey: "roleId", as: "role" });

    RoleModel.belongsToMany(PermissionModel, {
        through: RolePermissionModel,
        foreignKey: "roleId",
        otherKey: "permissionId",
        as: "permissions",
    });
    PermissionModel.belongsToMany(RoleModel, {
        through: RolePermissionModel,
        foreignKey: "permissionId",
        otherKey: "roleId",
        as: "roles",
    });

    ProfileModel.hasMany(ApplicationModel, { foreignKey: "profileId", as: "applications" });
    OrganisationModel.hasMany(OrganisationTypeModel, { foreignKey: "organisationId", as: "typeRows" });
    OrganisationTypeModel.belongsTo(OrganisationModel, { foreignKey: "organisationId" });
    UserModel.hasMany(OrganisationModel, { foreignKey: "createdById", as: "organisations" });
    OrganisationModel.belongsTo(UserModel, { foreignKey: "createdById", as: "createdBy" });

    ApplicationModel.belongsTo(ProfileModel, { foreignKey: "profileId", as: "applicant" });

    ProfileModel.hasOne(MemberModel, { foreignKey: "profileId", as: "membership" });
    MemberModel.belongsTo(ProfileModel, { foreignKey: "profileId", as: "profile" });

    UserModel.hasMany(EnquiryModel, { foreignKey: "createdById", as: "enquiries" });
    EnquiryModel.belongsTo(UserModel, { foreignKey: "createdById", as: "createdBy" });
    EnquiryModel.belongsTo(UserModel, { foreignKey: "assignedToId", as: "assignedTo" });
};

export {
    UserModel,
    RoleModel,
    ProfileModel,
    MemberModel,
    EnquiryModel,
    PermissionModel,
    RolePermissionModel,
    ApplicationModel,
    OrganisationModel,
    OrganisationTypeModel,
};
