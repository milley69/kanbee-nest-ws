import { JwtPayload } from '@auth/interfaces';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Project } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { UserService } from '@user/user.service';
import { Cache } from 'cache-manager';
import { v4 } from 'uuid';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async create(title: string, userJwt: JwtPayload) {
    const user = await this.userService.findOne(userJwt.id);

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

  async updateKanban(project: Project): Promise<Project> {
    const _project = await this.prismaService.project.update({
      where: { id: project.id },
      data: { kanban: project.kanban },
    });
    await this.cacheManager.set(_project.id.toString(), _project, 6e4);

    return _project;
  }

  async removeProject(project: Project) {
    for (const memberId of project.membersId) {
      const user = await this.userService.findOne(memberId);
      if (!user) continue;
      user.projectsId = user.projectsId.filter((p) => p !== project.id);
      await this.userService.save(user);
    }

    await this.prismaService.project.delete({ where: { id: project.id } });

    return project.id;
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
