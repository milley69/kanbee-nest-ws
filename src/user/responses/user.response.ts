import { Prisma, Provider, Role, User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserResponse implements User {
  id: string;
  email: string;
  username: string;
  avatar: string;
  roles: Role[];
  createdAt: Date;
  cycleTimer: number;
  createdProjects: number;
  projectsId: number[];
  invites: Prisma.JsonValue[];
  exclusions: string[];

  @Exclude()
  password: string;

  // @Exclude()
  provider: Provider;

  constructor(user: User) {
    Object.assign(this, user);
  }
}
