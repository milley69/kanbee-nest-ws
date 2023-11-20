import type { JwtPayload } from '@auth/interfaces';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { UserService } from '@user/user.service';
import { v4 } from 'uuid';

@Injectable()
export class FilesService implements OnModuleInit {
  private supabase: SupabaseClient<any, 'public', any>;
  private imageMeow: string[] = ['meow1.png', 'meow2.png', 'meow3.png', 'meow4.png', 'meow5.png'];
  private providerURL: string[] = ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'];

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  onModuleInit() {
    const url = this.configService.get('SUPABASE_URL');
    const key = this.configService.get('SUPABASE_KEY');
    this.supabase = createClient(url, key);
  }

  async create(userJwt: JwtPayload, file: Express.Multer.File) {
    try {
      const user = await this.userService.findOne(userJwt.id);
      if (!user) throw new Error('User not found.');

      const oldAvatar = user.avatar.split('/');
      // https://drimoiqxfujniunvknha.supabase.co/storage/v1/object/public/avatars/meow5.png

      if (!this.imageMeow.includes(oldAvatar[8]) && !this.providerURL.includes(oldAvatar[2])) {
        await this.supabase.storage.from('avatars').remove([oldAvatar[8]]);
      }

      const id = v4();

      const { error } = await this.supabase.storage
        .from('avatars')
        .upload(`${id}.png`, file.buffer, { upsert: true, contentType: 'image/png ' });

      if (error) throw new Error(error.message);

      user.avatar = this.generateAvatar(id);
      await this.userService.save(user);

      return user;
    } catch (error) {
      console.log('error: ', error);
      return null;
    }
  }

  private generateAvatar(id: string) {
    const url = this.configService.get('SUPABASE_URL') + '/storage/v1/object/public/avatars';
    return `${url}/${id}.png`;
  }
}
