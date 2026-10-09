import { EventService } from "../services/events.service";
import type { Request, Response } from "express";


export class EventsController {
    constructor(
        private readonly eventsService: EventService
    ){

    }


    list = async (req:Request, res: Response)=>{
        res.json({message:"success", items:[]})
    }

    create = async (req:Request, res: Response) => {
        res.json({message:"success"})
    }

    getById = async (req:Request, res: Response) =>{
        res.json({message:"success"})
    }
}