import { ProfileService } from "../services/profile.service";
import type {Request, Response} from "express"


export class ProfileController {
    constructor(
        private readonly profileService: ProfileService
    ){}



    list = async (req: Request, res: Response):Promise<any> => {
        res.json({message:"success", items:[]})
    }  

    create = async (req: Request, res: Response):Promise<any> =>{

    }

    getById = async (req: Request, res: Response):Promise<any> => {
        
    }
}