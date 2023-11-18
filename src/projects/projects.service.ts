import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Project, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { UserService } from '@user/user.service';
import { Cache } from 'cache-manager';
import { v4 } from 'uuid';
import { InviteDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async create(title: string, user: User) {
    const project = await this.prismaService.project.create({
      data: {
        title,
        membersId: [user.id],
        kanban: [
          { id: v4(), title: 'Backlog', tasks: [] },
          { id: v4(), title: 'In progress', tasks: [] },
          { id: v4(), title: 'Done', tasks: [] },
        ],
        adminId: user.id,
      },
    });

    const { projectsId, email, username } = user;
    let { createdProjects } = user;
    projectsId.push(project.id);
    createdProjects = createdProjects + 1;

    const newUser = await this.userService.save({ projectsId, email, username, createdProjects });
    return { user: newUser, project };
  }

  async findAll(ids: number[]) {
    const projects: Project[] = [];

    for (const id of ids) {
      const project = await this.findProjectById(id);
      if (project) projects.push(project);
    }
    return projects;
  }

  async findOne(id: number) {
    const project = await this.findProjectById(id);
    if (!project) throw new BadRequestException();
    return project;
  }

  async getMembers(membersId: string[]) {
    const members: Record<'username' | 'avatar', string>[] = [];
    for (const id of membersId) {
      const user = await this.userService.findOne(id);
      if (user) members.push({ username: user.username, avatar: user.avatar });
    }

    return members;
  }

  async updateProject(project: Project): Promise<Project> {
    const _project = await this.prismaService.project.update({
      where: { id: project.id },
      data: { kanban: project.kanban },
    });
    await this.cacheManager.set(_project.id.toString(), _project, 6e4);

    return _project;
  }

  async deleteProject(project: Project) {
    for (const memberId of project.membersId) {
      const user = await this.userService.findOne(memberId);
      if (!user) continue;
      user.projectsId = user.projectsId.filter((p) => p !== project.id);
      await this.userService.save(user);
    }

    await this.prismaService.project.delete({ where: { id: project.id } });

    return project;
  }

  async sendInvite(invite: InviteDto) {
    const user = await this.userService.findOne(invite.email);

    const _invite = { id: invite.id, title: invite.title };
    user.invites.push({ ..._invite });

    await this.userService.save(user);

    return user;
  }

  async accessInvite(invite: InviteDto) {
    const user = await this.userService.findOne(invite.email);

    const project = await this.findProjectById(invite.id);
    project.membersId.push(user.id);
    await this.prismaService.project.update({ where: { id: invite.id }, data: { membersId: project.membersId } });

    user.invites = user.invites.filter((i: { id: number }) => i.id !== invite.id);
    user.projectsId.push(invite.id);
    await this.userService.save(user);

    return { project, user };
  }

  async ignoreInvite(invite: InviteDto) {
    const user = await this.userService.findOne(invite.email);

    user.invites = user.invites.filter((i: { id: number }) => i.id !== invite.id);
    await this.userService.save(user);

    return user;
  }

  async acceptExclusion(title: string, userId: string) {
    const user = await this.userService.findOne(userId);

    user.exclusions = user.exclusions.filter((ex) => ex !== title);
    await this.userService.save(user);

    return user;
  }

  async exileUser(project: Project, userId: string) {
    const membersId = project.membersId.filter((m) => m !== userId);
    const _project = await this.prismaService.project.update({
      where: { id: project.id },
      data: { membersId },
    });

    const user = await this.userService.findOne(userId);
    user.projectsId = user.projectsId.filter((p) => p !== project.id);
    user.exclusions.push(project.title);
    this.userService.save(user);

    return { project: _project, user };
  }

  async leaveProject(project: Project, userId: string) {
    const membersId = project.membersId.filter((m) => m !== userId);
    const _project = await this.prismaService.project.update({
      where: { id: project.id },
      data: { membersId },
    });

    const user = await this.userService.findOne(userId);
    user.projectsId = user.projectsId.filter((p) => p !== project.id);
    this.userService.save(user);

    return { project: _project, user };
  }

  private async findProjectById(id: number): Promise<Project | null> {
    // const project = await this.cacheManager.get<Project>(id.toString());
    // if (!project) {
    const project = await this.prismaService.project.findUnique({ where: { id } });
    // await this.cacheManager.set(id.toString(), project, 6e4);
    return project;
    //   }
    //   return project;
  }
}
