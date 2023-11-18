import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Project, User } from '@prisma/client';
import { UserResponse } from '@user/responses';
import { Server, Socket } from 'socket.io';
import { InviteDto } from './dto';
import { ProjectsService } from './projects.service';

@WebSocketGateway({
  cors: {
    origin: ['https://localhost:3000', 'https://kanbee.milley.uno'],
    credentials: true,
  },
})
export class ProjectsGateway {
  @WebSocketServer()
  server: Server;
  constructor(private readonly projectsService: ProjectsService) {}

  @SubscribeMessage('createProject')
  async create(@MessageBody('title') title: string, @MessageBody('user') user: User) {
    const data = await this.projectsService.create(title, user);
    return { user: new UserResponse(data.user), project: data.project };
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
    return this.projectsService.getMembers(membersId);
  }

  @SubscribeMessage('updateProject')
  async updateProject(@MessageBody() project: Project, @ConnectedSocket() client: Socket) {
    const _project = await this.projectsService.updateProject(project);
    client.broadcast.emit(`updateProject:${project.id}`, _project);
  }

  @SubscribeMessage('deleteProject')
  async deleteProject(@MessageBody() project: Project) {
    const _project = await this.projectsService.deleteProject(project);
    this.server.emit(`deleteProject:${_project.id}`, _project);
  }

  @SubscribeMessage('leaveProject')
  async leaveProject(@MessageBody() data: { project: Project; userId: string }, @ConnectedSocket() client: Socket) {
    const _data = await this.projectsService.leaveProject(data.project, data.userId);
    this.server.emit(`exileUser:${data.userId}`, { project: _data.project, user: new UserResponse(_data.user) });
    client.broadcast.emit(`updateProject:${data.project.id}`, _data.project);
  }

  @SubscribeMessage('sendInvite')
  async sendInvite(@MessageBody() invite: InviteDto, @ConnectedSocket() client: Socket) {
    const user = await this.projectsService.sendInvite(invite);
    client.broadcast.emit(`getInvite:${user.id}`, new UserResponse(user));
  }

  @SubscribeMessage('accessInvite')
  async accessInvite(@MessageBody() invite: InviteDto, @ConnectedSocket() client: Socket) {
    const data = await this.projectsService.accessInvite(invite);
    client.broadcast.emit(`updateProject:${data.project.id}`, data.project);
    return { user: new UserResponse(data.user), project: data.project };
  }

  @SubscribeMessage('ignoreInvite')
  async ignoreInvite(@MessageBody() invite: InviteDto) {
    const user = await this.projectsService.ignoreInvite(invite);
    return new UserResponse(user);
  }
  @SubscribeMessage('acceptExclusion')
  async acceptExclusion(@MessageBody() data: { title: string; userId: string }) {
    const user = await this.projectsService.acceptExclusion(data.title, data.userId);
    return new UserResponse(user);
  }

  @SubscribeMessage('exileUser')
  async exileUser(
    @MessageBody('project') project: Project,
    @MessageBody('userId') userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const data = await this.projectsService.exileUser(project, userId);
    this.server.emit(`exileUser:${userId}`, { project: data.project, user: new UserResponse(data.user) });
    client.broadcast.emit(`updateProject:${project.id}`, data.project);
  }
}
