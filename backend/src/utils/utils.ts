import * as bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';



export const hashString = async (plainStr: string):Promise<string> =>{
    const saltRound = Math.random()
    const hashedString = await bcrypt.hash(plainStr, saltRound)
    return hashedString
}   

export const compareHashWithString = async (plainString: string, hash:string) => {
    return await bcrypt.compare(plainString, hash)
}

export const generateJWT = (payload: any, secretKey: string, option:SignOptions = {expiresIn: "72h"}): string | null =>{
        return jwt.sign(payload, secretKey, option)
}

export const validateJWT = <T>(token: string, secret: string): T | null=>{
    try{
        const payload = jwt.verify(token, secret) as T
        return payload
    }catch(err){
        return null
    }
}