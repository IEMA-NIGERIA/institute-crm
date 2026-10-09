import type { Sequelize } from "sequelize";
import type { AppConfig } from "./config";
import { ApplicationController } from "./controllers/application.controller";
import { AuthController } from "./controllers/auth.controller";
import { EnquiryController } from "./controllers/enquiry.controller";
import { RoleController } from "./controllers/role.controller";
import { UserController } from "./controllers/user.controller";
import {EventsController} from "./controllers/events.controller";
import type { ApplicationRepository } from "./domain/application";
import type { EnquiryRepository } from "./domain/enquiry";
import type { OrganisationRepository } from "./domain/organisation";
import type { RoleRepository, UserRepository } from "./domain/user";
import type { Logger } from "./infrastructure/logger";
import { BcryptPasswordHasher, type PasswordHasher } from "./infrastructure/password-hasher";
import { JwtTokenService, type TokenService } from "./infrastructure/token-service";
import { SequelizeApplicationRepository } from "./repository/application.repository";
import { SequelizeEnquiryRepository } from "./repository/enquiry.repository";
import { SequelizeOrganisationRepository } from "./repository/organisation.repository";
import { SequelizeRoleRepository } from "./repository/role.repository";
import { SequelizeUserRepository } from "./repository/user.repository";
import { ApplicationService } from "./services/application.service";
import { AuthService } from "./services/auth.service";
import { EnquiryService } from "./services/enquiry.service";
import { RoleService } from "./services/role.service";
import { UserService } from "./services/user.service";
import { OrganisationController } from "./controllers/organisation.controllers";
import { OrganisationService } from "./services/organisation.service";
import { ProfileController } from "./controllers/profile.controller";
import { ProfileService } from "./services/profile.service";
import { EventService } from "./services/events.service";

/**
 * Composition root: the only place that knows concrete implementations.
 * Everything else depends on interfaces, so tests can swap any piece.
 */
export interface Infrastructure {
    userRepository: UserRepository;
    roleRepository: RoleRepository;
    enquiryRepository: EnquiryRepository;
    applicationRepository: ApplicationRepository;
    organisationRepository: OrganisationRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
}

export interface Services {
    auth: AuthService;
    user: UserService;
    role: RoleService;
    enquiry: EnquiryService;
    application: ApplicationService;
    organisation: OrganisationService;
    profile: ProfileService
    events: EventService
}

export interface Controllers {
    auth: AuthController;
    user: UserController;
    role: RoleController;
    enquiry: EnquiryController;
    application: ApplicationController;
    organisation: OrganisationController
    profiles: ProfileController,
    events: EventsController
}

export interface Container {
    services: Services;
    controllers: Controllers;
}

export const createInfrastructure = (config: AppConfig): Infrastructure => ({
    userRepository: new SequelizeUserRepository(),
    roleRepository: new SequelizeRoleRepository(),
    enquiryRepository: new SequelizeEnquiryRepository(),
    applicationRepository: new SequelizeApplicationRepository(),
    organisationRepository: new SequelizeOrganisationRepository(),
    passwordHasher: new BcryptPasswordHasher(config.auth.bcryptCost),
    tokenService: new JwtTokenService(
        config.auth.jwtSecret,
        config.auth.jwtIssuer,
        config.auth.jwtExpiresInSeconds,
    ),
});

export const createContainer = (config: AppConfig, infra: Infrastructure, logger: Logger): Container => {
    const services: Services = {
        auth: new AuthService(infra.userRepository, infra.passwordHasher, infra.tokenService),
        user: new UserService(infra.userRepository, infra.roleRepository, infra.passwordHasher),
        role: new RoleService(infra.roleRepository, logger),
        enquiry: new EnquiryService(infra.enquiryRepository, infra.userRepository),
        application: new ApplicationService(infra.applicationRepository),
        organisation: new OrganisationService(infra.organisationRepository),
        profile: new ProfileService(),
        events: new EventService()
    };

    const controllers: Controllers = {
        auth: new AuthController(services.auth, config.cookie),
        user: new UserController(services.user),
        role: new RoleController(services.role),
        enquiry: new EnquiryController(services.enquiry),
        application: new ApplicationController(services.application),
        organisation: new OrganisationController(services.organisation),
        profiles: new ProfileController(services.profile),
        events: new EventsController(services.events),
    };

    return { services, controllers };
};

/** Readiness probe for the database; returns false instead of throwing. */
export const createDatabaseHealthCheck = (sequelize: Sequelize) => async (): Promise<boolean> => {
    try {
        await sequelize.authenticate();
        return true;
    } catch {
        return false;
    }
};
