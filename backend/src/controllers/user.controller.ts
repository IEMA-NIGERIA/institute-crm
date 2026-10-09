import type { Request, Response } from "express";
import type { User } from "../domain/user";
import { createUserSchema, idParamSchema, listUsersSchema } from "../dto/user";
import { getPrincipal } from "../middleware/authorize_user";
import { parseInput } from "../middleware/error-handler";
import type { UserService } from "../services/user.service";

/** Explicit allow-list of fields returned to clients. */
export const toUserResponse = (user: User) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive: user.isActive,
    role: user.role ? { id: user.role.id, title: user.role.title, permissions: user.role.permissions } : null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
});

export class UserController {
    constructor(private readonly userService: UserService) {}

    me = async (req: Request, res: Response): Promise<void> => {
        const user = await this.userService.getById(getPrincipal(req).userId);
        res.json({ user: toUserResponse(user) });
    };

    list = async (req: Request, res: Response): Promise<void> => {
        const query = parseInput(listUsersSchema, req.query);
        const { items, total } = await this.userService.list(query);
        res.json({ items: items.map(toUserResponse), total, page: query.page, pageSize: query.pageSize });
    };

    metrics = async (_req: Request, res: Response): Promise<void> => {
        res.json(await this.userService.metrics());
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        const { id } = parseInput(idParamSchema, req.params);
        const user = await this.userService.getById(id);
        res.json({ user: toUserResponse(user) });
    };

    create = async (req: Request, res: Response): Promise<void> => {
        const input = parseInput(createUserSchema, req.body);
        const user = await this.userService.create(input);
        res.status(201).location(`${req.baseUrl}/${user.id}`).json({ user: toUserResponse(user) });
    };
}
