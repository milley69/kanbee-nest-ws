import type { JwtPayload } from '@auth/interfaces';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { UserService } from '@user/user.service';
import { v4 } from 'uuid';
import { File as ExpressFile } from './files.controller';

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

  async create(userJwt: JwtPayload, file: ExpressFile) {
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
        .upload(`${id}.png`, file as unknown as File, { upsert: true });
      if (error) throw new Error(error.message);

      const avatar = this.generateAvatar(id);
      user.avatar = avatar;
      await this.userService.save(user);
      return { done: avatar, error: null };
    } catch (error) {
      return { done: false, error };
    }
  }

  private generateAvatar(id: string) {
    const url = this.configService.get('SUPABASE_URL') + '/storage/v1/object/public/avatars';
    return `${url}/${id}.png`;
  }
}
/* 
  const imageMeow: string[] = ['meow1.png', 'meow2.png', 'meow3.png', 'meow4.png', 'meow5.png']

  const updateAvatar = async (image: FormData) => {
    if (!user.value) return false
    const oldAvatar = user.value.avatar.split('/')[8]
    try {
      if (!imageMeow.includes(oldAvatar)) {
        const { error: errorDel } = await $supabase.storage.from('avatars').remove([oldAvatar])
        if (errorDel) throw errorDel
      }
      const id = Math.floor(Number(new Date()) * Math.random())
      const { error } = await $supabase.storage.from('avatars').upload(`${id}.png`, image, { upsert: true })
      if (error) throw error
      await updateAvatarInDB(id)
      return true
    } catch (error) {
      console.log('error: ', error)
      return false
    }
  }

  const updateAvatarInDB = async (id: number) => {
    if (!user.value) return
    const avatar = `https://drimoiqxfujniunvknha.supabase.co/storage/v1/object/public/avatars/${id}.png`
    await $supabase.from('profiles').update({ avatar }).eq('id', user.value.id)
    user.value.avatar = avatar
  }
*/
