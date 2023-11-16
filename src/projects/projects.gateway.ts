import { JwtPayload } from '@auth/interfaces';
import { CurrentUser } from '@common/decorators';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Project } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { ProjectsService } from './projects.service';
// import { Client } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['https://localhost:3000', 'https://kanbee.vercel.app'],
    credentials: true,
  },
})
export class ProjectsGateway {
  @WebSocketServer()
  server: Server;
  constructor(private readonly projectsService: ProjectsService) {}

  @SubscribeMessage('createProject')
  create(@MessageBody('title') title: string, @CurrentUser() userJwt: JwtPayload) {
    return this.projectsService.create(title, userJwt);
  }

  @SubscribeMessage('findAllProjects')
  findAll(@MessageBody() ids: number[]) {
    return this.projectsService.findAll(ids);
  }

  @SubscribeMessage('findProject')
  findOne(@MessageBody() id: number) {
    return this.projectsService.findOne(id);
  }

  @SubscribeMessage('getMembers')
  async getMembers(@MessageBody() membersId: string[]) {
    const members = await this.projectsService.getMembers(membersId);
    return members;
  }

  @SubscribeMessage('updateKanban')
  async updateKanban(@MessageBody() project: Project, @ConnectedSocket() client: Socket) {
    const _project = await this.projectsService.updateKanban(project);
    client.broadcast.emit(` :${project.id}`, _project);
  }

  @SubscribeMessage('removeProject')
  async removeProject(@MessageBody() project: Project, @ConnectedSocket() client: Socket) {
    const projectId = await this.projectsService.removeProject(project);
    client.broadcast.emit(`removeProject:${projectId}`, projectId);
  }
}
