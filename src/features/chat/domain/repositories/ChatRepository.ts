import { Message } from "../entities/Message";
//que se puede hacer
export interface ChatRepository{
    sendMessage(userMessage:string,history:Message[]):Promise<string>
}