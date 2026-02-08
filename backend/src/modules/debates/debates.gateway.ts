import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DebatesService } from './debates.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/debates',
})
export class DebatesGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly debatesService: DebatesService) {}

  @SubscribeMessage('debate:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.join(data.roomId);
    const state = this.debatesService.getDebateState(data.roomId);
    client.emit('debate:state', state);
  }

  @SubscribeMessage('debate:start')
  async handleStart(
    @MessageBody() data: { roomId: string },
  ) {
    const result = await this.debatesService.startDebate(data.roomId);
    this.server.to(data.roomId).emit('debate:turn', result);
    return result;
  }

  @SubscribeMessage('debate:next')
  async handleNext(
    @MessageBody() data: { roomId: string },
  ) {
    const result = await this.debatesService.nextTurn(data.roomId);
    this.server.to(data.roomId).emit('debate:turn', result);
    return result;
  }

  @SubscribeMessage('debate:score')
  async handleScore(
    @MessageBody() data: { roomId: string; scores: { A: number; B: number } },
  ) {
    const result = await this.debatesService.scoreDebate(data.roomId, data.scores);
    this.server.to(data.roomId).emit('debate:result', result);
    return result;
  }
}
