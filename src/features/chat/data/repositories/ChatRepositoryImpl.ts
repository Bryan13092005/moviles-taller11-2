import { Message } from '../../domain/entities/Message';
import { ChatRepository } from '../../domain/repositories/ChatRepository';
//import { GeminiDataSource } from '../datasources/GeminiDataSource';
import { GroqDataSource } from '../datasources/GroqDataSource';

// La palabra 'implements' garantiza en tiempo de compilación
// que esta clase cumple con el contrato del Domain
export class ChatRepositoryImpl implements ChatRepository {
private dataSource: GroqDataSource;

constructor() {
this.dataSource = new GroqDataSource();
}
async sendMessage(userMessage: string, history: Message[]): Promise<string> {
return this.dataSource.generateResponse(userMessage, history);
}
}